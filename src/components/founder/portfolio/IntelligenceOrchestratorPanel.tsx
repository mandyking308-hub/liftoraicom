import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, AlertTriangle, ShieldCheck, RefreshCw, Lock, FileWarning, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type Briefing = any;
type Rec = any;

const riskColor: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};
const statusColor: Record<string, string> = {
  proposed: "bg-cyan-500/10 text-cyan-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  actioned: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export default function IntelligenceOrchestratorPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ["io_assets"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ma_portfolio_assets").select("id,asset_name");
      return data ?? [];
    },
  });

  const { data: briefing } = useQuery<Briefing | null>({
    queryKey: ["io_portfolio_briefing"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_ai_briefings")
        .select("*").eq("kind", "portfolio")
        .order("generated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: recs = [] } = useQuery<Rec[]>({
    queryKey: ["io_recommendations"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_ai_recommendations")
        .select("*")
        .order("urgency_score", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const assetName = (id: string | null) =>
    !id ? "Portfolio-wide" : assets.find((a) => a.id === id)?.asset_name ?? "—";

  const invoke = async (mode: string, body: any = {}) => {
    setRunning(mode);
    try {
      const { data, error } = await (supabase as any).functions.invoke("ma-intelligence-orchestrator", { body: { mode, ...body } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Intelligence run complete");
      qc.invalidateQueries({ queryKey: ["io_portfolio_briefing"] });
      qc.invalidateQueries({ queryKey: ["io_recommendations"] });
    } catch (e: any) {
      const msg = e?.message ?? "AI failed";
      if (msg.includes("rate")) toast.error("AI rate limit — try again shortly.");
      else if (msg.includes("credits") || msg.includes("Payment")) toast.error("AI credits exhausted. Add credits at Settings → Workspace → Usage.");
      else toast.error(msg);
    } finally {
      setRunning(null);
    }
  };

  // Compute Intelligence Gaps from raw data (no AI needed)
  const { data: gapData } = useQuery<any>({
    queryKey: ["io_gaps"],
    queryFn: async () => {
      const [a, c, b, v, d, e, s] = await Promise.all([
        (supabase as any).from("ma_portfolio_assets").select("id,asset_name,owner_entity,jurisdiction_notes,current_monthly_revenue,target_buyer_market"),
        (supabase as any).from("ma_companies").select("id"),
        (supabase as any).from("ma_buyer_matches").select("portfolio_asset_id"),
        (supabase as any).from("ma_valuation_benchmarks").select("id"),
        (supabase as any).from("ma_data_room_items").select("portfolio_asset_id,status"),
        (supabase as any).from("ma_execution_targets").select("portfolio_asset_id"),
        (supabase as any).from("ma_intelligence_sources").select("id"),
      ]);
      return { assets: a.data ?? [], companies: c.data ?? [], buyers: b.data ?? [], bench: v.data ?? [], dr: e.data ?? [], exec: e.data ?? [], sources: s.data ?? [] };
    },
  });

  const gaps = useMemo(() => {
    if (!gapData) return [];
    const out: { label: string; severity: "high" | "medium" | "low"; }[] = [];
    const assetsArr = gapData.assets;
    if (gapData.sources.length === 0) out.push({ label: "No intelligence sources registered — add at least one source for governance.", severity: "high" });
    if (gapData.bench.length === 0) out.push({ label: "No valuation benchmarks recorded — exit pricing has no comparable anchor.", severity: "high" });
    if (gapData.companies.length === 0) out.push({ label: "Buyer/competitor universe is empty — populate Buyer Universe.", severity: "high" });
    for (const a of assetsArr) {
      if (!a.owner_entity) out.push({ label: `${a.asset_name}: missing owner entity`, severity: "high" });
      if (!a.jurisdiction_notes) out.push({ label: `${a.asset_name}: missing jurisdiction notes`, severity: "medium" });
      if (!a.current_monthly_revenue) out.push({ label: `${a.asset_name}: missing revenue data`, severity: "medium" });
      if (!a.target_buyer_market) out.push({ label: `${a.asset_name}: missing target buyer market`, severity: "medium" });
      const hasBuyer = gapData.buyers.some((x: any) => x.portfolio_asset_id === a.id);
      if (!hasBuyer) out.push({ label: `${a.asset_name}: no buyer matches mapped`, severity: "high" });
      const drCount = gapData.dr.filter((x: any) => x.portfolio_asset_id === a.id).length;
      if (drCount === 0) out.push({ label: `${a.asset_name}: data room not initialised`, severity: "high" });
      const hasExec = gapData.exec.some((x: any) => x.portfolio_asset_id === a.id);
      if (!hasExec) out.push({ label: `${a.asset_name}: no execution targets generated`, severity: "medium" });
    }
    return out;
  }, [gapData]);

  const updateRec = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from("ma_ai_recommendations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Recommendation updated");
    qc.invalidateQueries({ queryKey: ["io_recommendations"] });
  };

  const approve = (id: string) => updateRec(id, { status: "approved", approved_at: new Date().toISOString() });
  const reject = (id: string) => updateRec(id, { status: "rejected", rejection_reason: "Founder rejected" });
  const markActioned = (id: string) => updateRec(id, { status: "actioned" });

  const bbody = (briefing?.body as any) ?? {};
  const approvalQueue = recs.filter((r) => r.required_human_approval && r.status === "proposed");
  const decisionQueue = recs.filter((r) => r.status === "proposed");
  const riskAlerts = recs.filter((r) => r.risk_level === "high" && ["proposed","approved"].includes(r.status));
  const next7 = bbody.next_7_day_actions ?? [];
  const next30 = bbody.next_30_day_actions ?? [];

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Intelligence Orchestrator
            <Badge variant="outline" className="ml-2 gap-1 text-[10px]">
              <Lock className="h-3 w-3" /> Approval-gated
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            AI reasons across portfolio, buyers, investors, signals, competitors, valuation and data room.
            All recommendations are advisory. Sending, contacting, or legally-binding actions require founder approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!running} onClick={() => invoke("portfolio_briefing")}>
            <Sparkles className="h-3 w-3 mr-1" /> {running === "portfolio_briefing" ? "Running…" : "Run Portfolio Briefing"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!running} onClick={() => invoke("generate_recommendations")}>
            <RefreshCw className="h-3 w-3 mr-1" /> {running === "generate_recommendations" ? "Running…" : "Generate Recommendations"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="briefing">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="briefing">Briefing</TabsTrigger>
            <TabsTrigger value="recs">Recommendations ({recs.length})</TabsTrigger>
            <TabsTrigger value="approval">Founder Approval ({approvalQueue.length})</TabsTrigger>
            <TabsTrigger value="gaps">Intelligence Gaps ({gaps.length})</TabsTrigger>
            <TabsTrigger value="next7">Next 7 Days</TabsTrigger>
            <TabsTrigger value="next30">Next 30 Days</TabsTrigger>
            <TabsTrigger value="risk">Risk Alerts ({riskAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="briefing" className="mt-4">
            {!briefing ? (
              <Empty hint="No briefing generated yet. Click 'Run Portfolio Briefing'." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{briefing.ai_model}</Badge>
                  <Badge variant="outline">confidence {briefing.confidence_score}%</Badge>
                  <Badge variant="outline">evidence: {briefing.evidence_strength}</Badge>
                  <Badge variant="outline">{briefing.source_count} sources</Badge>
                  <span>{new Date(briefing.generated_at).toLocaleString()}</span>
                </div>
                <p className="text-sm">{bbody.summary ?? briefing.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Section title="Strongest asset" body={bbody.strongest_asset ? `${bbody.strongest_asset.name ?? "—"} — ${bbody.strongest_asset.reason ?? ""}` : "—"} />
                  <Section title="Weakest asset" body={bbody.weakest_asset ? `${bbody.weakest_asset.name ?? "—"} — ${bbody.weakest_asset.reason ?? ""}` : "—"} />
                  <Section title="Highest exit potential" body={bbody.highest_exit_potential ? `${bbody.highest_exit_potential.name ?? "—"} — ${bbody.highest_exit_potential.reason ?? ""}` : "—"} />
                  <Section title="Most urgent data room gap" body={bbody.most_urgent_data_room_gap ?? "—"} />
                  <Section title="Strongest buyer signal" body={bbody.strongest_buyer_signal ?? "—"} />
                  <Section title="Strongest investor signal" body={bbody.strongest_investor_signal ?? "—"} />
                  <Section title="Biggest execution gap" body={bbody.biggest_execution_gap ?? "—"} />
                  <Section title="Highest legal/IP risk" body={bbody.highest_legal_ip_risk ?? "—"} warn />
                </div>
                <Disclaimer />
              </div>
            )}
          </TabsContent>

          <TabsContent value="recs" className="mt-4">
            {recs.length === 0 ? (
              <Empty hint="No AI recommendations yet. Click 'Generate Recommendations'." />
            ) : (
              <div className="space-y-2">
                {recs.map((r) => (
                  <RecCard key={r.id} r={r} assetName={assetName} approve={approve} reject={reject} markActioned={markActioned} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approval" className="mt-4">
            {approvalQueue.length === 0 ? (
              <Empty hint="No items awaiting founder approval." />
            ) : (
              <div className="space-y-2">
                {approvalQueue.map((r) => (
                  <RecCard key={r.id} r={r} assetName={assetName} approve={approve} reject={reject} markActioned={markActioned} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gaps" className="mt-4">
            {gaps.length === 0 ? (
              <Empty hint="No major intelligence gaps detected." />
            ) : (
              <ul className="space-y-1.5">
                {gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm p-2 rounded border border-border/40">
                    <FileWarning className={`h-4 w-4 mt-0.5 ${g.severity === "high" ? "text-destructive" : "text-amber-400"}`} />
                    <span>{g.label}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{g.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="next7" className="mt-4">
            <ActionList items={next7} empty="No 7-day actions yet — run a Portfolio Briefing." />
          </TabsContent>
          <TabsContent value="next30" className="mt-4">
            <ActionList items={next30} empty="No 30-day actions yet — run a Portfolio Briefing." />
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            {riskAlerts.length === 0 ? (
              <Empty hint="No high-risk alerts." />
            ) : (
              <div className="space-y-2">
                {riskAlerts.map((r) => (
                  <RecCard key={r.id} r={r} assetName={assetName} approve={approve} reject={reject} markActioned={markActioned} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Section({ title, body, warn }: { title: string; body: string; warn?: boolean }) {
  return (
    <div className={`p-3 rounded border ${warn ? "border-destructive/30 bg-destructive/5" : "border-border/40 bg-background/40"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-sm mt-1">{body}</div>
    </div>
  );
}

function ActionList({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) return <Empty hint={empty} />;
  return (
    <ul className="space-y-1.5">
      {items.map((a, i) => (
        <li key={i} className="flex items-start gap-2 text-sm p-2 rounded border border-border/40">
          <Clock className="h-4 w-4 mt-0.5 text-primary" /> <span>{a}</span>
        </li>
      ))}
    </ul>
  );
}

function RecCard({ r, assetName, approve, reject, markActioned }: any) {
  return (
    <div className="p-3 rounded-md border border-border/50 bg-background/60 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{r.recommendation_type}</Badge>
          <span className="text-xs text-muted-foreground">{assetName(r.portfolio_asset_id)}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] border ${riskColor[r.risk_level]}`}>risk: {r.risk_level}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${statusColor[r.status]}`}>{r.status}</span>
          {r.ai_generated && <Badge variant="outline" className="text-[10px]">AI-generated</Badge>}
          {r.required_human_approval && r.status === "proposed" && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">approval required</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>conf {r.confidence_score ?? "—"}%</span>
          <span>urg {r.urgency_score ?? "—"}%</span>
          {r.due_date && <span>due {new Date(r.due_date).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="text-sm font-medium">{r.summary}</div>
      {r.reasoning && <div className="text-xs text-muted-foreground">{r.reasoning}</div>}
      {Array.isArray(r.supporting_signals) && r.supporting_signals.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          Supporting: {r.supporting_signals.slice(0, 6).join(" · ")}
        </div>
      )}
      {r.status === "proposed" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => approve(r.id)}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => reject(r.id)}>
            <XCircle className="h-3 w-3 mr-1" /> Reject
          </Button>
        </div>
      )}
      {r.status === "approved" && (
        <Button size="sm" variant="outline" onClick={() => markActioned(r.id)}>
          <ShieldCheck className="h-3 w-3 mr-1" /> Mark actioned
        </Button>
      )}
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="text-[10px] text-muted-foreground italic flex items-start gap-1 border-t border-border/40 pt-2">
      <AlertTriangle className="h-3 w-3 mt-0.5" />
      AI-generated planning intelligence — depends on available data, source quality and confidence scores.
      Not legal, tax or financial advice. Adopt the market signal, do not copy protected assets.
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-md">{hint}</div>;
}