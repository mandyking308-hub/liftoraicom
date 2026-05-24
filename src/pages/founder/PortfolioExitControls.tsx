import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldCheck, ArrowLeft, GitBranch, BookOpen, Clock, MessageSquareWarning,
  Wallet, Tags, DatabaseBackup, History, Siren, Users, FileLock2, Bot, Coins, Ban, AlertTriangle
} from "lucide-react";

type Row = Record<string, any>;

const sb: any = supabase;

function useTable(table: string, orderBy = "created_at", asc = false, filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: [table, filters],
    queryFn: async () => {
      let q = sb.from(table).select("*").order(orderBy, { ascending: asc }).limit(200);
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function freshnessLabel(iso?: string | null) {
  if (!iso) return { label: "unknown", tone: "secondary" as const, days: null as number | null };
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 30) return { label: "fresh", tone: "default" as const, days };
  if (days <= 90) return { label: "current", tone: "secondary" as const, days };
  if (days <= 180) return { label: "stale", tone: "outline" as const, days };
  return { label: "archived", tone: "destructive" as const, days };
}

const STAGES = [
  "idea","watch","validate","build","launch","operate","scale","warm_buyers","sale_prep","sale_process","sold","parked","killed",
];

const SEVERITIES = ["low","medium","high","critical"];

export default function PortfolioExitControls() {
  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1400px]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" /> Carrier-Grade Controls
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lifecycle gates, KPI dictionary, confidence/freshness, challenge mode, cost & budget, classification,
              backups, AI versioning, alerts, capacity, mock buyer diligence, agent contracts, capital allocation, do-not-build.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Command Centre</Link>
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Founder approval is the final gate</AlertTitle>
          <AlertDescription className="text-xs">
            Nothing here triggers external outreach, payments, legal, tax or buyer/investor contact. AI may draft, score and
            challenge — humans approve. No paid APIs are activated. Adopt market signals; do not copy protected assets.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="lifecycle" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="lifecycle"><GitBranch className="h-3 w-3 mr-1" />Lifecycle</TabsTrigger>
            <TabsTrigger value="kpi"><BookOpen className="h-3 w-3 mr-1" />KPI Dictionary</TabsTrigger>
            <TabsTrigger value="freshness"><Clock className="h-3 w-3 mr-1" />Freshness</TabsTrigger>
            <TabsTrigger value="challenge"><MessageSquareWarning className="h-3 w-3 mr-1" />Challenge</TabsTrigger>
            <TabsTrigger value="cost"><Wallet className="h-3 w-3 mr-1" />Cost & Budget</TabsTrigger>
            <TabsTrigger value="classification"><Tags className="h-3 w-3 mr-1" />Classification</TabsTrigger>
            <TabsTrigger value="backup"><DatabaseBackup className="h-3 w-3 mr-1" />Backup/Export</TabsTrigger>
            <TabsTrigger value="prompts"><History className="h-3 w-3 mr-1" />AI Versions</TabsTrigger>
            <TabsTrigger value="alerts"><Siren className="h-3 w-3 mr-1" />Alerts</TabsTrigger>
            <TabsTrigger value="capacity"><Users className="h-3 w-3 mr-1" />Workload</TabsTrigger>
            <TabsTrigger value="mockdd"><FileLock2 className="h-3 w-3 mr-1" />Mock Diligence</TabsTrigger>
            <TabsTrigger value="agents"><Bot className="h-3 w-3 mr-1" />Agent Contracts</TabsTrigger>
            <TabsTrigger value="capital"><Coins className="h-3 w-3 mr-1" />Capital Alloc.</TabsTrigger>
            <TabsTrigger value="dnb"><Ban className="h-3 w-3 mr-1" />Do-Not-Build</TabsTrigger>
          </TabsList>

          <TabsContent value="lifecycle"><LifecyclePanel /></TabsContent>
          <TabsContent value="kpi"><KPIPanel /></TabsContent>
          <TabsContent value="freshness"><FreshnessPanel /></TabsContent>
          <TabsContent value="challenge"><ChallengePanel /></TabsContent>
          <TabsContent value="cost"><CostPanel /></TabsContent>
          <TabsContent value="classification"><ClassificationPanel /></TabsContent>
          <TabsContent value="backup"><BackupPanel /></TabsContent>
          <TabsContent value="prompts"><PromptsPanel /></TabsContent>
          <TabsContent value="alerts"><AlertsPanel /></TabsContent>
          <TabsContent value="capacity"><CapacityPanel /></TabsContent>
          <TabsContent value="mockdd"><MockDiligencePanel /></TabsContent>
          <TabsContent value="agents"><AgentContractsPanel /></TabsContent>
          <TabsContent value="capital"><CapitalPanel /></TabsContent>
          <TabsContent value="dnb"><DoNotBuildPanel /></TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-sm text-muted-foreground italic py-6 text-center">{msg}</div>;
}

