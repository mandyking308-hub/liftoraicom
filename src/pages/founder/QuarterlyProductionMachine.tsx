import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, ArrowLeft, Download, Lock, Trophy, FileText, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHandoffPack,
  buildProductionPack,
  classifyProductionCandidate,
  evaluateKillRules,
  evaluateCapacityGate,
  detectPortfolioCollision,
  selectQuarterlyProduction,
  PRODUCTION_CLASSIFICATION_LABEL,
  PRODUCTION_FOUNDER_APPROVAL_GATES,
  WATCHLIST_FORBIDDEN_ACTIONS,
  type ProductionGateInput,
  type ProductionBuildPack,
} from "@/lib/fundingRadarEngine";

function currentQuarter() {
  const d = new Date();
  return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() };
}

const AUTOMATIC_ACTIONS = [
  "Recommend the quarterly build",
  "Generate the Production Build Pack",
  "Create internal founder tasks",
  "Create internal build queue items",
  "Draft Lovable prompts",
  "Draft GitHub issues (if enabled)",
  "Create Launch Factory starter records",
  "Create Business Template starter records",
  "Create Command Centre draft operating panel",
  "Generate internal manuals/runbooks",
];

export default function QuarterlyProductionMachine() {
  const { quarter, year } = currentQuarter();
  const [loading, setLoading] = useState(true);
  const [evaluated, setEvaluated] = useState<ReturnType<typeof selectQuarterlyProduction> | null>(null);
  const [primaryPack, setPrimaryPack] = useState<ProductionBuildPack | null>(null);
  const [backupPack, setBackupPack] = useState<ProductionBuildPack | null>(null);
  const [reviewedQuarters, setReviewedQuarters] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      // last 3 monthly runs
      const since = new Date();
      since.setMonth(since.getMonth() - 3);
      const sinceISO = since.toISOString();
      const [{ data: runs }, { data: candidates }, { data: portfolio }] = await Promise.all([
        sb.from("funding_monthly_runs").select("month,year,status").gte("updated_at", sinceISO).order("year", { ascending: false }).order("month", { ascending: false }).limit(3),
        sb.from("ma_build_candidates").select("*").eq("quarter", quarter).eq("year", year),
        sb.from("portfolio_assets").select("id,asset_name,sector,description,tags").limit(200).then((r: any) => r).catch(() => ({ data: [] })),
      ]);
      setReviewedQuarters((runs ?? []).map((r: any) => `${r.year}-${String(r.month).padStart(2, "0")}`));

      const cands = candidates ?? [];
      const inputs: ProductionGateInput[] = await Promise.all(
        cands.map(async (cand: any) => {
          const [{ data: shortlist }, { data: company }, { data: cluster }, { data: market }] = await Promise.all([
            cand.funding_shortlist_id
              ? sb.from("funding_shortlist").select("build_thesis,capital_efficiency_summary,recurring_revenue_score,willingness_to_pay_evidence_score,capital_efficiency_advantage_score,legal_ip_safety_score").eq("id", cand.funding_shortlist_id).maybeSingle()
              : Promise.resolve({ data: null }),
            cand.funding_company_id
              ? sb.from("funding_radar_companies").select("company_name,sector,revenue_model_pattern,pricing_logic,distinct_execution_route,cluster_id").eq("id", cand.funding_company_id).maybeSingle()
              : Promise.resolve({ data: null }),
            cand.funding_cluster_id
              ? sb.from("funding_problem_clusters").select("cluster_name,problem_thesis,customer_pain,distinct_execution_route").eq("id", cand.funding_cluster_id).maybeSingle()
              : Promise.resolve({ data: null }),
            cand.funding_cluster_id
              ? sb.from("funding_market_maps").select("market_name,recommended_entry_strategy,crowding_level,saturation_risk,white_space_score,liftor_entry_score,avoid_reason").eq("cluster_id", cand.funding_cluster_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null }))
              : Promise.resolve({ data: null }),
          ]);

          const killHits = evaluateKillRules({
            recurring_revenue_score: shortlist?.recurring_revenue_score ?? null,
            willingness_to_pay_evidence_score: shortlist?.willingness_to_pay_evidence_score ?? null,
            legal_ip_safety_score: shortlist?.legal_ip_safety_score ?? null,
            market_recommendation: market?.recommended_entry_strategy ?? null,
          } as any);

          const capacity = evaluateCapacityGate({
            current_quarter_active_builds: cands.filter((c: any) => c.recommendation_status === "selected").length,
          });

          const collision = detectPortfolioCollision(
            { name: cand.candidate_name, sector: company?.sector ?? null, cluster: cluster?.cluster_name ?? null },
            (portfolio?.data ?? portfolio ?? []).map((p: any) => ({ id: p.id, name: p.asset_name, sector: p.sector, description: p.description, tags: p.tags })),
          );

          return {
            candidate: cand,
            shortlist,
            market,
            killHits,
            capacity,
            collision,
          };
        })
      );

      const result = selectQuarterlyProduction(inputs);
      setEvaluated(result);

      const buildPackFor = async (g: ProductionGateInput, ev: ReturnType<typeof classifyProductionCandidate>) => {
        const sb2: any = supabase as any;
        const c = g.candidate;
        const [{ data: shortlist }, { data: company }, { data: cluster }] = await Promise.all([
          c.funding_shortlist_id ? sb2.from("funding_shortlist").select("*").eq("id", c.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_company_id ? sb2.from("funding_radar_companies").select("*").eq("id", c.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_cluster_id ? sb2.from("funding_problem_clusters").select("*").eq("id", c.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        const handoff = buildHandoffPack({ candidate: c as any, shortlist, company, cluster, distribution: null });
        return buildProductionPack({ gate: g, evaluation: ev, handoff });
      };

      if (result.primary) setPrimaryPack(await buildPackFor(result.primary, result.primary.evaluation));
      if (result.backup) setBackupPack(await buildPackFor(result.backup, result.backup.evaluation));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [quarter, year]);

  const downloadPack = (pack: ProductionBuildPack | null) => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor_production_pack_${pack.candidate.name.replace(/\W+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allCount = useMemo(() => {
    if (!evaluated) return 0;
    return (evaluated.primary ? 1 : 0) + (evaluated.backup ? 1 : 0) + evaluated.watch.length + evaluated.park.length + evaluated.kill.length;
  }, [evaluated]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/portfolio-exit/build-selector" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Quarterly Build Selector
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1">
            <Factory className="h-7 w-7 text-primary" /> Quarterly Production Build Machine
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Once per quarter the machine reads the last three Funding Radar runs, applies kill rules, market gates, capacity and portfolio-collision checks, and recommends one Primary build and one Backup. Founder approval is still required before any production build, brand, domain, outreach or live launch.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            <Badge variant="outline">Reviewed runs: {reviewedQuarters.join(", ") || "—"}</Badge>
            <Badge variant="outline">{allCount} candidates evaluated</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/build-generator">Better Build Generator</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/build-pack-validator">Build Pack Validator</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/production-pack">Production Pack</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/lovable-pack">Lovable Prompt Pack</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/prompt-queue">Prompt Queue</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/vertical-launch">Vertical Launch Cannon</Link></Button>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Evaluating candidates…</p>
        ) : !evaluated || allCount === 0 ? (
          <Card className="tech-card">
            <CardContent className="py-6 text-sm text-muted-foreground">
              No promoted candidates this quarter. Run the Funding Radar monthly cycle, shortlist opportunities, and promote into the Quarterly Build Selector first.
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/founder/funding-radar/shortlist">Open shortlist</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/founder/portfolio-exit/build-selector">Open Quarterly Build Selector</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <PackCard label="Primary build" pack={primaryPack} onDownload={() => downloadPack(primaryPack)} />
            <PackCard label="Backup build" pack={backupPack} onDownload={() => downloadPack(backupPack)} />

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Other classifications</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <ClassList title="Watch next quarter" items={evaluated.watch.map((e) => ({ name: e.candidate.candidate_name, reason: e.evaluation.reasons[0] ?? e.evaluation.blockers[0] ?? "—" }))} />
                <ClassList title="Park" items={evaluated.park.map((e) => ({ name: e.candidate.candidate_name, reason: e.evaluation.blockers[0] ?? "Insufficient evidence" }))} />
                <ClassList title="Kill" items={evaluated.kill.map((e) => ({ name: e.candidate.candidate_name, reason: e.evaluation.blockers[0] ?? "Blocked by kill rule" }))} />
              </CardContent>
            </Card>
          </>
        )}

        <Card className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" /> Automation boundary</CardTitle>
          </CardHeader>
          <CardContent className="text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Machine may automatically</p>
              <ul className="space-y-1">
                {AUTOMATIC_ACTIONS.map((a) => (<li key={a} className="flex items-start gap-2"><span className="text-primary">•</span>{a}</li>))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-amber-400" /> Founder approval required before</p>
              <ul className="space-y-1">
                {PRODUCTION_FOUNDER_APPROVAL_GATES.map((a) => (<li key={a} className="flex items-start gap-2"><span className="text-amber-400">•</span>{a}</li>))}
              </ul>
              <p className="text-[10px] uppercase text-muted-foreground mt-3 mb-1">Never automatically</p>
              <div className="flex flex-wrap gap-1">
                {WATCHLIST_FORBIDDEN_ACTIONS.slice(0, 12).map((f) => (
                  <Badge key={f} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{f}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function PackCard({ label, pack, onDownload }: { label: string; pack: ProductionBuildPack | null; onDownload: () => void }) {
  if (!pack) {
    return (
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />{label}</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">No qualifying candidate this quarter.</CardContent>
      </Card>
    );
  }
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />{label}: {pack.candidate.name}</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">{PRODUCTION_CLASSIFICATION_LABEL[pack.classification]} · score {pack.score}/100</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3 w-3 mr-1" />Production pack</Button>
          <Button asChild size="sm" variant="outline"><Link to={`/founder/funding-radar/handoff/${pack.candidate.id}`}><FileText className="h-3 w-3 mr-1" />Handoff</Link></Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Block title="Executive summary" value={pack.executive_summary} />
        <Block title="Why selected" value={pack.why_selected.join(" · ") || "—"} />
        <Block title="Customer problem thesis" value={pack.customer_problem_thesis} />
        <Block title="Paying customer profile" value={pack.thesis.paying_customer_profile} />
        <Block title="Willingness to pay" value={pack.willingness_to_pay_evidence} />
        <Block title="Capital efficiency advantage" value={pack.capital_efficiency_advantage} />
        <Block title="Crowding & white space" value={pack.crowding_white_space} />
        <Block title="Legally distinct concept" value={pack.thesis.legally_distinct_product_concept} />
        <Block title="Acquirer pain thesis" value={pack.acquirer_pain_thesis} />
        <Block title="Exit logic" value={pack.exit_logic} />
        <BlockList title="MVP feature list" items={pack.build_plan.mvp_feature_list.length ? pack.build_plan.mvp_feature_list : ["Founder to define from thesis"]} />
        <BlockList title="Landing page structure" items={pack.build_plan.landing_page_structure} />
        <BlockList title="CRM pipeline stages" items={pack.build_plan.crm_pipeline_stages} />
        <BlockList title="Database schema needs" items={pack.database_schema_needs} />
        <BlockList title="First 30-day plan" items={pack.schedule.first_30_day_execution_plan} />
        <BlockList title="First 90-day plan" items={pack.schedule.first_90_day_operating_plan} />
        <BlockList title="KPIs" items={pack.governance.kpis} />
        <BlockList title="Kill / continue criteria" items={pack.governance.kill_continue_criteria} />
        <BlockList title="Approval gates" items={pack.governance.approval_gates} />
        <BlockList title="Human oversight" items={pack.human_oversight_requirements} />
        <BlockList title="AI operator requirements" items={pack.ai_operator_requirements} />
        <BlockList title="Command Centre panel" items={pack.command_centre_panel_requirements} />
        <BlockList title="Lovable build prompts" items={pack.lovable_build_prompt_pack} />
        <BlockList title="GitHub task pack" items={pack.github_task_pack} />
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <Button asChild size="sm" variant="outline"><Link to={pack.connections.launch_factory}>Launch Factory →</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={pack.connections.business_templates}>Business Templates →</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={pack.connections.portfolio_commander}>Portfolio Commander →</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={pack.connections.command_centre}>Command Centre →</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Block({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p>
      <p className="text-xs">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

function BlockList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p>
      {items.length === 0 ? <p className="text-xs text-muted-foreground italic">—</p> : (
        <ul className="space-y-1">
          {items.map((it, i) => (<li key={i} className="text-xs flex items-start gap-1"><span className="text-primary">•</span><span>{it}</span></li>))}
        </ul>
      )}
    </div>
  );
}

function ClassList({ title, items }: { title: string; items: Array<{ name: string; reason: string }> }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p>
      {items.length === 0 ? <p className="text-muted-foreground italic">None</p> : (
        <ul className="space-y-1">
          {items.map((it, i) => (<li key={i}><span className="font-medium">{it.name}</span><span className="text-muted-foreground"> — {it.reason}</span></li>))}
        </ul>
      )}
    </div>
  );
}