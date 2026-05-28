import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListOrdered, Lock, CheckCircle2, ShieldAlert, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildHandoffPack,
  buildProductionPack,
  buildProductionPromptQueue,
  classifyProductionCandidate,
  computePromptQueueReadiness,
  detectPortfolioCollision,
  evaluateCapacityGate,
  evaluateKillRules,
  isLiveModeUnlocked,
  selectQuarterlyProduction,
  validateBuildPack,
  BUILD_PACK_VALIDATION_LABEL,
  PROMPT_QUEUE_FORBIDDEN,
  PRODUCTION_FOUNDER_APPROVAL_GATES,
  type ProductionBuildPack,
  type ProductionGateInput,
  type PromptQueueItem,
  type PromptQueueState,
  type PromptQueueStageKey,
} from "@/lib/fundingRadarEngine";

function currentQuarter() {
  const d = new Date();
  return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() };
}

function storageKey(packName: string) {
  return `liftor.production.prompt_queue.${packName.replace(/\W+/g, "_").toLowerCase()}`;
}

function loadState(packName: string): Partial<PromptQueueState> {
  try { return JSON.parse(localStorage.getItem(storageKey(packName)) || "{}") as Partial<PromptQueueState>; } catch { return {}; }
}
function saveState(packName: string, state: Partial<PromptQueueState>) {
  try { localStorage.setItem(storageKey(packName), JSON.stringify(state)); } catch { /* noop */ }
}

