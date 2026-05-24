import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Route, Plus, Pencil, FlaskConical, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { routeAIModel, type RouteAIModelDecision, type RiskLevel } from "@/services/aiModelRouter";

type Rule = {
  id: string;
  business_id: string | null;
  task_category: string;
  action_type: string | null;
  default_model_tier: string | null;
  fallback_model_tier: string | null;
  max_cost_per_action: number | null;
  requires_human_approval: boolean | null;
  risk_level: string | null;
  rule_priority: number | null;
  active: boolean | null;
  updated_at: string;
};

const TIERS = ["no_ai", "cheap", "standard", "premium", "human_required"] as const;
const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

const emptyDraft: Partial<Rule> = {
  task_category: "",
  action_type: null,
  business_id: null,
  default_model_tier: "standard",
  fallback_model_tier: "cheap",
  max_cost_per_action: null,
  requires_human_approval: false,
  risk_level: "medium",
  rule_priority: 100,
  active: true,
};

function tierBadge(tier: string | null) {
  if (!tier) return <Badge variant="outline">—</Badge>;
  const variant: Record<string, string> = {
    no_ai: "bg-muted text-muted-foreground",
    cheap: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    standard: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    premium: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    human_required: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${variant[tier] ?? ""}`}>{tier}</span>;
}

function riskBadge(risk: string | null) {
  if (!risk) return <Badge variant="outline">—</Badge>;
  const map: Record<string, string> = {
    low: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    medium: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    high: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    critical: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[risk] ?? ""}`}>{risk}</span>;
}