/* ───────── 1. LIFECYCLE ───────── */
function LifecyclePanel() {
  const qc = useQueryClient();
  const assets = useTable("ma_portfolio_assets", "asset_name", true);
  const gates = useTable("ma_lifecycle_gates", "from_stage", true);
  const transitions = useTable("ma_lifecycle_transitions");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ portfolio_asset_id: "", from_stage: "", to_stage: "", rationale: "", evidence: "{}" });

  const propose = useMutation({
    mutationFn: async () => {
      let evidence: any = {};
      try { evidence = JSON.parse(form.evidence || "{}"); } catch { throw new Error("Evidence must be valid JSON"); }
      const gate = (gates.data ?? []).find((g) => g.from_stage === form.from_stage && g.to_stage === form.to_stage)
        ?? (gates.data ?? []).find((g) => g.from_stage === "any" && g.to_stage === form.to_stage);
      const required: string[] = gate?.required_evidence ?? [];
      const warnings = required.filter((k) => !(k in evidence)).map((k) => `Missing evidence: ${k}`);
      const { error } = await sb.from("ma_lifecycle_transitions").insert({
        portfolio_asset_id: form.portfolio_asset_id,
        from_stage: form.from_stage || null,
        to_stage: form.to_stage,
        rationale: form.rationale,
        evidence,
        warnings,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Transition proposed — awaiting founder approval"); setOpen(false); qc.invalidateQueries({ queryKey: ["ma_lifecycle_transitions"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, asset_id, to_stage }: any) => {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("ma_lifecycle_transitions").update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await sb.from("ma_portfolio_assets").update({ current_stage: to_stage }).eq("id", asset_id);
    },
    onSuccess: () => { toast.success("Approved and stage updated"); qc.invalidateQueries({ queryKey: ["ma_lifecycle_transitions"] }); qc.invalidateQueries({ queryKey: ["ma_portfolio_assets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lifecycle gates</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm">Propose transition</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Propose lifecycle transition</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Asset</Label>
                    <Select value={form.portfolio_asset_id} onValueChange={(v) => setForm({ ...form, portfolio_asset_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>From stage</Label>
                      <Select value={form.from_stage} onValueChange={(v) => setForm({ ...form, from_stage: v })}>
                        <SelectTrigger><SelectValue placeholder="Current" /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>To stage</Label>
                      <Select value={form.to_stage} onValueChange={(v) => setForm({ ...form, to_stage: v })}>
                        <SelectTrigger><SelectValue placeholder="Target" /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Rationale</Label>
                    <Textarea value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <Label>Evidence (JSON object with required keys)</Label>
                    <Textarea value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} rows={4} className="font-mono text-xs" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => propose.mutate()} disabled={propose.isPending || !form.portfolio_asset_id || !form.to_stage}>Submit for approval</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>Required evidence per stage transition. Risky transitions require founder approval.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs">
          {(gates.data ?? []).length === 0 ? <EmptyState msg="Gates seeding pending" /> : (
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {(gates.data ?? []).map((g) => (
                <div key={g.id} className="border border-border rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{g.from_stage} → {g.to_stage}</span>
                    {g.requires_founder_approval && <Badge variant="outline">approval</Badge>}
                  </div>
                  <div className="text-muted-foreground mt-1">Evidence: {(g.required_evidence ?? []).join(", ") || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Pending & recent transitions</CardTitle></CardHeader>
        <CardContent className="text-xs">
          {(transitions.data ?? []).length === 0 ? <EmptyState msg="No transitions yet" /> : (
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {(transitions.data ?? []).map((t) => {
                const asset = (assets.data ?? []).find((a) => a.id === t.portfolio_asset_id);
                return (
                  <div key={t.id} className="border border-border rounded p-2">
                    <div className="flex items-center justify-between">
                      <span><b>{asset?.asset_name ?? "?"}</b> · {t.from_stage ?? "—"} → {t.to_stage}</span>
                      <Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge>
                    </div>
                    {(t.warnings ?? []).length > 0 && <div className="text-amber-500 mt-1">⚠ {(t.warnings ?? []).join(" · ")}</div>}
                    {t.rationale && <div className="text-muted-foreground mt-1">{t.rationale}</div>}
                    {t.status === "pending" && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => approve.mutate({ id: t.id, asset_id: t.portfolio_asset_id, to_stage: t.to_stage })}>
                        Approve transition
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 2. KPI DICTIONARY ───────── */
function KPIPanel() {
  const kpis = useTable("ma_kpi_dictionary", "kpi_name", true);
  return (
    <Card className="tech-card">
      <CardHeader><CardTitle>KPI dictionary</CardTitle><CardDescription>Definitions, formulas, sources, owners and AI-estimate rules.</CardDescription></CardHeader>
      <CardContent>
        {(kpis.data ?? []).length === 0 ? <EmptyState msg="No KPIs defined" /> : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>KPI</TableHead><TableHead>Definition</TableHead><TableHead>Source</TableHead>
                <TableHead>Frequency</TableHead><TableHead>Owner</TableHead><TableHead>AI estimate</TableHead><TableHead>Human confirm</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(kpis.data ?? []).map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-xs">{k.kpi_name}</TableCell>
                    <TableCell className="text-xs max-w-[260px]">{k.definition}</TableCell>
                    <TableCell className="text-xs">{k.source_table}{k.source_field ? `.${k.source_field}` : ""}</TableCell>
                    <TableCell className="text-xs">{k.update_frequency}</TableCell>
                    <TableCell className="text-xs">{k.owner}</TableCell>
                    <TableCell><Badge variant={k.ai_estimate_allowed ? "default" : "outline"}>{k.ai_estimate_allowed ? "yes" : "no"}</Badge></TableCell>
                    <TableCell><Badge variant={k.human_confirmation_required ? "secondary" : "outline"}>{k.human_confirmation_required ? "required" : "optional"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── 3. FRESHNESS ───────── */
function FreshnessPanel() {
  const signals = useTable("ma_weekly_signals");
  const buyers = useTable("ma_buyer_matches");
  const competitors = useTable("ma_competitor_profiles");
  const benchmarks = useTable("ma_valuation_benchmarks");
  const datasets = [
    { name: "Weekly signals", rows: signals.data ?? [], dateField: "signal_date" },
    { name: "Buyer matches", rows: buyers.data ?? [], dateField: "updated_at" },
    { name: "Competitor profiles", rows: competitors.data ?? [], dateField: "updated_at" },
    { name: "Valuation benchmarks", rows: benchmarks.data ?? [], dateField: "updated_at" },
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
      {datasets.map((d) => {
        const counts = { fresh: 0, current: 0, stale: 0, archived: 0, unknown: 0 } as Record<string, number>;
        d.rows.forEach((r) => { counts[freshnessLabel(r[d.dateField] ?? r.updated_at ?? r.created_at).label] = (counts[freshnessLabel(r[d.dateField] ?? r.updated_at ?? r.created_at).label] ?? 0) + 1; });
        return (
          <Card key={d.name} className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{d.name}</CardTitle><CardDescription className="text-xs">{d.rows.length} records</CardDescription></CardHeader>
            <CardContent className="text-xs space-y-1">
              <Row label="Fresh (≤30d)" value={counts.fresh} tone="text-emerald-400" />
              <Row label="Current (≤90d)" value={counts.current} tone="text-blue-400" />
              <Row label="Stale (≤180d)" value={counts.stale} tone="text-amber-400" />
              <Row label="Archived (>180d)" value={counts.archived} tone="text-red-400" />
              <Row label="Unknown" value={counts.unknown} tone="text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
      <Card className="tech-card md:col-span-2 lg:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Confidence decay rule</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Confidence shown anywhere in the platform is multiplied by a freshness factor:
          <code className="block mt-1 font-mono">fresh=1.0 · current=0.85 · stale=0.6 · archived=0.3</code>
          Manually reconfirming a record (setting updated_at to now) resets the factor.
        </CardContent>
      </Card>
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: any; tone?: string }) {
  return <div className="flex justify-between"><span>{label}</span><span className={tone ?? ""}>{value}</span></div>;
}

/* ───────── 4. CHALLENGE MODE ───────── */
function ChallengePanel() {
  const recs = useTable("ma_ai_recommendations");
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const runChallenge = async (rec: Row) => {
    setLoading(true);
    try {
      const { data, error } = await sb.functions.invoke("ma-intelligence-orchestrator", {
        body: { mode: "challenge", recommendation_id: rec.id, prompt_name: "challenge_mode" },
      });
      if (error) throw error;
      toast.success("Challenge recorded");
      qc.invalidateQueries({ queryKey: ["ma_ai_recommendations"] });
      setSelected({ ...rec, challenge: data?.challenge ?? rec.challenge });
    } catch (e: any) {
      toast.error(e.message ?? "Challenge requires the orchestrator. You can record one manually below.");
    } finally {
      setLoading(false);
    }
  };

  const saveManualChallenge = useMutation({
    mutationFn: async ({ id, challenge }: any) => {
      const { error } = await sb.from("ma_ai_recommendations").update({ challenge }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["ma_ai_recommendations"] }); },
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle>Challenge mode</CardTitle>
        <CardDescription>Adversarial review before founder approval. Surfaces weakest assumptions and missing evidence.</CardDescription>
      </CardHeader>
      <CardContent>
        {(recs.data ?? []).length === 0 ? <EmptyState msg="No recommendations to challenge" /> : (
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {(recs.data ?? []).map((r) => (
                <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left border rounded p-2 text-xs ${selected?.id === r.id ? "border-primary" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.recommendation_type}</span>
                    <Badge variant={r.risk_level === "high" ? "destructive" : r.risk_level === "medium" ? "secondary" : "outline"}>{r.risk_level}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 line-clamp-2">{r.summary}</div>
                  <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                    <span>conf {r.confidence_score ?? "—"}</span>
                    {r.challenge ? <Badge variant="default" className="text-[10px]">challenged</Badge> : <Badge variant="outline" className="text-[10px]">no challenge yet</Badge>}
                  </div>
                </button>
              ))}
            </div>
            <div>
              {!selected ? <EmptyState msg="Pick a recommendation to challenge" /> : (
                <div className="space-y-2 text-xs">
                  <div className="font-medium">{selected.summary}</div>
                  <Button size="sm" disabled={loading} onClick={() => runChallenge(selected)}>{loading ? "Running…" : "Run AI Challenge"}</Button>
                  <ChallengeView challenge={selected.challenge} />
                  <ManualChallengeForm onSave={(c) => saveManualChallenge.mutate({ id: selected.id, challenge: c })} initial={selected.challenge} />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function ChallengeView({ challenge }: { challenge: any }) {
  if (!challenge) return null;
  const items = [
    ["Why might this fail?", challenge.why_might_fail],
    ["Weakest assumption", challenge.weakest_assumption],
    ["What would a buyer reject?", challenge.buyer_rejection],
    ["Missing evidence", challenge.missing_evidence],
    ["What makes this too expensive?", challenge.too_expensive],
    ["Legal / IP risk", challenge.legal_ip_risk],
    ["Simpler validation test", challenge.simpler_test],
    ["Kill / park triggers", challenge.kill_park_triggers],
  ];
  return (
    <div className="border border-border rounded p-2 space-y-1 bg-muted/20">
      {items.map(([k, v]) => (
        <div key={k as string}><b>{k}:</b> <span className="text-muted-foreground">{v ?? "—"}</span></div>
      ))}
    </div>
  );
}
function ManualChallengeForm({ onSave, initial }: { onSave: (c: any) => void; initial: any }) {
  const [c, setC] = useState<any>(initial ?? {});
  const fields = [
    ["why_might_fail", "Why might this fail?"],
    ["weakest_assumption", "Weakest assumption"],
    ["buyer_rejection", "Buyer rejection"],
    ["missing_evidence", "Missing evidence"],
    ["too_expensive", "Too expensive trigger"],
    ["legal_ip_risk", "Legal / IP risk"],
    ["simpler_test", "Simpler validation test"],
    ["kill_park_triggers", "Kill / park triggers"],
  ];
  return (
    <details className="border border-border rounded p-2">
      <summary className="cursor-pointer font-medium">Manual challenge (no AI)</summary>
      <div className="space-y-2 mt-2">
        {fields.map(([k, label]) => (
          <div key={k}>
            <Label className="text-xs">{label}</Label>
            <Textarea rows={2} value={c[k] ?? ""} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
          </div>
        ))}
        <Button size="sm" onClick={() => onSave(c)}>Save manual challenge</Button>
      </div>
    </details>
  );
}

/* ───────── 5. COST & BUDGET ───────── */
function CostPanel() {
  const qc = useQueryClient();
  const assets = useTable("ma_portfolio_assets", "asset_name", true);
  const costs = useTable("ma_cost_entries");
  const budgets = useTable("ma_budgets");
  const [costForm, setCostForm] = useState({ portfolio_asset_id: "", category: "ai_runs", amount: "0", description: "" });
  const [budgetForm, setBudgetForm] = useState({ portfolio_asset_id: "", category: "monthly_asset", monthly_budget: "0" });

  const addCost = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("ma_cost_entries").insert({ ...costForm, portfolio_asset_id: costForm.portfolio_asset_id || null, amount: Number(costForm.amount) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cost logged"); setCostForm({ ...costForm, amount: "0", description: "" }); qc.invalidateQueries({ queryKey: ["ma_cost_entries"] }); },
  });
  const addBudget = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("ma_budgets").insert({ ...budgetForm, portfolio_asset_id: budgetForm.portfolio_asset_id || null, monthly_budget: Number(budgetForm.monthly_budget) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Budget added"); qc.invalidateQueries({ queryKey: ["ma_budgets"] }); },
  });

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthCosts = (costs.data ?? []).filter((c) => new Date(c.incurred_at) >= monthStart);
  const byAssetCat = new Map<string, number>();
  monthCosts.forEach((c) => {
    const key = `${c.portfolio_asset_id ?? "global"}|${c.category}`;
    byAssetCat.set(key, (byAssetCat.get(key) ?? 0) + Number(c.amount));
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card">
        <CardHeader><CardTitle>Log a cost</CardTitle><CardDescription>AI runs, data, paid connectors, outreach, oversight, adviser, operating.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <Select value={costForm.portfolio_asset_id} onValueChange={(v) => setCostForm({ ...costForm, portfolio_asset_id: v })}>
            <SelectTrigger><SelectValue placeholder="Asset (or leave blank = global)" /></SelectTrigger>
            <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={costForm.category} onValueChange={(v) => setCostForm({ ...costForm, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["ai_runs","data_enrichment","paid_connector","outreach","import","human_oversight","adviser","operating","recommendation"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" step="0.01" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} placeholder="Amount" />
          <Textarea rows={2} value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} placeholder="Description / source" />
          <Button size="sm" onClick={() => addCost.mutate()}>Add cost</Button>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Set a budget</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={budgetForm.portfolio_asset_id} onValueChange={(v) => setBudgetForm({ ...budgetForm, portfolio_asset_id: v })}>
            <SelectTrigger><SelectValue placeholder="Asset (or leave blank = global)" /></SelectTrigger>
            <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({ ...budgetForm, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["monthly_asset","data_api","outreach","adviser","human_oversight"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" step="0.01" value={budgetForm.monthly_budget} onChange={(e) => setBudgetForm({ ...budgetForm, monthly_budget: e.target.value })} placeholder="Monthly budget" />
          <Button size="sm" onClick={() => addBudget.mutate()}>Add budget</Button>
        </CardContent>
      </Card>
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>This month: spend vs budget</CardTitle></CardHeader>
        <CardContent>
          {(budgets.data ?? []).length === 0 ? <EmptyState msg="No budgets set" /> : (
            <div className="overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Category</TableHead><TableHead>Budget</TableHead><TableHead>Spend</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(budgets.data ?? []).map((b) => {
                    const asset = (assets.data ?? []).find((a) => a.id === b.portfolio_asset_id);
                    const spend = byAssetCat.get(`${b.portfolio_asset_id ?? "global"}|${b.category === "monthly_asset" ? "operating" : b.category}`) ?? 0;
                    const pct = b.monthly_budget > 0 ? (spend / Number(b.monthly_budget)) * 100 : 0;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs">{asset?.asset_name ?? "Global"}</TableCell>
                        <TableCell className="text-xs">{b.category}</TableCell>
                        <TableCell className="text-xs">{b.currency} {Number(b.monthly_budget).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{b.currency} {spend.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={pct > 100 ? "destructive" : pct > 80 ? "secondary" : "default"}>{pct.toFixed(0)}%</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 6. DATA CLASSIFICATION ───────── */
function ClassificationPanel() {
  const qc = useQueryClient();
  const cls = useTable("ma_data_classifications");
  const [form, setForm] = useState({ record_type: "data_room_items", record_id: "", classification: "confidential", do_not_export: false, notes: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("ma_data_classifications").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Classification added"); qc.invalidateQueries({ queryKey: ["ma_data_classifications"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const CLASSES = ["public","internal","confidential","highly_confidential","personal_data","adviser_privileged","paid_source_restricted","do_not_export"];
  const TYPES = ["sources","companies","investors","adviser_notes","buyer_notes","data_room_items","files","recommendations"];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card">
        <CardHeader><CardTitle>Tag a record</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Record ID (uuid)" value={form.record_id} onChange={(e) => setForm({ ...form, record_id: e.target.value })} />
          <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v, do_not_export: v === "do_not_export" || form.do_not_export })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
          <Button size="sm" onClick={() => add.mutate()} disabled={!form.record_id}>Apply classification</Button>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Classified records</CardTitle></CardHeader>
        <CardContent className="text-xs max-h-[500px] overflow-auto">
          {(cls.data ?? []).length === 0 ? <EmptyState msg="No classifications applied" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Record</TableHead><TableHead>Class</TableHead><TableHead>Export</TableHead></TableRow></TableHeader>
              <TableBody>
                {(cls.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.record_type}</TableCell>
                    <TableCell className="font-mono text-[10px]">{c.record_id.slice(0,8)}…</TableCell>
                    <TableCell><Badge variant={c.classification.includes("confidential") ? "destructive" : "secondary"}>{c.classification}</Badge></TableCell>
                    <TableCell>{c.do_not_export ? <Badge variant="destructive">blocked</Badge> : <Badge variant="outline">ok</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 7. BACKUP / EXPORT ───────── */
function BackupPanel() {
  const qc = useQueryClient();
  const events = useTable("ma_backup_events", "performed_at", false);
  const [form, setForm] = useState({ event_type: "backup", status: "completed", location_note: "", notes: "" });
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_backup_events").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Logged"); qc.invalidateQueries({ queryKey: ["ma_backup_events"] }); },
  });
  const last = (events.data ?? [])[0];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>Backup / export log</CardTitle><CardDescription>Manual log. Full automation is a future integration — see Technical Manual.</CardDescription></CardHeader>
        <CardContent>
          {!last ? <EmptyState msg="No backups logged" /> : (
            <div className="text-xs space-y-1 mb-3 border border-border rounded p-2">
              <div>Last: <b>{last.event_type}</b> · {last.status} · {new Date(last.performed_at).toLocaleString()}</div>
              {last.location_note && <div className="text-muted-foreground">Location: {last.location_note}</div>}
            </div>
          )}
          {(events.data ?? []).length > 0 && (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(events.data ?? []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.performed_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{e.event_type}</TableCell>
                      <TableCell className="text-xs"><Badge variant={e.status === "completed" ? "default" : "destructive"}>{e.status}</Badge></TableCell>
                      <TableCell className="text-xs">{e.location_note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Log an event</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["backup","export","restore","rollback"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["completed","failed","partial"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={form.location_note} onChange={(e) => setForm({ ...form, location_note: e.target.value })} placeholder="Location / reference" />
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
          <Button size="sm" onClick={() => add.mutate()}>Log event</Button>
        </CardContent>
      </Card>
      <Card className="tech-card lg:col-span-3">
        <CardHeader><CardTitle className="text-sm">Emergency export checklist</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>1. Export <code>ma_portfolio_assets</code>, <code>ma_companies</code>, <code>ma_buyer_matches</code>, <code>ma_deals</code> as CSV from backend Tables.</div>
          <div>2. Export <code>ma_data_room_items</code> + classification tags.</div>
          <div>3. Export <code>ma_audit_logs</code> for last 90 days.</div>
          <div>4. Export <code>ma_ai_recommendations</code> + <code>ma_ai_briefings</code>.</div>
          <div>5. Log this run via "Log an event" with location reference.</div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 8. AI PROMPT VERSIONS ───────── */
function PromptsPanel() {
  const qc = useQueryClient();
  const prompts = useTable("ma_prompt_versions", "prompt_name", true);
  const [form, setForm] = useState({ prompt_name: "", version: "v1", purpose: "", model: "google/gemini-2.5-pro", provider: "lovable_ai_gateway", prompt_body: "", notes: "" });
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_prompt_versions").insert({ ...form, active: false }); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({ queryKey: ["ma_prompt_versions"] }); },
  });
  const activate = useMutation({
    mutationFn: async (p: Row) => {
      await sb.from("ma_prompt_versions").update({ active: false }).eq("prompt_name", p.prompt_name);
      const { error } = await sb.from("ma_prompt_versions").update({ active: true }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Activated"); qc.invalidateQueries({ queryKey: ["ma_prompt_versions"] }); },
  });
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card">
        <CardHeader><CardTitle>Prompt versions</CardTitle><CardDescription>Every recommendation records which version was used.</CardDescription></CardHeader>
        <CardContent className="text-xs max-h-[600px] overflow-auto space-y-2">
          {(prompts.data ?? []).map((p) => (
            <div key={p.id} className="border border-border rounded p-2">
              <div className="flex items-center justify-between">
                <span><b>{p.prompt_name}</b> · {p.version}</span>
                {p.active ? <Badge>active</Badge> : <Button size="sm" variant="outline" onClick={() => activate.mutate(p)}>Activate</Button>}
              </div>
              <div className="text-muted-foreground mt-1">{p.purpose} · {p.model} ({p.provider})</div>
              {p.notes && <div className="text-muted-foreground text-[10px] mt-1">{p.notes}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Register new prompt version</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="prompt_name (e.g. asset_analysis)" value={form.prompt_name} onChange={(e) => setForm({ ...form, prompt_name: e.target.value })} />
          <Input placeholder="version (e.g. v2)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <Input placeholder="purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <Input placeholder="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Textarea rows={6} className="font-mono text-xs" placeholder="Prompt body (optional — orchestrator may load it)" value={form.prompt_body} onChange={(e) => setForm({ ...form, prompt_body: e.target.value })} />
          <Textarea rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button size="sm" onClick={() => add.mutate()} disabled={!form.prompt_name}>Add version</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 9. ALERTS ───────── */
function AlertsPanel() {
  const qc = useQueryClient();
  const alerts = useTable("ma_alerts");
  const assets = useTable("ma_portfolio_assets", "asset_name", true);
  const [form, setForm] = useState<any>({ alert_type: "overdue_approval", title: "", severity: "medium", portfolio_asset_id: "", description: "", recommended_action: "" });
  const TYPES = [
    "overdue_approval","overdue_data_room_item","missed_execution_target","stale_buyer_signal","stale_valuation_benchmark",
    "high_legal_ip_risk","paid_source_licence_warning","capacity_exceeded","quarterly_build_decision_due","monthly_exit_review_due",
    "source_import_failed","scheduled_intelligence_run_failed",
  ];
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_alerts").insert({ ...form, portfolio_asset_id: form.portfolio_asset_id || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Alert created"); qc.invalidateQueries({ queryKey: ["ma_alerts"] }); },
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("ma_alerts").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resolved"); qc.invalidateQueries({ queryKey: ["ma_alerts"] }); },
  });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>Open alerts</CardTitle></CardHeader>
        <CardContent>
          {(alerts.data ?? []).length === 0 ? <EmptyState msg="No alerts" /> : (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {(alerts.data ?? []).map((a) => {
                const asset = (assets.data ?? []).find((x) => x.id === a.portfolio_asset_id);
                const sevTone = a.severity === "critical" ? "destructive" : a.severity === "high" ? "destructive" : a.severity === "medium" ? "secondary" : "outline";
                return (
                  <div key={a.id} className="border border-border rounded p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span><Badge variant={sevTone as any} className="mr-2">{a.severity}</Badge><b>{a.title}</b></span>
                      <Badge variant={a.status === "resolved" ? "default" : "secondary"}>{a.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">{a.alert_type}{asset ? ` · ${asset.asset_name}` : ""}{a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString()}` : ""}</div>
                    {a.description && <div className="mt-1">{a.description}</div>}
                    {a.recommended_action && <div className="text-primary mt-1">→ {a.recommended_action}</div>}
                    {a.status !== "resolved" && <Button size="sm" variant="outline" className="mt-2" onClick={() => resolve.mutate(a.id)}>Resolve</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>New alert</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={form.alert_type} onValueChange={(v) => setForm({ ...form, alert_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.portfolio_asset_id} onValueChange={(v) => setForm({ ...form, portfolio_asset_id: v })}>
            <SelectTrigger><SelectValue placeholder="Asset (optional)" /></SelectTrigger>
            <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea rows={2} placeholder="Recommended action" value={form.recommended_action} onChange={(e) => setForm({ ...form, recommended_action: e.target.value })} />
          <Button size="sm" onClick={() => add.mutate()} disabled={!form.title}>Create alert</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 10. WORKLOAD CAPACITY ───────── */
function CapacityPanel() {
  const qc = useQueryClient();
  const snaps = useTable("ma_workload_capacity", "period_start", false);
  const [form, setForm] = useState({
    period_start: new Date().toISOString().slice(0,10),
    period_end: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10),
    active_assets: 0, pending_founder_approvals: 0, pending_adviser_reviews: 0,
    weekly_oversight_hours_required: 0, weekly_oversight_hours_capacity: 40,
    overdue_decisions: 0, high_risk_escalations: 0, manual_tasks_open: 0, notes: "",
  });
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_workload_capacity").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Snapshot saved"); qc.invalidateQueries({ queryKey: ["ma_workload_capacity"] }); },
  });
  const latest = (snaps.data ?? [])[0];
  const utilisation = latest && latest.weekly_oversight_hours_capacity > 0
    ? (Number(latest.weekly_oversight_hours_required) / Number(latest.weekly_oversight_hours_capacity)) * 100 : 0;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>Current capacity</CardTitle><CardDescription>Used by the Build Selector to delay or scope down new builds.</CardDescription></CardHeader>
        <CardContent>
          {!latest ? <EmptyState msg="No capacity snapshot yet" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <Stat label="Active assets" value={latest.active_assets} />
              <Stat label="Founder approvals pending" value={latest.pending_founder_approvals} tone={latest.pending_founder_approvals > 10 ? "text-red-400" : ""} />
              <Stat label="Adviser reviews pending" value={latest.pending_adviser_reviews} />
              <Stat label="Overdue decisions" value={latest.overdue_decisions} tone={latest.overdue_decisions > 0 ? "text-red-400" : ""} />
              <Stat label="High-risk escalations" value={latest.high_risk_escalations} tone={latest.high_risk_escalations > 0 ? "text-amber-400" : ""} />
              <Stat label="Manual tasks open" value={latest.manual_tasks_open} />
              <Stat label="Hrs required / wk" value={latest.weekly_oversight_hours_required} />
              <Stat label="Hrs capacity / wk" value={latest.weekly_oversight_hours_capacity} />
              <Stat label="Utilisation" value={`${utilisation.toFixed(0)}%`} tone={utilisation > 100 ? "text-red-400" : utilisation > 85 ? "text-amber-400" : "text-emerald-400"} />
            </div>
          )}
          {utilisation > 100 && (
            <Alert className="mt-3 border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Capacity exceeded</AlertTitle>
              <AlertDescription className="text-xs">New quarterly build recommendations should be delayed, reduced in scope, or paired with parking a weaker asset.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Record snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {([
            ["period_start", "Period start", "date"],
            ["period_end", "Period end", "date"],
            ["active_assets", "Active assets", "number"],
            ["pending_founder_approvals", "Founder approvals pending", "number"],
            ["pending_adviser_reviews", "Adviser reviews pending", "number"],
            ["weekly_oversight_hours_required", "Weekly hours required", "number"],
            ["weekly_oversight_hours_capacity", "Weekly hours capacity", "number"],
            ["overdue_decisions", "Overdue decisions", "number"],
            ["high_risk_escalations", "High-risk escalations", "number"],
            ["manual_tasks_open", "Manual tasks open", "number"],
          ] as const).map(([k, lbl, type]) => (
            <div key={k}><Label className="text-xs">{lbl}</Label><Input type={type} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: type === "number" ? Number(e.target.value) : e.target.value })} /></div>
          ))}
          <Button size="sm" onClick={() => add.mutate()}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: any; tone?: string }) {
  return (
    <div className="border border-border rounded p-2">
      <div className="text-muted-foreground text-[10px] uppercase">{label}</div>
      <div className={`text-lg font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

/* ───────── 11. MOCK BUYER DILIGENCE ───────── */
function MockDiligencePanel() {
  const qc = useQueryClient();
  const assets = useTable("ma_portfolio_assets", "asset_name", true);
  const runs = useTable("ma_mock_diligence_runs");
  const [assetId, setAssetId] = useState("");
  const [running, setRunning] = useState(false);
  const run = async () => {
    if (!assetId) return;
    setRunning(true);
    try {
      const { data, error } = await sb.functions.invoke("ma-intelligence-orchestrator", { body: { mode: "mock_buyer_diligence", portfolio_asset_id: assetId, prompt_name: "mock_buyer_diligence" } });
      if (error) throw error;
      toast.success("Diligence run completed");
      qc.invalidateQueries({ queryKey: ["ma_mock_diligence_runs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Run failed — orchestrator must support 'mock_buyer_diligence'. Manual entry remains available.");
    } finally { setRunning(false); }
  };
  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle>Mock buyer diligence</CardTitle>
        <CardDescription>Run an adversarial buyer-side diligence simulation per asset.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!assetId || running} onClick={run}>{running ? "Running…" : "Run mock diligence"}</Button>
        </div>
        {(runs.data ?? []).length === 0 ? <EmptyState msg="No diligence runs yet" /> : (
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {(runs.data ?? []).map((r) => {
              const a = (assets.data ?? []).find((x) => x.id === r.portfolio_asset_id);
              return (
                <div key={r.id} className="border border-border rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span><b>{a?.asset_name ?? "?"}</b> · {new Date(r.created_at).toLocaleDateString()}</span>
                    <Badge>readiness {r.readiness_score ?? "—"}</Badge>
                  </div>
                  {r.summary && <p className="text-muted-foreground mt-1">{r.summary}</p>}
                  <DiligenceList label="Red flags" items={r.red_flags} tone="text-red-400" />
                  <DiligenceList label="Missing evidence" items={r.missing_evidence} tone="text-amber-400" />
                  <DiligenceList label="Buyer objections" items={r.buyer_objections} />
                  <DiligenceList label="Valuation weaknesses" items={r.valuation_weaknesses} />
                  <DiligenceList label="Urgent fixes" items={r.urgent_fixes} tone="text-primary" />
                  <DiligenceList label="30-day cleanup plan" items={r.cleanup_plan_30d} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function DiligenceList({ label, items, tone }: { label: string; items: any; tone?: string }) {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return null;
  return (
    <div className="mt-2">
      <div className={`font-medium ${tone ?? ""}`}>{label}</div>
      <ul className="list-disc pl-5 text-muted-foreground">{arr.map((i, idx) => <li key={idx}>{typeof i === "string" ? i : JSON.stringify(i)}</li>)}</ul>
    </div>
  );
}

/* ───────── 12. AGENT CONTRACTS ───────── */
function AgentContractsPanel() {
  const contracts = useTable("ma_agent_contracts", "agent_name", true);
  return (
    <Card className="tech-card">
      <CardHeader><CardTitle>Agent integration contracts</CardTitle><CardDescription>What each Liftor agent may and may not do.</CardDescription></CardHeader>
      <CardContent>
        {(contracts.data ?? []).length === 0 ? <EmptyState msg="No agent contracts" /> : (
          <div className="grid md:grid-cols-2 gap-3">
            {(contracts.data ?? []).map((c) => (
              <Card key={c.id} className="bg-muted/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> {c.agent_name}</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1">
                  <Field label="Data received" value={c.data_received} />
                  <Field label="Allowed" value={c.actions_allowed} />
                  <Field label="Prohibited" value={c.actions_prohibited} tone="text-red-400" />
                  <Field label="Approval" value={c.approval_requirements} />
                  <Field label="Output expected" value={c.output_expected} />
                  <Field label="Completion criteria" value={c.completion_criteria} />
                  <Field label="Escalation" value={c.escalation_rules} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function Field({ label, value, tone }: { label: string; value: any; tone?: string }) {
  if (!value) return null;
  return <div><span className="text-muted-foreground">{label}: </span><span className={tone ?? ""}>{value}</span></div>;
}

/* ───────── 13. CAPITAL ALLOCATION ───────── */
function CapitalPanel() {
  const qc = useQueryClient();
  const assets = useTable("ma_portfolio_assets", "asset_name", true);
  const allocs = useTable("ma_capital_allocation");
  const [form, setForm] = useState<any>({ portfolio_asset_id: "", monthly_budget: 0, human_oversight_budget: 0, adviser_budget: 0, outreach_budget: 0, data_api_budget: 0, priority_score: 50, resource_recommendation: "hold", rationale: "" });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("ma_capital_allocation").upsert({ ...form }, { onConflict: "portfolio_asset_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["ma_capital_allocation"] }); },
  });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>Allocations by asset</CardTitle></CardHeader>
        <CardContent>
          {(allocs.data ?? []).length === 0 ? <EmptyState msg="No allocations yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Monthly</TableHead><TableHead>Oversight</TableHead><TableHead>Adviser</TableHead><TableHead>Outreach</TableHead><TableHead>Data/API</TableHead><TableHead>Priority</TableHead><TableHead>Recommendation</TableHead></TableRow></TableHeader>
              <TableBody>
                {(allocs.data ?? []).map((al) => {
                  const a = (assets.data ?? []).find((x) => x.id === al.portfolio_asset_id);
                  return (
                    <TableRow key={al.id}>
                      <TableCell className="text-xs">{a?.asset_name ?? "?"}</TableCell>
                      <TableCell className="text-xs">{al.currency} {al.monthly_budget}</TableCell>
                      <TableCell className="text-xs">{al.human_oversight_budget}</TableCell>
                      <TableCell className="text-xs">{al.adviser_budget}</TableCell>
                      <TableCell className="text-xs">{al.outreach_budget}</TableCell>
                      <TableCell className="text-xs">{al.data_api_budget}</TableCell>
                      <TableCell className="text-xs">{al.priority_score}</TableCell>
                      <TableCell><Badge variant={al.resource_recommendation === "kill" ? "destructive" : al.resource_recommendation === "increase" ? "default" : "secondary"}>{al.resource_recommendation}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Set allocation</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Select value={form.portfolio_asset_id} onValueChange={(v) => setForm({ ...form, portfolio_asset_id: v })}>
            <SelectTrigger><SelectValue placeholder="Asset" /></SelectTrigger>
            <SelectContent>{(assets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent>
          </Select>
          {(["monthly_budget","human_oversight_budget","adviser_budget","outreach_budget","data_api_budget","priority_score"] as const).map((k) => (
            <div key={k}><Label className="text-xs">{k.replace(/_/g," ")}</Label><Input type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} /></div>
          ))}
          <Select value={form.resource_recommendation} onValueChange={(v) => setForm({ ...form, resource_recommendation: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["increase","hold","reduce","park","kill","adviser_review"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} placeholder="Rationale" value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
          <Button size="sm" onClick={() => save.mutate()} disabled={!form.portfolio_asset_id}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 14. DO NOT BUILD ───────── */
function DoNotBuildPanel() {
  const qc = useQueryClient();
  const patterns = useTable("ma_do_not_build_patterns", "severity", false);
  const [form, setForm] = useState<any>({ category: "", reason: "", examples: "", severity: "high", active: true });
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_do_not_build_patterns").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({ queryKey: ["ma_do_not_build_patterns"] }); setForm({ category: "", reason: "", examples: "", severity: "high", active: true }); },
  });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2">
        <CardHeader><CardTitle>Do-not-build library</CardTitle><CardDescription>The Build Selector must check candidates against this list.</CardDescription></CardHeader>
        <CardContent>
          {(patterns.data ?? []).length === 0 ? <EmptyState msg="No patterns" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Reason</TableHead><TableHead>Examples</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
              <TableBody>
                {(patterns.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-mono">{p.category}</TableCell>
                    <TableCell className="text-xs">{p.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.examples}</TableCell>
                    <TableCell><Badge variant={p.severity === "blocker" ? "destructive" : "secondary"}>{p.severity}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader><CardTitle>Add pattern</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Input placeholder="Category (snake_case)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Textarea rows={2} placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Textarea rows={2} placeholder="Examples" value={form.examples} onChange={(e) => setForm({ ...form, examples: e.target.value })} />
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["low","medium","high","blocker"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={() => add.mutate()} disabled={!form.category || !form.reason}>Add</Button>
        </CardContent>
      </Card>
    </div>
  );
}