export default function PromptQueue() {
  const { quarter, year } = currentQuarter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [primaryPack, setPrimaryPack] = useState<ProductionBuildPack | null>(null);
  const [state, setState] = useState<Partial<PromptQueueState>>({});

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
      const pack = result.primary ? await mk(result.primary, result.primary.evaluation) : null;
      setPrimaryPack(pack);
      if (pack) setState(loadState(pack.candidate.name));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [quarter, year]);

  const validation = useMemo(() => validateBuildPack(primaryPack), [primaryPack]);
  const queue = useMemo(() => buildProductionPromptQueue(primaryPack), [primaryPack]);
  const readiness = useMemo(() => computePromptQueueReadiness(queue, validation, state), [queue, validation, state]);
  const liveUnlocked = useMemo(() => isLiveModeUnlocked(queue, state), [queue, state]);

  const update = (key: PromptQueueStageKey, patch: Partial<{ completed_at: string | null; notes: string; founder_approved: boolean }>) => {
    if (!primaryPack) return;
    const prev = state[key] ?? { completed_at: null, notes: "", founder_approved: false };
    const next: PromptQueueState[PromptQueueStageKey] = { ...prev, ...patch };
    const newState = { ...state, [key]: next };
    setState(newState);
    saveState(primaryPack.candidate.name, newState);
  };

  const copyPrompt = async (item: PromptQueueItem) => {
    const text = `# ${item.title}\n\n${item.body}\n\nAcceptance criteria:\n- What must be built: ${item.acceptance_criteria.what_must_be_built}\n- Where it appears: ${item.acceptance_criteria.where_it_appears}\n- Table/data: ${item.acceptance_criteria.table_or_data}\n- Links to modules: ${item.acceptance_criteria.links_to_modules}\n- What founder sees: ${item.acceptance_criteria.what_founder_sees}\n- Empty state: ${item.acceptance_criteria.empty_state}\n- Test proves it works: ${item.acceptance_criteria.test_proves_it_works}\n- Must remain blocked: ${item.acceptance_criteria.must_remain_blocked}\n\nTest: ${item.test_instruction}\n`;
    try { await navigator.clipboard.writeText(text); toast({ title: "Prompt copied", description: item.title }); } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/quarterly-production-machine" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Quarterly Production Machine
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1">
            <ListOrdered className="h-7 w-7 text-primary" /> Lovable Prompt Queue Controller
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Sequenced 14-stage Lovable prompt queue. Each stage enforces its dependencies, acceptance criteria, QA gate and live-mode founder approval. No outbound, no paid APIs, no public claims, no copying.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            <Badge variant="outline">Validation: {BUILD_PACK_VALIDATION_LABEL[validation.status]}</Badge>
            <Badge variant="outline" className={liveUnlocked ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}>
              {liveUnlocked ? "Live mode unlocked" : "Live mode locked"}
            </Badge>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px] ml-auto">
              <Link to="/founder/quarterly-production-machine/build-pack-validator">Re-validate pack →</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading queue…</p>
        ) : !primaryPack ? (
          <Card className="tech-card"><CardContent className="py-6 text-sm text-muted-foreground">
            No primary build pack this quarter. Open the Quarterly Production Machine to evaluate candidates first.
            <div className="mt-3"><Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine">Open production machine</Link></Button></div>
          </CardContent></Card>
        ) : validation.status !== "READY_FOR_PROMPT_QUEUE" ? (
          <Card className="tech-card border-amber-500/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /> Build pack not ready</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              <p className="text-muted-foreground">Validator status: {BUILD_PACK_VALIDATION_LABEL[validation.status]}. Resolve missing items before queueing prompts.</p>
              <ul className="space-y-1">
                {validation.blockers.slice(0, 8).map((b) => (<li key={b} className="flex items-start gap-2"><span className="text-amber-400">•</span>{b}</li>))}
              </ul>
              <Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine/build-pack-validator">Open validator →</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {readiness.map(({ item, readiness: r, missingDeps }) => {
              const s = state[item.key] ?? { completed_at: null, notes: "", founder_approved: false };
              const tone =
                r === "DONE" ? "border-emerald-500/40" :
                r === "READY" ? "border-primary/40" :
                r === "AWAITING_FOUNDER_APPROVAL" ? "border-amber-500/40" : "border-border/40";
              return (
                <Card key={item.key} className={`tech-card ${tone}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="text-muted-foreground">{String(item.order).padStart(2, "0")}</span>
                          {item.title}
                          {r === "DONE" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          {item.is_qa_gate && <Badge variant="outline" className="text-[10px]">QA gate</Badge>}
                          {item.is_live_mode_gate && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">Live-mode gate</Badge>}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {r === "BLOCKED_BY_DEPS" && missingDeps.length > 0 ? `Blocked by: ${missingDeps.join(", ")}` :
                           r === "AWAITING_FOUNDER_APPROVAL" ? "Awaiting founder approval" :
                           r === "READY" ? "Ready to run" : r === "DONE" ? `Completed ${s.completed_at ?? ""}` : "Blocked"}
                          {item.dependencies.length > 0 && ` · deps: ${item.dependencies.join(", ")}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyPrompt(item)}><Copy className="h-3 w-3 mr-1" />Copy prompt</Button>
                        {item.founder_approval_required && (
                          <Button size="sm" variant={s.founder_approved ? "default" : "outline"} onClick={() => update(item.key, { founder_approved: !s.founder_approved })}>
                            {s.founder_approved ? "Founder approved" : "Approve"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={s.completed_at ? "default" : "outline"}
                          disabled={r === "BLOCKED_BY_DEPS" || (item.founder_approval_required && !s.founder_approved && !s.completed_at)}
                          onClick={() => update(item.key, { completed_at: s.completed_at ? null : new Date().toISOString() })}
                        >
                          {s.completed_at ? "Mark not done" : "Mark complete"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Crit label="What must be built" v={item.acceptance_criteria.what_must_be_built} />
                      <Crit label="Where it appears" v={item.acceptance_criteria.where_it_appears} />
                      <Crit label="Table / data" v={item.acceptance_criteria.table_or_data} />
                      <Crit label="Links to Liftor modules" v={item.acceptance_criteria.links_to_modules} />
                      <Crit label="What founder sees" v={item.acceptance_criteria.what_founder_sees} />
                      <Crit label="Empty state" v={item.acceptance_criteria.empty_state} />
                      <Crit label="Test proves it works" v={item.acceptance_criteria.test_proves_it_works} />
                      <Crit label="Must remain blocked" v={item.acceptance_criteria.must_remain_blocked} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Test: {item.test_instruction}</p>
                    <textarea
                      className="w-full bg-background border border-border/50 rounded p-2 text-xs"
                      placeholder="Notes (optional)…"
                      value={s.notes ?? ""}
                      onChange={(e) => update(item.key, { notes: e.target.value })}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" /> Approval boundary</CardTitle></CardHeader>
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

function Crit({ label, v }: { label: string; v: string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <p className="text-xs">{v}</p>
    </div>
  );
}