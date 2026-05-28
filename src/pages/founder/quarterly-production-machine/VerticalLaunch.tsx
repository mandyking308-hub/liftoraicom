import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, Lock, ShieldAlert, CheckCircle2, AlertTriangle, Target, Mail, Users, ListChecks, BarChart3, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHandoffPack,
  buildProductionPack,
  buildVerticalLaunchPack,
  classifyProductionCandidate,
  detectPortfolioCollision,
  evaluateCapacityGate,
  evaluateHardLaunchGates,
  evaluateKillRules,
  selectQuarterlyProduction,
  validateBuildPack,
  LAUNCH_MODE_LABEL,
  VERTICAL_LAUNCH_FOUNDER_APPROVAL_GATES,
  VERTICAL_LAUNCH_HARD_GATES,
  VERTICAL_LAUNCH_NEVER_AUTOMATIC,
  type HardLaunchGateInput,
  type LaunchMode,
  type ProductionBuildPack,
  type ProductionGateInput,
  type VerticalLaunchPack,
} from "@/lib/fundingRadarEngine";

function currentQuarter() { const d = new Date(); return { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() }; }

const DEFAULT_GATES: HardLaunchGateInput = {
  production_qa_passed: false,
  legal_pages_present: false,
  no_copied_assets: true,
  analytics_live: false,
  crm_pipeline_live: false,
  support_route_live: false,
  onboarding_route_live: false,
  founder_approval_granted: false,
  sending_domain_approved_if_outreach: false,
  outreach_used: false,
  suppression_rules_active: true,
  paid_apis_off_or_approved: true,
  no_public_regulated_claims: true,
};

const STORAGE = (key: string) => `liftor.vertical_launch.${key}`;

