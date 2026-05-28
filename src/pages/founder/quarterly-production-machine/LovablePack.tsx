import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Download, ListOrdered } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHandoffPack, buildProductionPack, buildFullProductionPack, classifyProductionCandidate,
  detectPortfolioCollision, evaluateCapacityGate, evaluateKillRules, selectQuarterlyProduction,
  type ProductionGateInput, type ProductionBuildPack, type FullProductionPack,
} from "@/lib/fundingRadarEngine";

function currentQuarter() { const d = new Date(); return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() }; }

export default function LovablePackPage() {
  const { quarter, year } = currentQuarter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pack, setPack] = useState<ProductionBuildPack | null>(null);

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

  const copyAll = async () => {
    if (!full) return;
    const text = full.lovable_prompt_pack.map((p) => `# ${p.title}\n\n${p.body}\n\n${Object.entries(p.acceptance_criteria).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`).join("\n")}\n\nTest: ${p.test_instruction}\n${p.founder_approval_required ? "Founder approval required.\n" : ""}`).join("\n---\n\n");
    try { await navigator.clipboard.writeText(text); toast({ title: "Lovable pack copied" }); } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  const download = () => {
    if (!full) return;
    const blob = new Blob([JSON.stringify(full.lovable_prompt_pack, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `liftor_lovable_pack_${(pack?.candidate.name ?? "build").replace(/\W+/g, "_").toLowerCase()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/quarterly-production-machine/production-pack" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Production Pack</Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><ListOrdered className="h-7 w-7 text-primary" /> Lovable Prompt Pack</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">16-stage Lovable prompt sequence ending with QA + GitHub audit + launch-readiness report. Founder approval required for legal pages, handoffs, QA and live mode. No outbound, no paid APIs, no public claims, no copying.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            {full && <>
              <Button size="sm" variant="outline" onClick={copyAll}><Copy className="h-3 w-3 mr-1" />Copy all prompts</Button>
              <Button size="sm" variant="outline" onClick={download}><Download className="h-3 w-3 mr-1" />Download JSON</Button>
            </>}
          </div>
        </div>

        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : !full ? (
          <Card className="tech-card"><CardContent className="py-6 text-sm text-muted-foreground">No primary build pack this quarter.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {full.lovable_prompt_pack.map((p) => (
              <Card key={p.key} className={`tech-card ${p.is_qa_gate ? "border-primary/40" : p.is_live_mode_gate ? "border-amber-500/40" : ""}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">{String(p.order).padStart(2, "0")}</span>{p.title}
                    {p.is_qa_gate && <Badge variant="outline" className="text-[10px]">QA gate</Badge>}
                    {p.is_live_mode_gate && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">Live-mode gate</Badge>}
                    {p.founder_approval_required && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">Founder approval</Badge>}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">deps: {p.dependencies.length ? p.dependencies.join(", ") : "—"}</p>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p className="text-muted-foreground whitespace-pre-wrap">{p.body}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(p.acceptance_criteria).map(([k, v]) => (
                      <div key={k} className="border border-border/50 rounded p-2">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">{k.replace(/_/g, " ")}</p>
                        <p>{v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Test: {p.test_instruction}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
}