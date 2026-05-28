import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FundingRadarLayout, FRSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Sparkles, Lock, ListChecks, Stethoscope, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  generateAutopsyReport, generateBetterBuildPack, generateLovablePromptPack,
  AUTOPSY_FORBIDDEN_COPYING, AUTOPSY_ALLOWED_EXTRACTION, PRODUCTION_FOUNDER_APPROVAL_GATES,
  type AutopsyInput, type AutopsyReport, type BetterBuildPack, type LovablePromptPack,
} from "@/lib/fundingRadarEngine";

export default function BusinessAutopsyDetail() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { (async () => {
    if (!id) return;
    const { data } = await (supabase as any).from("business_autopsies").select("*").eq("id", id).maybeSingle();
    setRow(data); setLoading(false);
  })(); }, [id]);

  const runAnalysis = async () => {
    if (!row) return;
    setRunning(true);
    const sb: any = supabase as any;
    const [{ data: cluster }, { data: market }, { data: signals }] = await Promise.all([
      row.related_cluster_id ? sb.from("funding_problem_clusters").select("id,cluster_name,problem_thesis,customer_pain").eq("id", row.related_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
      row.related_cluster_id ? sb.from("funding_market_maps").select("recommended_entry_strategy,crowding_level,saturation_risk,white_space_score,avoid_reason").eq("cluster_id", row.related_cluster_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      row.related_watchlist_id ? sb.from("funding_weakness_signals").select("signal_type,signal_polarity,severity_score,confidence_score,observed_at").eq("watchlist_id", row.related_watchlist_id).limit(50).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]);
    const input: AutopsyInput = {
      company_name: row.company_name,
      website: row.website, funding_source: row.funding_source,
      sector: row.sector, country: row.country,
      competitor_notes: row.competitor_notes, uploaded_research: row.uploaded_research,
      reason_for_analysis: row.reason_for_analysis,
      related_cluster: cluster, related_market: market, related_signals: signals ?? [],
    };
    const report: AutopsyReport = generateAutopsyReport(input);
    const buildPack: BetterBuildPack = generateBetterBuildPack(input, report);
    const promptPack: LovablePromptPack = generateLovablePromptPack(input, buildPack);
    const { error } = await sb.from("business_autopsies").update({
      business_model: report.business_model,
      customer_pain: report.customer_pain,
      operational_heaviness: report.operational_heaviness,
      weakness_signals: report.weakness_signals,
      market_position: report.market_position,
      liftor_advantage: report.liftor_advantage,
      legal_warnings: report.legal_warnings,
      recommendation: report.recommendation,
      recommendation_reason: report.recommendation_reason,
      better_build_pack: buildPack,
      lovable_prompt_pack: promptPack,
    }).eq("id", row.id);
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Autopsy report generated");
    const { data: refreshed } = await sb.from("business_autopsies").select("*").eq("id", row.id).maybeSingle();
    setRow(refreshed);
  };

  const downloadJson = (name: string, payload: any) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <FundingRadarLayout title="Business Autopsy"><p className="text-xs text-muted-foreground">Loading…</p></FundingRadarLayout>;
  if (!row) return <FundingRadarLayout title="Business Autopsy"><p className="text-xs text-muted-foreground">Not found.</p></FundingRadarLayout>;

  const report: AutopsyReport | null = row.business_model && Object.keys(row.business_model).length ? {
    business_model: row.business_model, customer_pain: row.customer_pain, operational_heaviness: row.operational_heaviness,
    weakness_signals: row.weakness_signals, market_position: row.market_position, liftor_advantage: row.liftor_advantage,
    legal_warnings: row.legal_warnings ?? [], recommendation: row.recommendation, recommendation_reason: row.recommendation_reason ?? "",
  } : null;
  const pack: BetterBuildPack | null = row.better_build_pack ?? null;
  const promptPack: LovablePromptPack | null = row.lovable_prompt_pack ?? null;

  return (
    <FundingRadarLayout title={row.company_name} subtitle="Public, manual or uploaded sources only. Liftor extracts the validated customer pain and weakness signals — never code, branding, copy, customer data or proprietary workflows.">
      <FRSection title="Inputs" actions={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/founder/funding-radar/business-autopsy">Back</Link></Button>
          <Button size="sm" onClick={runAnalysis} disabled={running}><Sparkles className="h-3 w-3 mr-1" />{running ? "Running…" : (report ? "Re-run" : "Run analysis")}</Button>
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <KV k="Company" v={row.company_name} />
          <KV k="Website" v={row.website} />
          <KV k="Funding source" v={row.funding_source} />
          <KV k="Sector" v={row.sector} />
          <KV k="Country" v={row.country} />
          <KV k="Source kind" v={row.source_kind} />
          <KV k="Recommendation" v={<Badge variant="outline" className="text-[10px]">{row.recommendation}</Badge>} />
          <KV k="Approval" v={<Badge variant="outline" className="text-[10px]">{row.approval_status}</Badge>} />
        </div>
      </FRSection>

      {report && (
        <>
          <FRSection title="Autopsy report" actions={
            <Button size="sm" variant="outline" onClick={() => downloadJson(`autopsy_${row.company_name.replace(/\W+/g, "_")}.json`, report)}><Download className="h-3 w-3 mr-1" />Export</Button>
          }>
            <p className="text-xs mb-2"><span className="text-muted-foreground">Recommendation reason: </span>{report.recommendation_reason}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Block title="Business model" obj={report.business_model} />
              <Block title="Customer pain" obj={report.customer_pain} />
              <Block title="Operational heaviness" obj={report.operational_heaviness} />
              <Block title="Market position" obj={report.market_position} />
              <BlockArr title="Weakness signals — negative" items={report.weakness_signals.negative} />
              <BlockArr title="Weakness signals — positive" items={report.weakness_signals.positive} />
              <BlockArr title="Liftor automation opportunities" items={report.liftor_advantage.ai_automation} />
              <BlockArr title="Low-capex reasons" items={report.liftor_advantage.low_capex_reasons} />
              <BlockArr title="Legal warnings" items={report.legal_warnings} className="md:col-span-2 border-amber-500/30 text-amber-300" />
            </div>
          </FRSection>

          {pack && (
            <FRSection title="Better Build Pack" actions={
              <Button size="sm" variant="outline" onClick={() => downloadJson(`better_build_${row.company_name.replace(/\W+/g, "_")}.json`, pack)}><Download className="h-3 w-3 mr-1" />Export pack</Button>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <KV k="Legally distinct concept" v={pack.legally_distinct_concept} />
                <KV k="Working name" v={pack.product_name_placeholder} />
                <KV k="Target customer" v={pack.target_customer} />
                <KV k="First offer" v={pack.first_offer} />
                <KV k="Pricing hypothesis" v={pack.pricing_hypothesis} />
                <KV k="Acquirer pain" v={pack.acquirer_pain_thesis} />
                <BlockArr title="MVP feature list" items={pack.mvp_feature_list} />
                <BlockArr title="Database schema" items={pack.database_schema_needs} />
                <BlockArr title="Landing page" items={pack.landing_page_structure} />
                <BlockArr title="CRM pipeline" items={pack.crm_pipeline_stages} />
                <BlockArr title="Onboarding flow" items={pack.onboarding_flow} />
                <BlockArr title="Support flow" items={pack.support_flow} />
                <BlockArr title="Compliance pages" items={pack.compliance_legal_pages_needed} />
                <BlockArr title="Approval gates" items={pack.approval_gates} />
                <BlockArr title="Human oversight" items={pack.human_oversight_requirements} />
                <BlockArr title="AI agent requirements" items={pack.ai_agent_requirements} />
                <BlockArr title="First 30-day plan" items={pack.first_30_day_build_plan} />
                <BlockArr title="First 90-day plan" items={pack.first_90_day_operating_plan} />
                <BlockArr title="KPIs" items={pack.kpis} />
                <BlockArr title="Kill / continue" items={pack.kill_continue_criteria} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/founder/launch-factory">Launch Factory <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/founder/business-templates">Business Templates <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/founder/portfolio-exit">Portfolio Commander <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine">Production Machine <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
              </div>
            </FRSection>
          )}

          {promptPack && (
            <FRSection title="Lovable Build Prompt Pack" actions={
              <Button size="sm" variant="outline" onClick={() => downloadJson(`lovable_prompts_${row.company_name.replace(/\W+/g, "_")}.json`, promptPack)}><Download className="h-3 w-3 mr-1" />Export prompts</Button>
            }>
              <div className="border border-amber-500/20 rounded p-2 text-[11px] text-amber-300 mb-2 flex items-start gap-2"><Lock className="h-3 w-3 mt-0.5" />{promptPack.legal_notice}</div>
              <div className="space-y-2 text-xs">
                {promptPack.prompts.map((p) => (
                  <Card key={p.step} className="tech-card"><CardContent className="py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Prompt {p.step}: {p.title}</p>
                    <pre className="text-xs whitespace-pre-wrap mt-1">{p.prompt}</pre>
                  </CardContent></Card>
                ))}
              </div>
            </FRSection>
          )}
        </>
      )}

      <FRSection title="Approval gates">
        <div className="flex flex-wrap gap-1">
          {PRODUCTION_FOUNDER_APPROVAL_GATES.map((g) => (<Badge key={g} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{g}</Badge>))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Generating an autopsy or build pack does not start a production build, publish a brand, buy a domain, send outreach or contact anyone. All of those require explicit founder approval.</p>
      </FRSection>
    </FundingRadarLayout>
  );
}

function KV({ k, v }: { k: string; v: any }) { return <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground mb-1">{k}</p><div className="text-xs">{v ?? <span className="text-muted-foreground italic">—</span>}</div></div>; }
function Block({ title, obj }: { title: string; obj: Record<string, string> }) {
  return <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p><dl className="space-y-1">{Object.entries(obj ?? {}).map(([k, v]) => (<div key={k} className="grid grid-cols-3 gap-1"><dt className="col-span-1 text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt><dd className="col-span-2">{v as string || "—"}</dd></div>))}</dl></div>;
}
function BlockArr({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
  return <div className={"border border-border/50 rounded p-2 " + className}><p className="text-[10px] uppercase mb-1">{title}</p>{(items?.length ?? 0) === 0 ? <p className="text-muted-foreground italic">—</p> : <ul className="space-y-1">{items.map((it, i) => (<li key={i} className="flex items-start gap-1"><span className="text-primary">•</span><span>{it}</span></li>))}</ul>}</div>;
}