export default function AIModelRouting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Rule>>(emptyDraft);
  const [filterCategory, setFilterCategory] = useState("");

  const rulesQuery = useQuery({
    queryKey: ["ai-routing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_model_routing_rules")
        .select("*")
        .order("rule_priority", { ascending: false })
        .order("task_category");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const businessesQuery = useQuery({
    queryKey: ["routing-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: Partial<Rule>) => {
      const payload: any = {
        ...row,
        business_id: row.business_id || null,
        action_type: row.action_type || null,
      };
      if (row.id) {
        const { error } = await supabase.from("ai_model_routing_rules").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("ai_model_routing_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Rule saved" });
      setDialogOpen(false);
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ["ai-routing-rules"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase
        .from("ai_model_routing_rules")
        .update({ active: !r.active })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-routing-rules"] }),
  });

  const rules = useMemo(
    () =>
      (rulesQuery.data ?? []).filter((r) =>
        filterCategory ? r.task_category.toLowerCase().includes(filterCategory.toLowerCase()) : true,
      ),
    [rulesQuery.data, filterCategory],
  );

  function openEdit(r: Rule) {
    setDraft(r);
    setDialogOpen(true);
  }

  function openNew() {
    setDraft(emptyDraft);
    setDialogOpen(true);
  }

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Model Router" description="Routing rules selecting the right model tier per task category." /><div className="p-6 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Route className="h-6 w-6 text-primary" />
              AI Model Routing Rules
            </h1>
            <p className="text-sm text-muted-foreground">
              Decide whether each task uses no AI, cheap, standard, premium, or human handling.
              Business-specific rules override global defaults; highest priority wins.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> New rule
          </Button>
        </header>

        <TestPanel businesses={businessesQuery.data ?? []} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Active routing rules</CardTitle>
              <CardDescription>
                {rulesQuery.data?.length ?? 0} total rules
              </CardDescription>
            </div>
            <Input
              placeholder="Filter by category…"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Fallback</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Human?</TableHead>
                    <TableHead>Max £/action</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.task_category}</TableCell>
                      <TableCell className="text-muted-foreground">{r.action_type ?? "—"}</TableCell>
                      <TableCell>{r.business_id ? "Business" : "Global"}</TableCell>
                      <TableCell>{tierBadge(r.default_model_tier)}</TableCell>
                      <TableCell>{tierBadge(r.fallback_model_tier)}</TableCell>
                      <TableCell>{riskBadge(r.risk_level)}</TableCell>
                      <TableCell>{r.requires_human_approval ? "Yes" : "No"}</TableCell>
                      <TableCell>{r.max_cost_per_action ?? "—"}</TableCell>
                      <TableCell>{r.rule_priority ?? 0}</TableCell>
                      <TableCell>
                        <Switch checked={!!r.active} onCheckedChange={() => toggleActive.mutate(r)} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                        No rules. Click “New rule” to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit rule" : "New routing rule"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Task category</Label>
                <Input
                  value={draft.task_category ?? ""}
                  onChange={(e) => setDraft({ ...draft, task_category: e.target.value })}
                  placeholder="e.g. email_classification"
                />
              </div>
              <div>
                <Label>Action type (optional)</Label>
                <Input
                  value={draft.action_type ?? ""}
                  onChange={(e) => setDraft({ ...draft, action_type: e.target.value })}
                />
              </div>
              <div>
                <Label>Business (blank = global)</Label>
                <Select
                  value={draft.business_id ?? "__global__"}
                  onValueChange={(v) =>
                    setDraft({ ...draft, business_id: v === "__global__" ? null : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">Global default</SelectItem>
                    {(businessesQuery.data ?? []).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default tier</Label>
                <Select
                  value={draft.default_model_tier ?? "standard"}
                  onValueChange={(v) => setDraft({ ...draft, default_model_tier: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fallback tier</Label>
                <Select
                  value={draft.fallback_model_tier ?? "cheap"}
                  onValueChange={(v) => setDraft({ ...draft, fallback_model_tier: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk level</Label>
                <Select
                  value={draft.risk_level ?? "medium"}
                  onValueChange={(v) => setDraft({ ...draft, risk_level: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RISKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max £ per action</Label>
                <Input
                  type="number" step="0.01"
                  value={draft.max_cost_per_action ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, max_cost_per_action: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Priority (higher wins)</Label>
                <Input
                  type="number"
                  value={draft.rule_priority ?? 100}
                  onChange={(e) => setDraft({ ...draft, rule_priority: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={!!draft.requires_human_approval}
                  onCheckedChange={(v) => setDraft({ ...draft, requires_human_approval: v })}
                />
                <Label>Require human approval</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={draft.active !== false}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(draft)}
                disabled={!draft.task_category || saveMutation.isPending}
              >
                Save rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}

function TestPanel({ businesses }: { businesses: any[] }) {
  const [businessId, setBusinessId] = useState<string>("__global__");
  const [category, setCategory] = useState("email_classification");
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [external, setExternal] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [estValue, setEstValue] = useState<string>("");
  const [result, setResult] = useState<RouteAIModelDecision | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    try {
      const decision = await routeAIModel({
        business_id: businessId === "__global__" ? null : businessId,
        task_category: category,
        risk_level: risk,
        requires_external_action: external,
        contains_legal_financial_or_compliance_content: sensitive,
        estimated_value: estValue ? Number(estValue) : null,
      });
      setResult(decision);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" /> Test model route
        </CardTitle>
        <CardDescription>
          Simulate a routing decision. No AI call is made — this is dry-run only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Task category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Risk</Label>
            <Select value={risk} onValueChange={(v) => setRisk(v as RiskLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RISKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Est. value (£)</Label>
            <Input
              type="number" value={estValue}
              onChange={(e) => setEstValue(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="flex flex-col gap-2 pt-6">
            <div className="flex items-center gap-2">
              <Switch checked={external} onCheckedChange={setExternal} />
              <Label className="text-xs">External action</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sensitive} onCheckedChange={setSensitive} />
              <Label className="text-xs">Legal / financial</Label>
            </div>
          </div>
        </div>
        <Button onClick={runTest} disabled={loading || !category}>
          {loading ? "Routing…" : "Run routing test"}
        </Button>

        {result && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Selected tier:</span>
              {tierBadge(result.selected_model_tier)}
              <span className="text-sm text-muted-foreground">Fallback:</span>
              {tierBadge(result.fallback_model_tier)}
              <span className="text-sm text-muted-foreground">Risk:</span>
              {riskBadge(result.risk_level)}
              {result.requires_human_approval && (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Human approval required
                </Badge>
              )}
              {result.blocked && (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                  Blocked
                </Badge>
              )}
            </div>
            <div className="text-sm">
              <strong>Reason:</strong> {result.routing_reason}
            </div>
            {result.warning_message && (
              <div className="text-sm text-amber-400 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5" />
                {result.warning_message}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Scope: {result.matched_rule_scope} · Rule id: {result.matched_rule_id ?? "—"} ·
              Max £/action: {result.max_cost_per_action ?? "—"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}