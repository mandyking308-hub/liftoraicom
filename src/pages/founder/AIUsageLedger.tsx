import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Activity, CalendarIcon, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";

type LedgerRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  business_id: string | null;
  agent_id: string | null;
  campaign_id: string | null;
  task_id: string | null;
  workflow_id: string | null;
  user_id: string | null;
  action_type: string | null;
  task_category: string | null;
  model_used: string | null;
  model_provider: string | null;
  model_tier: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  currency: string | null;
  prompt_purpose: string | null;
  input_summary: string | null;
  output_summary: string | null;
  status: string | null;
  human_approved: boolean | null;
  revenue_linked_amount: number | null;
  pipeline_linked_amount: number | null;
  time_saved_minutes: number | null;
  human_equivalent_cost: number | null;
  roi_score: number | null;
  confidence_score: number | null;
  error_message: string | null;
  audit_metadata: Record<string, unknown> | null;
};

const TIERS = ["no_ai", "cheap", "standard", "premium", "human_required"];
const STATUSES = ["pending", "completed", "failed", "skipped", "blocked", "human_review_required"];

const statusVariant: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
  pending: "bg-muted text-muted-foreground border-border",
  skipped: "bg-muted text-muted-foreground border-border",
  human_review_required: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const tierVariant: Record<string, string> = {
  premium: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  standard: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  cheap: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  no_ai: "bg-muted text-muted-foreground border-border",
  human_required: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export default function AIUsageLedger() {
  const [filters, setFilters] = useState({
    business_id: "",
    agent_id: "",
    campaign_id: "",
    model_tier: "all",
    task_category: "all",
    status: "all",
    human_approval: "all", // all | approved | not_approved
    min_cost: "",
    high_cost_only: false,
  });
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [selected, setSelected] = useState<LedgerRow | null>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["ledger_businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["ledger_categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_model_routing_rules")
        .select("task_category")
        .order("task_category");
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.task_category && set.add(r.task_category));
      return Array.from(set);
    },
  });

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: ["ai_usage_ledger", filters, from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      let q = supabase
        .from("ai_usage_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.business_id) q = q.eq("business_id", filters.business_id);
      if (filters.agent_id) q = q.eq("agent_id", filters.agent_id);
      if (filters.campaign_id) q = q.eq("campaign_id", filters.campaign_id);
      if (filters.model_tier !== "all") q = q.eq("model_tier", filters.model_tier);
      if (filters.task_category !== "all") q = q.eq("task_category", filters.task_category);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.human_approval === "approved") q = q.eq("human_approved", true);
      if (filters.human_approval === "not_approved") q = q.eq("human_approved", false);
      const minCost = Number(filters.min_cost);
      if (filters.min_cost && Number.isFinite(minCost)) q = q.gte("estimated_cost", minCost);
      if (filters.high_cost_only) q = q.gte("estimated_cost", 1);
      if (from) q = q.gte("created_at", from.toISOString());
      if (to) q = q.lte("created_at", new Date(to.getTime() + 86_400_000).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
    },
  });

  const businessName = (id: string | null) =>
    id ? (businesses as any[]).find((b) => b.id === id)?.name ?? id.slice(0, 8) : "—";

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0);
    const failed = rows.filter((r) => r.status === "failed").length;
    const review = rows.filter((r) => r.status === "human_review_required").length;
    return { count: rows.length, total, failed, review };
  }, [rows]);

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> AI Usage Ledger
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every AI action — model, cost, value, approval. Summaries only; full prompt/output text is never stored by default.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} /> Refresh
          </Button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Rows" value={totals.count.toLocaleString()} />
          <Stat label="Total cost (window)" value={formatGBP(totals.total)} />
          <Stat label="Failed" value={totals.failed.toString()} tone={totals.failed > 0 ? "danger" : undefined} />
          <Stat label="Human review required" value={totals.review.toString()} tone={totals.review > 0 ? "warn" : undefined} />
        </div>

        {/* Filters */}
        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Business</Label>
                <Select value={filters.business_id || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, business_id: v === "all" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(businesses as any[]).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Agent ID</Label>
                <Input value={filters.agent_id} onChange={(e) => setFilters((f) => ({ ...f, agent_id: e.target.value.trim() }))} placeholder="uuid (optional)" />
              </div>
              <div>
                <Label className="text-xs">Campaign ID</Label>
                <Input value={filters.campaign_id} onChange={(e) => setFilters((f) => ({ ...f, campaign_id: e.target.value.trim() }))} placeholder="uuid (optional)" />
              </div>
              <div>
                <Label className="text-xs">Model tier</Label>
                <Select value={filters.model_tier} onValueChange={(v) => setFilters((f) => ({ ...f, model_tier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Task category</Label>
                <Select value={filters.task_category} onValueChange={(v) => setFilters((f) => ({ ...f, task_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(categories as string[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Human approval</Label>
                <Select value={filters.human_approval} onValueChange={(v) => setFilters((f) => ({ ...f, human_approval: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="not_approved">Not approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {from ? format(from, "PPP") : "Any"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {to ? format(to, "PPP") : "Any"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Min cost (£)</Label>
                <Input type="number" min="0" step="0.01" value={filters.min_cost} onChange={(e) => setFilters((f) => ({ ...f, min_cost: e.target.value }))} />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant={filters.high_cost_only ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters((f) => ({ ...f, high_cost_only: !f.high_cost_only }))}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" /> High-cost only (≥ £1)
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  setFilters({ business_id: "", agent_id: "", campaign_id: "", model_tier: "all", task_category: "all", status: "all", human_approval: "all", min_cost: "", high_cost_only: false });
                  setFrom(undefined); setTo(undefined);
                }}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger */}
        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Ledger (latest 500)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead className="text-right">Time saved</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center text-sm text-muted-foreground py-8">
                      No ledger entries yet. AI actions logged via <code>logAIUsage()</code> will appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(r)}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell className="text-xs">{businessName(r.business_id)}</TableCell>
                      <TableCell className="text-xs">{r.agent_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.campaign_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.task_category ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.action_type ?? "—"}</TableCell>
                      <TableCell>
                        {r.model_tier ? <Badge variant="outline" className={tierVariant[r.model_tier]}>{r.model_tier}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.model_used ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs">{formatGBP(r.estimated_cost ?? 0)}</TableCell>
                      <TableCell>
                        {r.status ? <Badge variant="outline" className={statusVariant[r.status]}>{r.status}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {r.human_approved ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatGBP(r.revenue_linked_amount ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatGBP(r.pipeline_linked_amount ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs">{(r.time_saved_minutes ?? 0)} min</TableCell>
                      <TableCell className="text-right text-xs">{r.roi_score != null ? Number(r.roi_score).toFixed(2) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ledger entry</SheetTitle>
            <SheetDescription>{selected?.id}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4 text-sm">
              <Section title="Routing">
                <Row k="Business" v={businessName(selected.business_id)} />
                <Row k="Agent" v={selected.agent_id ?? "—"} />
                <Row k="Campaign" v={selected.campaign_id ?? "—"} />
                <Row k="Task" v={selected.task_id ?? "—"} />
                <Row k="Workflow" v={selected.workflow_id ?? "—"} />
                <Row k="User" v={selected.user_id ?? "—"} />
                <Row k="Task category" v={selected.task_category ?? "—"} />
                <Row k="Action type" v={selected.action_type ?? "—"} />
              </Section>
              <Section title="Model">
                <Row k="Provider" v={selected.model_provider ?? "—"} />
                <Row k="Model" v={selected.model_used ?? "—"} />
                <Row k="Tier" v={selected.model_tier ?? "—"} />
                <Row k="Prompt tokens" v={String(selected.prompt_tokens ?? 0)} />
                <Row k="Completion tokens" v={String(selected.completion_tokens ?? 0)} />
                <Row k="Total tokens" v={String(selected.total_tokens ?? 0)} />
              </Section>
              <Section title="Cost & value">
                <Row k="Estimated cost" v={formatGBP(selected.estimated_cost ?? 0)} />
                <Row k="Human equivalent cost" v={formatGBP(selected.human_equivalent_cost ?? 0)} />
                <Row k="Time saved" v={`${selected.time_saved_minutes ?? 0} min`} />
                <Row k="Revenue linked" v={formatGBP(selected.revenue_linked_amount ?? 0)} />
                <Row k="Pipeline linked" v={formatGBP(selected.pipeline_linked_amount ?? 0)} />
                <Row k="ROI score" v={selected.roi_score != null ? String(selected.roi_score) : "—"} />
                <Row k="Confidence" v={selected.confidence_score != null ? String(selected.confidence_score) : "—"} />
              </Section>
              <Section title="Approval & status">
                <Row k="Status" v={selected.status ?? "—"} />
                <Row k="Human approved" v={selected.human_approved ? "yes" : "no"} />
                <Row k="Completed at" v={selected.completed_at ?? "—"} />
              </Section>
              <Section title="Summaries (no full content)">
                <Row k="Purpose" v={selected.prompt_purpose ?? "—"} />
                <div className="text-xs">
                  <div className="text-muted-foreground">Input summary</div>
                  <div className="p-2 rounded border border-border bg-muted/30 whitespace-pre-wrap">{selected.input_summary ?? "—"}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Output summary</div>
                  <div className="p-2 rounded border border-border bg-muted/30 whitespace-pre-wrap">{selected.output_summary ?? "—"}</div>
                </div>
              </Section>
              {selected.error_message && (
                <Section title="Error">
                  <div className="text-xs text-destructive p-2 rounded border border-destructive/30 bg-destructive/5 whitespace-pre-wrap">
                    {selected.error_message}
                  </div>
                </Section>
              )}
              <Section title="Audit metadata">
                <pre className="text-[10px] p-2 rounded border border-border bg-muted/30 overflow-x-auto">{JSON.stringify(selected.audit_metadata ?? {}, null, 2)}</pre>
              </Section>
              <p className="text-[10px] italic text-muted-foreground">
                Confidential prompt and output text are never stored by default — only summaries, purpose and metadata.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </FounderLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warn" }) {
  return (
    <Card className={cn(
      "tech-card",
      tone === "danger" && "border-destructive/40 bg-destructive/5",
      tone === "warn" && "border-amber-500/40 bg-amber-500/5",
    )}>
      <CardContent className="py-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <div className="text-muted-foreground">{k}</div>
      <div className="font-medium text-right break-all">{v}</div>
    </div>
  );
}