export default function VerticalLaunch() {
  const { quarter, year } = currentQuarter();
  const [loading, setLoading] = useState(true);
  const [pack, setPack] = useState<ProductionBuildPack | null>(null);
  const [vertical, setVertical] = useState<string>("");
  const [geography, setGeography] = useState<string>("");
  const [customerType, setCustomerType] = useState<string>("");
  const [buyerRole, setBuyerRole] = useState<string>("");
  const [gates, setGates] = useState<HardLaunchGateInput>(DEFAULT_GATES);
  const [mode, setMode] = useState<LaunchMode>("PREPARING");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE("state")) || "{}");
      if (s.vertical) setVertical(s.vertical);
      if (s.geography) setGeography(s.geography);
      if (s.customerType) setCustomerType(s.customerType);
      if (s.buyerRole) setBuyerRole(s.buyerRole);
      if (s.gates) setGates({ ...DEFAULT_GATES, ...s.gates });
      if (s.mode) setMode(s.mode);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE("state"), JSON.stringify({ vertical, geography, customerType, buyerRole, gates, mode }));
  }, [vertical, geography, customerType, buyerRole, gates, mode]);

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
        const killHits = evaluateKillRules({
          recurring_revenue_score: shortlist?.recurring_revenue_score ?? null,
          willingness_to_pay_evidence_score: shortlist?.willingness_to_pay_evidence_score ?? null,
          legal_ip_safety_score: shortlist?.legal_ip_safety_score ?? null,
          market_recommendation: market?.recommended_entry_strategy ?? null,
        } as any);
        const capacity = evaluateCapacityGate({ current_quarter_active_builds: cands.filter((c: any) => c.recommendation_status === "selected").length });
        const collision = detectPortfolioCollision({ name: cand.candidate_name, sector: company?.sector ?? null, cluster: cluster?.cluster_name ?? null }, (portfolio ?? []).map((p: any) => ({ id: p.id, name: p.asset_name, sector: p.sector, description: p.description, tags: p.tags })));
        return { candidate: cand, shortlist, market, killHits, capacity, collision } as ProductionGateInput;
      }));
      const result = selectQuarterlyProduction(inputs);
      if (result.primary) {
        const c = result.primary.candidate;
        const [{ data: shortlist }, { data: company }, { data: cluster }] = await Promise.all([
          c.funding_shortlist_id ? sb.from("funding_shortlist").select("*").eq("id", c.funding_shortlist_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_company_id ? sb.from("funding_radar_companies").select("*").eq("id", c.funding_company_id).maybeSingle() : Promise.resolve({ data: null }),
          c.funding_cluster_id ? sb.from("funding_problem_clusters").select("*").eq("id", c.funding_cluster_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        const handoff = buildHandoffPack({ candidate: c as any, shortlist, company, cluster, distribution: null });
        setPack(buildProductionPack({ gate: result.primary, evaluation: result.primary.evaluation, handoff }));
      }
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [quarter, year]);

  const validation = useMemo(() => validateBuildPack(pack), [pack]);
  const launchPack: VerticalLaunchPack | null = useMemo(() => pack ? buildVerticalLaunchPack({
    pack, vertical: vertical || null, geography: geography || null, customer_type: customerType || null, buyer_role: buyerRole || null,
  }) : null, [pack, vertical, geography, customerType, buyerRole]);
  const gateEval = useMemo(() => evaluateHardLaunchGates(gates), [gates]);

  const canPromoteToReady = gateEval.ok && validation.status === "READY_FOR_PROMPT_QUEUE";
  const canGoLive = canPromoteToReady && gates.founder_approval_granted && mode === "READY_FOR_HARD_LAUNCH";

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <Link to="/founder/quarterly-production-machine" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Quarterly Production Machine</Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><Rocket className="h-7 w-7 text-primary" /> Vertical Launch Cannon · 30-Day Revenue Strike Plan</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Controlled hard launch into one chosen vertical. No soft launch. Build fast · QA hard · Launch clean · Hit one vertical · Measure daily · Fix fast · Push again. Every external action remains gated by founder approval.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Q{quarter} {year}</Badge>
            <Badge variant="outline" className={canGoLive ? "border-emerald-500/40 text-emerald-300" : canPromoteToReady ? "border-primary/40 text-primary" : "border-amber-500/40 text-amber-300"}>{LAUNCH_MODE_LABEL[mode]}</Badge>
            <Badge variant="outline">Build pack: {validation.presentCount}/{validation.totalCount}</Badge>
            <Badge variant="outline" className={gateEval.ok ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}>{gateEval.ok ? "Hard launch gates met" : `${gateEval.missing.length} gate(s) missing`}</Badge>
          </div>
        </div>

        {loading && <p className="text-xs text-muted-foreground">Loading primary build pack…</p>}
        {!loading && !launchPack && (
          <Card className="tech-card"><CardContent className="py-6 text-sm text-muted-foreground">No primary production build pack this quarter. Promote a candidate in the Quarterly Production Machine first.</CardContent></Card>
        )}

        {launchPack && (
          <>
            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 1 · Launch Target</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <Field label="Selected business" value={launchPack.launch_target.business_name} />
                <Field label="Vertical" value={<input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder={launchPack.launch_target.vertical} className="bg-transparent border border-border/50 rounded px-2 py-1 w-full" />} />
                <Field label="Geography" value={<input value={geography} onChange={(e) => setGeography(e.target.value)} placeholder={launchPack.launch_target.geography} className="bg-transparent border border-border/50 rounded px-2 py-1 w-full" />} />
                <Field label="Customer type" value={<input value={customerType} onChange={(e) => setCustomerType(e.target.value)} placeholder={launchPack.launch_target.customer_type} className="bg-transparent border border-border/50 rounded px-2 py-1 w-full" />} />
                <Field label="Buyer role" value={<input value={buyerRole} onChange={(e) => setBuyerRole(e.target.value)} placeholder={launchPack.launch_target.buyer_role} className="bg-transparent border border-border/50 rounded px-2 py-1 w-full" />} />
                <Field label="First 100–500 prospect profile" value={launchPack.launch_target.prospect_profile_first_100_500} />
                <Field label="Why vertical was selected" value={launchPack.launch_target.why_vertical_selected} />
                <Field label="Why this vertical has budget" value={launchPack.launch_target.why_vertical_has_budget} />
                <Field label="Why the problem is urgent" value={launchPack.launch_target.why_problem_urgent} />
                <Field label="Why Liftor has advantage" value={launchPack.launch_target.why_liftor_advantage} />
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> 2 · Launch Offer</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <Field label="First offer" value={launchPack.launch_offer.first_offer} />
                <Field label="Pricing hypothesis" value={launchPack.launch_offer.pricing_hypothesis} />
                <Field label="Pilot option" value={launchPack.launch_offer.pilot_option} />
                <Field label="Paid starter package" value={launchPack.launch_offer.paid_starter_package} />
                <Field label="Guarantee / disclaimer limits" value={launchPack.launch_offer.guarantee_disclaimer_limits} />
                <Field label="Urgency angle" value={launchPack.launch_offer.urgency_angle} />
                <Field label="Trust angle" value={launchPack.launch_offer.trust_angle} />
                <Field label="Proof required" value={launchPack.launch_offer.proof_required} />
                <p className="md:col-span-2 text-[11px] text-amber-300 flex items-center gap-2"><Lock className="h-3 w-3" /> Founder approval required before any public use of this offer.</p>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> 3 · Launch Assets (drafts only)</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-3">
                <List label="Landing CTA options" items={launchPack.launch_assets.landing_cta_options} />
                <List label="Headlines" items={launchPack.launch_assets.vertical_headlines} />
                <List label="Problem copy" items={launchPack.launch_assets.problem_copy} />
                <List label="Solution copy" items={launchPack.launch_assets.solution_copy} />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">FAQ</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {launchPack.launch_assets.faq.map((f, i) => (
                      <div key={i} className="border border-border/50 rounded p-2"><p className="font-medium">{f.q}</p><p className="text-muted-foreground">{f.a}</p></div>
                    ))}
                  </div>
                </div>
                <Field label="Pricing placeholder" value={launchPack.launch_assets.pricing_placeholder} />
                <List label="Trust section" items={launchPack.launch_assets.trust_section} />
                <Field label="Onboarding form copy" value={launchPack.launch_assets.onboarding_form_copy} />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Outbound email sequence (draft · approval-gated)</p>
                  <div className="space-y-2">
                    {launchPack.launch_assets.outbound_email_sequence.map((e) => (
                      <div key={e.step} className="border border-border/50 rounded p-2">
                        <p className="font-medium">Step {e.step} · {e.subject}</p>
                        <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground mt-1">{e.body}</pre>
                      </div>
                    ))}
                  </div>
                </div>
                <List label="LinkedIn/message drafts" items={launchPack.launch_assets.linkedin_message_drafts} />
                <List label="Follow-up drafts" items={launchPack.launch_assets.follow_up_drafts} />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Objection handling</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {launchPack.launch_assets.objection_handling.map((o, i) => (
                      <div key={i} className="border border-border/50 rounded p-2"><p className="font-medium">{o.objection}</p><p className="text-muted-foreground">{o.response}</p></div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Support replies</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {launchPack.launch_assets.support_replies.map((r, i) => (
                      <div key={i} className="border border-border/50 rounded p-2"><p className="font-medium">{r.scenario}</p><p className="text-muted-foreground">{r.reply}</p></div>
                    ))}
                  </div>
                </div>
                <List label="Demo script" items={launchPack.launch_assets.demo_script} />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Copy rules</p>
                  <div className="flex flex-wrap gap-1">
                    {launchPack.launch_assets.copy_rules.map((r, i) => (<Badge key={i} variant="outline" className="text-[10px]">{r}</Badge>))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 4 · Prospecting Plan</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-3">
                <List label="Ideal prospect criteria" items={launchPack.prospecting_plan.ideal_prospect_criteria} />
                <List label="First 100 route" items={launchPack.prospecting_plan.first_100_route} />
                <List label="First 500 route" items={launchPack.prospecting_plan.first_500_route} />
                <List label="Allowed public sources" items={launchPack.prospecting_plan.allowed_public_sources} />
                <List label="Disallowed sources" items={launchPack.prospecting_plan.disallowed_sources} />
                <List label="Enrichment fields" items={launchPack.prospecting_plan.enrichment_fields} />
                <List label="CRM import template columns" items={launchPack.prospecting_plan.crm_import_template_columns} />
                <List label="Suppression rules" items={launchPack.prospecting_plan.suppression_rules} />
                <p className="text-[11px] text-amber-300 flex items-center gap-2"><Lock className="h-3 w-3" /> {launchPack.prospecting_plan.approval_gate_before_outreach}</p>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> 5 · CRM Launch Pipeline</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex flex-wrap gap-1">
                  {launchPack.crm_pipeline.stages.map((s) => (<Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>))}
                </div>
                <p className="text-muted-foreground">{launchPack.crm_pipeline.ownership}</p>
                <List label="Approval gates" items={launchPack.crm_pipeline.approval_gates} />
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> 6 · 30-Day Revenue Strike Plan</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {launchPack.revenue_strike_plan.map((d) => (
                    <div key={d.day} className="border border-border/50 rounded p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">Day {d.day} · {d.phase}</p>
                        {d.founder_approval_required && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">approval</Badge>}
                      </div>
                      <p className="text-muted-foreground mt-1">{d.focus}</p>
                      <ul className="mt-1 space-y-0.5">{d.outputs.map((o, i) => (<li key={i} className="flex items-start gap-1"><span className="text-primary">•</span>{o}</li>))}</ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> 7 · Daily Launch Command Centre</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <div className="flex flex-wrap gap-1">
                  {launchPack.daily_command_centre_fields.map((f) => (<Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>))}
                </div>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> 8 · Launch Velocity Metrics (template)</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(launchPack.velocity_metrics_template).map(([k, v]) => (
                    <div key={k} className="border border-border/50 rounded p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, " ")}</p>
                      <p>{v == null ? "—" : String(v)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> 9 · Hard Launch Gates</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {([
                    ["production_qa_passed", "Production QA passed"],
                    ["legal_pages_present", "Legal pages present"],
                    ["no_copied_assets", "No copied competitor assets"],
                    ["analytics_live", "Analytics live"],
                    ["crm_pipeline_live", "CRM pipeline live"],
                    ["support_route_live", "Support route live"],
                    ["onboarding_route_live", "Onboarding route live"],
                    ["founder_approval_granted", "Founder approval granted"],
                    ["outreach_used", "Outreach used in this launch"],
                    ["sending_domain_approved_if_outreach", "Sending domain/email approved (if outreach)"],
                    ["suppression_rules_active", "Suppression rules active"],
                    ["paid_apis_off_or_approved", "No paid APIs unless founder approved"],
                    ["no_public_regulated_claims", "No public regulated claims"],
                  ] as Array<[keyof HardLaunchGateInput, string]>).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 border border-border/50 rounded p-2 cursor-pointer">
                      <input type="checkbox" checked={!!gates[k]} onChange={(e) => setGates({ ...gates, [k]: e.target.checked })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {!gateEval.ok && (
                  <div className="border border-amber-500/40 rounded p-2 text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5" />
                    <div>Missing: {gateEval.missing.join(", ")}</div>
                  </div>
                )}
                {gateEval.ok && <p className="text-emerald-300 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> All hard launch gates met.</p>}
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> 10 · Launch Mode (no soft launch)</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(["PREPARING","READY_FOR_HARD_LAUNCH","HARD_LAUNCH_LIVE","ADJUSTING","PAUSED","PARKED","KILLED","SCALING"] as LaunchMode[]).map((m) => (
                    <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} className="h-7 text-[11px]" disabled={
                      (m === "READY_FOR_HARD_LAUNCH" && !canPromoteToReady) ||
                      (m === "HARD_LAUNCH_LIVE" && !canGoLive)
                    } onClick={() => setMode(m)}>{LAUNCH_MODE_LABEL[m]}</Button>
                  ))}
                </div>
                <p className="text-muted-foreground">Only "Controlled hard launch" terminology is used. "Soft launch" is intentionally not a mode.</p>
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" /> 11 · Vertical Feedback Loop · 12 · Approval Boundaries</CardTitle></CardHeader>
              <CardContent className="text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Feeds back into</p>
                  <ul className="space-y-1">{launchPack.feedback_loop_targets.map((f) => (<li key={f}>• {f}</li>))}</ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Founder approval required before</p>
                  <ul className="space-y-1">{VERTICAL_LAUNCH_FOUNDER_APPROVAL_GATES.map((g) => (<li key={g} className="flex items-start gap-2"><span className="text-amber-400">•</span>{g}</li>))}</ul>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Never automatic</p>
                  <div className="flex flex-wrap gap-1">{VERTICAL_LAUNCH_NEVER_AUTOMATIC.map((n) => (<Badge key={n} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{n}</Badge>))}</div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Hard launch gate list (reference)</p>
                  <div className="flex flex-wrap gap-1">{VERTICAL_LAUNCH_HARD_GATES.map((g) => (<Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>))}</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link to="/founder/launch-factory/vertical-launch-cannon"><Rocket className="h-3 w-3 mr-1" />Open in Launch Factory</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to="/founder/launch-factory">Launch Factory checklist →</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine/prompt-queue">Prompt Queue →</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to="/founder/quarterly-production-machine/build-pack-validator">Build Pack Validator →</Link></Button>
            </div>
          </>
        )}
      </div>
    </FounderLayout>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <div className="text-xs">{value}</div>
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-0.5 text-xs">{items.map((i, idx) => (<li key={idx} className="flex items-start gap-1"><span className="text-primary">•</span>{i}</li>))}</ul>
    </div>
  );
}