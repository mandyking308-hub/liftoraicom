import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Lock, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHandoffPack,
  buildProductionPack,
  classifyProductionCandidate,
  detectPortfolioCollision,
  evaluateCapacityGate,
  evaluateKillRules,
  selectQuarterlyProduction,
  validateBuildPack,
  BUILD_PACK_VALIDATION_LABEL,
  BUILD_PACK_REQUIRED_ITEMS,
  PROMPT_QUEUE_FORBIDDEN,
  PRODUCTION_FOUNDER_APPROVAL_GATES,
  type ProductionBuildPack,
  type ProductionGateInput,
  type BuildPackValidationReport,
} from "@/lib/fundingRadarEngine";

function currentQuarter() {
  const d = new Date();
  return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() };
}

export default function BuildPackValidator() {
  const { quarter, year } = currentQuarter();
  const [loading, setLoading] = useState(true);
  const [primaryPack, setPrimaryPack] = useState<ProductionBuildPack | null>(null);
  const [backupPack, setBackupPack] = useState<ProductionBuildPack | null>(null);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data: candidates } = await sb.from("ma_build_candidates").select("*").eq("quarter", quarter).eq("year", year);
      const { data: portfolio } = await sb.from("portfolio_assets").select("id,asset_name,sector,description,tags").limit(200);
      const cands = candidates ?? [];
      const inputs: ProductionGateInput[] = await Promise.all(
        cands.map(async (cand: any) => {
          const [{ data: shortlist }, { data: company }, { data: cluster }, { data: market }] = await Promise.all([
            cand.funding_shortlist_id ? sb.from("funding_shortlist").select("*").eq("id", cand.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
            cand.funding_company_id ? sb.from("funding_radar_companies").select("*").eq("id", cand.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
            cand.funding_cluster_id ? sb.from("funding_problem_clusters").select("*").eq("id", cand.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
            cand.funding_cluster_id ? sb.from("funding_market_maps").select("*").eq("cluster_id", cand.funding_cluster_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
          ]);
          const killHits = evaluateKillRules({
            recurring_revenue_score: shortlist?.recurring_revenue_score ?? null,
            willingness_to_pay_evidence_score: shortlist?.willingness_to_pay_evidence_score ?? null,
            legal_ip_safety_score: shortlist?.legal_ip_safety_score ?? null,
            market_recommendation: market?.recommended_entry_strategy ?? null,
          } as any);
          const capacity = evaluateCapacityGate({ current_quarter_active_builds: cands.filter((c: any) => c.recommendation_status === "selected").length });
          const collision = detectPortfolioCollision(
            { name: cand.candidate_name, sector: company?.sector ?? null, cluster: cluster?.cluster_name ?? null },
            (portfolio ?? []).map((p: any) => ({ id: p.id, name: p.asset_name, sector: p.sector, description: p.description, tags: p.tags })),
          );
          return { candidate: cand, shortlist, market, killHits, capacity, collision } as ProductionGateInput;
        })
      );
      const result = selectQuarterlyProduction(inputs);
      const buildPackFor = async (g: ProductionGateInput, ev: ReturnType<typeof classifyProductionCandidate>) => {
        const c = g.candidate;
        const [{ data: shortlist }, { data: company }, { data: cluster }] = await Promise.all([
          c.funding_shortlist_id ? sb.from("funding_shortlist").select("*").eq("id", c.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_company_id ? sb.from("funding_radar_companies").select("*").eq("id", c.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_cluster_id ? sb.from("funding_problem_clusters").select("*").eq("id", c.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        const handoff = buildHandoffPack({ candidate: c as any, shortlist, company, cluster, distribution: null });
        return buildProductionPack({ gate: g, evaluation: ev, handoff });
      };
      if (result.primary) setPrimaryPack(await buildPackFor(result.primary, result.primary.evaluation));
      if (result.backup) setBackupPack(await buildPackFor(result.backup, result.backup.evaluation));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [quarter, year]);

  const primaryReport = useMemo(() => validateBuildPack(primaryPack), [primaryPack]);
  const backupReport = useMemo(() => validateBuildPack(backupPack), [backupPack]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/quarterly-production-machine" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Quarterly Production Machine
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1">
            <ShieldCheck className="h-7 w-7 text-primary" /> Build Pack Validator
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Confirms every Lovable Build Prompt Pack contains the 23 required artefacts before prompts are queued. Founder approval still gates production build, brand, domains, outreach and live launch.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            <Badge variant="outline">{BUILD_PACK_REQUIRED_ITEMS.length} required items</Badge>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Validating build packs…</p>
        ) : (
          <>
            <ValidatorCard label="Primary build" pack={primaryPack} report={primaryReport} />
            <ValidatorCard label="Backup build" pack={backupPack} report={backupReport} />
          </>
        )}

        <Card className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" /> Approval boundary</CardTitle>
          </CardHeader>
          <CardContent className="text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Founder approval required before</p>
              <ul className="space-y-1">
                {PRODUCTION_FOUNDER_APPROVAL_GATES.map((a) => (<li key={a} className="flex items-start gap-2"><span className="text-amber-400">•</span>{a}</li>))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Never automatically</p>
              <div className="flex flex-wrap gap-1">
                {PROMPT_QUEUE_FORBIDDEN.map((f) => (
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

function ValidatorCard({ label, pack, report }: { label: string; pack: ProductionBuildPack | null; report: BuildPackValidationReport }) {
  const statusColor =
    report.status === "READY_FOR_PROMPT_QUEUE" ? "border-emerald-500/40 text-emerald-300" :
    report.status === "INCOMPLETE" ? "border-amber-500/40 text-amber-300" :
    "border-rose-500/40 text-rose-300";
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> {label}: {pack?.candidate?.name ?? "—"}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            {report.presentCount}/{report.totalCount} present · <span className={statusColor}>{BUILD_PACK_VALIDATION_LABEL[report.status]}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" disabled={report.status !== "READY_FOR_PROMPT_QUEUE"}>
            <Link to="/founder/quarterly-production-machine/prompt-queue">Open prompt queue →</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        {!pack && <p className="text-muted-foreground">No build pack — promote a candidate in the Quarterly Production Machine first.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {report.items.map((it) => (
            <div key={it.key} className="border border-border/50 rounded p-2">
              <div className="flex items-start gap-2">
                {it.present ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium">{it.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{it.evidence ?? (it.needsAdviser ? "Needs adviser review" : it.needsFounder ? "Needs founder input" : "Missing")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}