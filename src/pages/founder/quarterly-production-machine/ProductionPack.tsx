import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Lock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link as RLink } from "react-router-dom";
import { createDraftBusinessShellFromPack } from "@/lib/lifecycleHandoffs";
import {
  buildHandoffPack, buildProductionPack, classifyProductionCandidate,
  detectPortfolioCollision, evaluateCapacityGate, evaluateKillRules,
  selectQuarterlyProduction, buildFullProductionPack,
  PRODUCTION_PACK_MAY_AUTO, PRODUCTION_PACK_MUST_NOT_AUTO, PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE,
  type ProductionGateInput, type ProductionBuildPack, type FullProductionPack,
} from "@/lib/fundingRadarEngine";

function currentQuarter() { const d = new Date(); return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() }; }

export default function ProductionPackPage() {
  const { quarter, year } = currentQuarter();
  const [loading, setLoading] = useState(true);
  const [pack, setPack] = useState<ProductionBuildPack | null>(null);
  const [creatingShell, setCreatingShell] = useState(false);
  const [draftShell, setDraftShell] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data: candidates } = await sb.from("ma_build_candidates").select("*").eq("quarter", quarter).eq("year", year);
      const { data: portfolio } = await sb.from("portfolio_assets").select("id,asset_name,sector,description,tags").limit(200);
      const cands = candidates ?? [];
      const inputs: ProductionGateInput[] = await Promise.all(cands.map(async (cand: any) => {
        const [{ data: shortlist }, { data: company }, { data: cluster }, { data: market }] = await Promise.all([
          cand.funding_shortlist_id ? sb.from("funding_shortlist").select("*").eq("id", cand.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
          cand.funding_company_id ? sb.from("funding_radar_companies").select("*").eq("id", cand.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
          cand.funding_cluster_id ? sb.from("funding_problem_clusters").select("*").eq("id", cand.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
          cand.funding_cluster_id ? sb.from("funding_market_maps").select("*").eq("cluster_id", cand.funding_cluster_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        ]);
        const killHits = evaluateKillRules({ recurring_revenue_score: shortlist?.recurring_revenue_score ?? null, willingness_to_pay_evidence_score: shortlist?.willingness_to_pay_evidence_score ?? null, legal_ip_safety_score: shortlist?.legal_ip_safety_score ?? null, market_recommendation: market?.recommended_entry_strategy ?? null } as any);
        const capacity = evaluateCapacityGate({ current_quarter_active_builds: cands.filter((c: any) => c.recommendation_status === "selected").length });
        const collision = detectPortfolioCollision({ name: cand.candidate_name, sector: company?.sector ?? null, cluster: cluster?.cluster_name ?? null }, (portfolio ?? []).map((p: any) => ({ id: p.id, name: p.asset_name, sector: p.sector, description: p.description, tags: p.tags })));
        return { candidate: cand, shortlist, market, killHits, capacity, collision } as ProductionGateInput;
      }));
      const result = selectQuarterlyProduction(inputs);
      const mk = async (g: ProductionGateInput, ev: ReturnType<typeof classifyProductionCandidate>) => {
        const c = g.candidate;
        const [{ data: shortlist }, { data: company }, { data: cluster }] = await Promise.all([
          c.funding_shortlist_id ? sb.from("funding_shortlist").select("*").eq("id", c.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_company_id ? sb.from("funding_radar_companies").select("*").eq("id", c.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_cluster_id ? sb.from("funding_problem_clusters").select("*").eq("id", c.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        const handoff = buildHandoffPack({ candidate: c as any, shortlist, company, cluster, distribution: null });
        return buildProductionPack({ gate: g, evaluation: ev, handoff });
      };
      if (result.primary) setPack(await mk(result.primary, result.primary.evaluation));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [quarter, year]);

  const full: FullProductionPack | null = useMemo(() => pack ? buildFullProductionPack({ pack }) : null, [pack]);

  const download = () => {
    if (!full) return;
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `liftor_full_production_pack_${(pack?.candidate.name ?? "build").replace(/\W+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const createShell = async () => {
    if (!pack) return;
    setCreatingShell(true);
    try {
      const shell = await createDraftBusinessShellFromPack({
        candidate_name: pack.candidate.name,
        production_pack_ref: `${quarter}-${year}`,
      });
      setDraftShell(shell);
      toast.success("Draft business shell created — review in Business Onboarding Factory.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create draft shell");
    } finally {
      setCreatingShell(false);
    }
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/quarterly-production-machine" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Quarterly Production Machine</Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><Package className="h-7 w-7 text-primary" /> Full Business Production Pack</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">14 sub-packs covering business, brand, product, tech, UI/UX, copy, legal, CRM, onboarding, support, analytics, launch QA, Lovable prompts and GitHub audit. Founder approval still gates production build, brand, domains, outreach, paid APIs, public launch and live mode.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            {full && <Button size="sm" variant="outline" onClick={download}><Download className="h-3 w-3 mr-1" />Download pack JSON</Button>}
            <Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine/lovable-pack"><FileText className="h-3 w-3 mr-1" />Lovable Prompt Pack →</Link></Button>
            {full && (
              <Button size="sm" onClick={createShell} disabled={creatingShell || !!draftShell}>
                {creatingShell ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Building2 className="h-3 w-3 mr-1" />}
                {draftShell ? "Shell created" : "Create draft business shell"}
              </Button>
            )}
            {draftShell && (
              <Button asChild size="sm" variant="outline">
                <RLink to="/founder/business-onboarding-factory"><Building2 className="h-3 w-3 mr-1" />Open in Onboarding Factory →</RLink>
              </Button>
            )}
          </div>
          {draftShell && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Draft shell <span className="font-mono">{draftShell.name}</span> created. Status: draft — founder review required before any activation.
            </p>
          )}
        </div>

        {loading ? <p className="text-xs text-muted-foreground">Generating pack…</p> : !full ? (
          <Card className="tech-card"><CardContent className="py-6 text-sm text-muted-foreground">No primary build pack this quarter.<div className="mt-3"><Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine">Open production machine</Link></Button></div></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="1 · Business summary" rows={Object.entries(full.business_summary).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="2 · Brand pack" rows={Object.entries(full.brand_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="3 · Product pack" rows={Object.entries(full.product_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="4 · Technical pack" rows={Object.entries(full.technical_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="5 · UI / UX pack" rows={Object.entries(full.ui_ux_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="6 · Copy pack" rows={Object.entries(full.copy_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="7 · Legal pack" rows={[
              ["pages", full.legal_pack.pages.map((p) => `${p.title} (${p.risk})`).join(" · ")],
              ["rules", full.legal_pack.rules.join(" · ")],
              ["pre_publish_gates", full.legal_pack.pre_publish_gates.join(" · ")],
            ]} />
            <Section title="8 · CRM / revenue pack" rows={Object.entries(full.crm_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="9 · Onboarding / delivery pack" rows={Object.entries(full.onboarding_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="10 · Support / complaints pack" rows={Object.entries(full.support_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="11 · Analytics / KPI pack" rows={Object.entries(full.analytics_pack).map(([k, v]) => [k, Array.isArray(v) ? v.join(" · ") : String(v)])} />
            <Section title="12 · Launch QA pack" rows={full.launch_qa_pack.map((s, i) => [String(i + 1).padStart(2, "0"), s])} />
            <Section title="14 · GitHub audit pack" rows={[
              ["audit_steps", full.github_audit_pack.audit_steps.join(" · ")],
              ["must_pass", full.github_audit_pack.must_pass.join(" · ")],
              ["must_block", full.github_audit_pack.must_block.join(" · ")],
              ["prompt_body", full.github_audit_pack.prompt_body],
            ]} />
          </div>
        )}

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" /> Automation boundaries</CardTitle></CardHeader>
          <CardContent className="text-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">May auto</p>
              <ul className="space-y-1">{PRODUCTION_PACK_MAY_AUTO.map((a) => <li key={a} className="flex gap-2"><span className="text-primary">•</span>{a}</li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Must not auto</p>
              <ul className="space-y-1">{PRODUCTION_PACK_MUST_NOT_AUTO.map((a) => <li key={a} className="flex gap-2"><span className="text-amber-400">•</span>{a}</li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Founder approval before</p>
              <ul className="space-y-1">{PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE.map((a) => <li key={a} className="flex gap-2"><span className="text-amber-400">•</span>{a}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function Section({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="border border-border/50 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">{k.replace(/_/g, " ")}</p>
            <p>{v || <span className="text-muted-foreground italic">—</span>}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}