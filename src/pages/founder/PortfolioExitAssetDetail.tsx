import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Briefcase, Lock, AlertCircle } from "lucide-react";
import AssetAIAnalysisPanel from "@/components/founder/portfolio/AssetAIAnalysisPanel";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${Number(n).toFixed(0)}`;

const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString());

export default function PortfolioExitAssetDetail() {
  const { assetId } = useParams<{ assetId: string }>();

  const { data: asset, isLoading } = useQuery<any>({
    queryKey: ["ma_asset", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_portfolio_assets")
        .select("*")
        .eq("id", assetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: exitTargets = [] } = useQuery<any[]>({
    queryKey: ["ma_exit_targets", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_exit_targets")
        .select("*")
        .eq("portfolio_asset_id", assetId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: buyerMatches = [] } = useQuery<any[]>({
    queryKey: ["ma_buyer_matches", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_buyer_matches")
        .select("*, buyer:ma_companies!ma_buyer_matches_buyer_company_id_fkey(id, company_name, sector, country)")
        .eq("portfolio_asset_id", assetId)
        .order("fit_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: investors = [] } = useQuery<any[]>({
    queryKey: ["ma_investors_all"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_investors")
        .select("*")
        .order("relevance_score", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: competitors = [] } = useQuery<any[]>({
    queryKey: ["ma_competitors", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_competitor_profiles")
        .select("*, company:ma_companies!ma_competitor_profiles_company_id_fkey(id, company_name, sector, country, website)")
        .or(`portfolio_asset_match_id.eq.${assetId},portfolio_asset_match_id.is.null`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: executionTargets = [] } = useQuery<any[]>({
    queryKey: ["ma_execution_targets", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_execution_targets")
        .select("*")
        .eq("portfolio_asset_id", assetId)
        .order("target_period_start", { ascending: false });
      return data ?? [];
    },
  });

  const { data: dataRoom = [] } = useQuery<any[]>({
    queryKey: ["ma_data_room", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_data_room_items")
        .select("*")
        .eq("portfolio_asset_id", assetId)
        .order("item_category");
      return data ?? [];
    },
  });

  if (isLoading) {
    return <FounderLayout><p className="text-muted-foreground">Loading…</p></FounderLayout>;
  }

  if (!asset) {
    return (
      <FounderLayout>
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <Card className="tech-card"><CardContent className="p-8 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">Asset not found or access denied.</p>
          </CardContent></Card>
        </div>
      </FounderLayout>
    );
  }

  // progress: target revenue
  const liveTarget = executionTargets.find((t) => t.status === "active") || executionTargets[0];
  const targetMR = Number(liveTarget?.monthly_revenue_target ?? 0);
  const currentMR = Number(asset.current_monthly_revenue ?? 0);
  const revProgress = targetMR > 0 ? Math.min(100, Math.round((currentMR / targetMR) * 100)) : 0;

  // data room readiness from items
  const drDone = dataRoom.filter((i) => i.status === "complete").length;
  const drPct = dataRoom.length ? Math.round((drDone / dataRoom.length) * 100) : asset.data_room_readiness_score ?? 0;

  // buyer warmth bar (max)
  const warmthOrder = ["cold","aware","engaged","warm","strategic_conversation","exit_ready"];
  const maxWarmth = buyerMatches.reduce(
    (m, b) => Math.max(m, warmthOrder.indexOf(b.buyer_warmth_status)),
    -1,
  );
  const warmthPct = maxWarmth >= 0 ? Math.round(((maxWarmth + 1) / warmthOrder.length) * 100) : 0;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Portfolio</Link>
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-primary" />
              {asset.asset_name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline">{asset.asset_type}</Badge>
              <Badge variant="secondary">{asset.status}</Badge>
              {asset.next_decision && <Badge variant="outline">→ {asset.next_decision.replace("_", " ")}</Badge>}
              {asset.needs_review && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-400">needs review</Badge>
              )}
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> No external action</Badge>
        </div>

        {/* Progress bars */}
        <Card className="tech-card">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ProgressBar label="Revenue → target" value={revProgress} />
            <ProgressBar label="Exit readiness" value={asset.exit_readiness_score ?? 0} />
            <ProgressBar label="Data room" value={drPct} />
            <ProgressBar label="Buyer warmth" value={warmthPct} />
            <ProgressBar label="Liftor operability" value={asset.liftor_operability_score ?? 0} />
            <ProgressBar label="Founder dep. reduction" value={100 - (asset.founder_dependency_score ?? 0)} />
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exit">Exit Targets</TabsTrigger>
            <TabsTrigger value="buyers">Buyer Map</TabsTrigger>
            <TabsTrigger value="investors">Investors / VC</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="execution">Execution Targets</TabsTrigger>
            <TabsTrigger value="dataroom">Data Room</TabsTrigger>
            <TabsTrigger value="risks">Risks &amp; Governance</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card className="tech-card"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Description" value={asset.description} multiline />
              <Field label="Owner entity" value={asset.owner_entity} />
              <Field label="Jurisdiction notes" value={asset.jurisdiction_notes} multiline />
              <Field label="Target customer market" value={asset.target_customer_market} multiline />
              <Field label="Target buyer market" value={asset.target_buyer_market} multiline />
              <Field label="Current stage" value={asset.current_stage} />
              <Field label="Target exit (low / base / high)" value={`${fmt(asset.target_exit_value_low)} / ${fmt(asset.target_exit_value_base)} / ${fmt(asset.target_exit_value_high)}`} />
              <Field label="Monthly / Annual revenue" value={`${fmt(asset.current_monthly_revenue)} / ${fmt(asset.current_annual_revenue)}`} />
              <Field label="Monthly / Annual profit" value={`${fmt(asset.current_monthly_profit)} / ${fmt(asset.current_annual_profit)}`} />
              <Field label="Current pipeline value" value={fmt(asset.current_pipeline_value)} />
              <Field label="Next decision" value={asset.next_decision} />
              <Field label="Next action" value={asset.next_action} multiline />
            </CardContent></Card>
          </TabsContent>

          {/* Exit Targets */}
          <TabsContent value="exit">
            {exitTargets.length === 0 ? (
              <Empty msg="No exit targets defined. Add one to reverse-engineer required metrics." />
            ) : exitTargets.map((t) => {
              const reqMR = Number(t.required_monthly_revenue ?? 0);
              const gap = reqMR - currentMR;
              return (
                <Card key={t.id} className="tech-card mb-3"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <Field label="Desired exit value" value={`${fmt(t.desired_exit_value)} ${t.currency ?? ""}`} />
                  <Field label="Valuation method" value={t.valuation_method} />
                  <Field label="Assumed multiple" value={t.assumed_multiple} />
                  <Field label="Required annual revenue" value={fmt(t.required_annual_revenue)} />
                  <Field label="Required monthly revenue" value={fmt(t.required_monthly_revenue)} />
                  <Field label="Required annual profit" value={fmt(t.required_annual_profit)} />
                  <Field label="Required monthly profit" value={fmt(t.required_monthly_profit)} />
                  <Field label="Required pipeline" value={fmt(t.required_pipeline_value)} />
                  <Field label="Required customers" value={num(t.required_customer_count)} />
                  <Field label="Required growth rate" value={t.required_growth_rate ? `${t.required_growth_rate}%` : "—"} />
                  <Field label="Required buyer warmth" value={t.required_buyer_warmth_level} />
                  <Field label="Timeline (months)" value={t.target_exit_timeline_months} />
                  <Field
                    label="Gap to target (MRR)"
                    value={reqMR > 0 ? (gap > 0 ? `${fmt(gap)} to go` : "achieved") : "—"}
                  />
                </CardContent></Card>
              );
            })}
          </TabsContent>

          {/* Buyer Map */}
          <TabsContent value="buyers">
            {buyerMatches.length === 0 ? (
              <Empty msg="No buyer matches yet. Add candidate acquirers to begin mapping." />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {buyerMatches.map((b) => (
                  <Card key={b.id} className="tech-card"><CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{b.buyer?.company_name ?? "Unknown buyer"}</div>
                      <Badge variant="outline">{b.buyer_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{b.buyer?.sector} · {b.buyer?.country}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Field label="Fit score" value={b.fit_score ?? "—"} compact />
                      <Field label="Warmth" value={b.buyer_warmth_status} compact />
                      <Field label="Likely deal (base)" value={fmt(b.likely_deal_size_base)} compact />
                      <Field label="Warm route" value={b.warm_route ?? "—"} compact />
                    </div>
                    <Field label="Strategic reason" value={b.strategic_reason} multiline compact />
                    <Field label="Decision makers" value={b.decision_makers_notes} multiline compact />
                    <Field label="Next warm-up action" value={b.next_warmup_action} multiline compact />
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Investors */}
          <TabsContent value="investors">
            {investors.length === 0 ? (
              <Empty msg="No investor records yet. Add VC / PE / family office targets." />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {investors.map((i) => (
                  <Card key={i.id} className="tech-card"><CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{i.investor_name}</div>
                      <Badge variant="outline">{i.investor_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{i.country} · {(i.sectors ?? []).join(", ")}</div>
                    <Field label="Stage focus" value={i.stage_focus} compact />
                    <Field label="Cheque size" value={i.cheque_size_notes} compact multiline />
                    <Field label="Portfolio" value={i.portfolio_notes} compact multiline />
                    <Field label="Exit history" value={i.exit_history_notes} compact multiline />
                    <Field label="Likely end-buyer" value={i.likely_end_buyer_notes} compact multiline />
                    <Field label="Relevance" value={i.relevance_score ?? "—"} compact />
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Competitors */}
          <TabsContent value="competitors">
            {competitors.length === 0 ? (
              <Empty msg="No competitor profiles yet. Add comparables proving demand." />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {competitors.map((c) => (
                  <Card key={c.id} className="tech-card"><CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{c.company?.company_name ?? "Unknown"}</div>
                      <Badge
                        variant="outline"
                        className={
                          c.legal_copy_risk === "high" ? "border-destructive/40 text-destructive"
                          : c.legal_copy_risk === "medium" ? "border-amber-500/40 text-amber-400"
                          : "border-emerald-500/40 text-emerald-400"
                        }
                      >
                        copy risk: {c.legal_copy_risk}
                      </Badge>
                    </div>
                    <Field label="Problem solved" value={c.problem_solved} compact multiline />
                    <Field label="Target customer" value={c.target_customer} compact />
                    <Field label="Funding / growth" value={c.funding_notes ?? c.growth_signals} compact multiline />
                    <Field label="Weaknesses" value={c.weaknesses} compact multiline />
                    <Field label="What we can learn" value={c.what_we_can_learn} compact multiline />
                    <Field label="What we must NOT copy" value={c.what_we_must_not_copy} compact multiline />
                    <Field label="Liftor advantage" value={c.liftor_advantage_notes} compact multiline />
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Execution Targets */}
          <TabsContent value="execution">
            {executionTargets.length === 0 ? (
              <Empty msg="No execution targets handed to agents yet." />
            ) : (
              <div className="space-y-3">
                {executionTargets.map((t) => (
                  <Card key={t.id} className="tech-card"><CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <Field label="Period" value={`${t.target_period_start ?? "—"} → ${t.target_period_end ?? "—"}`} />
                    <Field label="Status" value={<Badge variant="secondary">{t.status}</Badge>} />
                    <Field label="Assigned agent" value={t.assigned_agent ?? "—"} />
                    <Field label="Inbox SLA" value={t.inbox_response_sla ?? "—"} />
                    <Field label="Monthly revenue target" value={fmt(t.monthly_revenue_target)} />
                    <Field label="Monthly profit target" value={fmt(t.monthly_profit_target)} />
                    <Field label="Pipeline target" value={fmt(t.pipeline_target)} />
                    <Field label="Qualified leads" value={num(t.qualified_leads_target)} />
                    <Field label="Outreach target" value={num(t.outreach_target)} />
                    <Field label="Content output" value={num(t.content_output_target)} />
                    <Field label="Buyer warm-ups" value={num(t.buyer_warmup_target)} />
                    <Field label="CRM opportunities" value={num(t.crm_opportunity_target)} />
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Data Room */}
          <TabsContent value="dataroom">
            {dataRoom.length === 0 ? (
              <Empty msg="No data room items tracked yet. Build the sale-readiness checklist." />
            ) : (
              <div className="space-y-3">
                {Object.entries(groupBy(dataRoom, "item_category")).map(([cat, items]) => (
                  <Card key={cat} className="tech-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">{cat}</CardTitle></CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {(items as any[]).map((i) => (
                        <div key={i.id} className="flex items-center justify-between border border-border/60 rounded p-3 text-sm">
                          <div>
                            <div className="font-medium">{i.item_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {i.owner ? `owner: ${i.owner}` : "no owner"} · {i.storage_location ?? "no location"}
                              {i.due_date ? ` · due ${i.due_date}` : ""}
                            </div>
                            {i.notes && <div className="text-xs text-muted-foreground mt-1">{i.notes}</div>}
                          </div>
                          <StatusBadge status={i.status} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Risks & Governance */}
          <TabsContent value="risks">
            <Card className="tech-card"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="IP / legal risk" value={summariseRisk(dataRoom, ["ip", "legal"])} multiline />
              <Field label="Compliance risk" value={summariseRisk(dataRoom, ["compliance", "approval_logs"])} multiline />
              <Field label="Customer / data risk" value={summariseRisk(dataRoom, ["customer_data", "crm"])} multiline />
              <Field label="Jurisdiction" value={asset.jurisdiction_notes} multiline />
              <Field label="Founder dependency" value={`${asset.founder_dependency_score ?? "—"}% — lower is better`} />
              <Field label="Manual workload" value={`Liftor operability ${asset.liftor_operability_score ?? "—"}%`} />
              <Field label="Legal copy risk in market" value={`${competitors.filter((c)=>c.legal_copy_risk==="high").length} high-risk comparables`} />
              <Field
                label="Next adviser review"
                value={asset.next_decision === "adviser_review" ? (asset.next_action ?? "scheduled") : "not scheduled"}
              />
            </CardContent></Card>
          </TabsContent>

          {/* AI Analysis */}
          <TabsContent value="ai">
            <AssetAIAnalysisPanel assetId={asset.id} assetName={asset.asset_name} />
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Field({
  label, value, multiline, compact,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <div className={`text-${compact ? "[10px]" : "xs"} text-muted-foreground uppercase tracking-wide`}>{label}</div>
      <div className={`${multiline ? "whitespace-pre-wrap" : ""} ${compact ? "text-xs" : "text-sm"} mt-0.5`}>
        {value == null || value === "" ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{v}%</span>
      </div>
      <Progress value={v} className="h-1.5 mt-1" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    missing: "bg-destructive/10 text-destructive border-destructive/30",
    requested: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    needs_review: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border ${map[status] ?? ""}`}>{status}</span>;
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card className="tech-card"><CardContent className="p-8 text-center">
      <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{msg}</p>
      <p className="text-xs text-muted-foreground mt-1">No fake data shown.</p>
    </CardContent></Card>
  );
}

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key] ?? "other");
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

function summariseRisk(items: any[], cats: string[]) {
  const rel = items.filter((i) => cats.includes(i.item_category));
  if (rel.length === 0) return "No items tracked.";
  const missing = rel.filter((i) => i.status === "missing").length;
  const needs = rel.filter((i) => i.status === "needs_review").length;
  const done = rel.filter((i) => i.status === "complete").length;
  return `${rel.length} items · ${done} complete · ${missing} missing · ${needs} need review`;
}
