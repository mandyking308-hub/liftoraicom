import { supabase } from "@/integrations/supabase/client";

export type PriorityDecision =
  | "build_now" | "operate" | "scale" | "watch"
  | "pause" | "park" | "kill_review" | "exit_prepare";

export type PriorityScore = {
  id: string;
  business_id: string;
  score_period_start: string;
  score_period_end: string;
  revenue_potential_score: number;
  speed_to_revenue_score: number;
  buildability_score: number;
  ai_operability_score: number;
  margin_score: number;
  compliance_risk_score: number;
  exit_potential_score: number;
  founder_attention_required_score: number;
  cash_required_score: number;
  market_signal_score: number;
  total_priority_score: number;
  recommended_decision: PriorityDecision;
  reason_summary: string | null;
  created_at: string;
  audit_metadata: Record<string, unknown>;
};

export type PriorityDecisionRow = {
  id: string;
  business_id: string;
  decision_type: PriorityDecision;
  decision_status: "recommended" | "founder_review" | "approved" | "rejected" | "implemented";
  reason: string | null;
  expected_impact: string | null;
  founder_approved_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Signals fed to the scorer. All 0-10 unless noted. */
export type ScoringSignals = {
  business_id: string;
  current_revenue: number;       // monthly £
  pipeline_value: number;         // £
  setup_completeness: number;     // 0-10
  ai_cost: number;                // monthly £
  margin_pct: number;             // 0-100
  customer_demand: number;        // 0-10
  marketplace_liquidity: number;  // 0-10
  compliance_risk: number;        // 0-10 (10 = highest risk)
  delivery_capacity: number;      // 0-10
  exit_fit: number;               // 0-10
  founder_attention_required: number; // 0-10 (10 = needs a lot)
  cash_required: number;          // 0-10 (10 = expensive)
  speed_to_launch: number;        // 0-10 (10 = fast)
};

const clamp = (n: number, min = 0, max = 10) => Math.max(min, Math.min(max, n));

/** Map raw signals to 0-10 sub-scores. */
export function computeSubscores(s: ScoringSignals) {
  const revenue_potential_score = clamp((s.pipeline_value / 10000) + (s.current_revenue / 5000));
  const speed_to_revenue_score = clamp(s.speed_to_launch);
  const buildability_score = clamp(s.setup_completeness);
  const ai_operability_score = clamp(10 - (s.ai_cost / 200));
  const margin_score = clamp(s.margin_pct / 10);
  const compliance_risk_score = clamp(10 - s.compliance_risk); // higher = safer
  const exit_potential_score = clamp(s.exit_fit);
  const founder_attention_required_score = clamp(10 - s.founder_attention_required); // higher = less attention
  const cash_required_score = clamp(10 - s.cash_required); // higher = cheaper
  const market_signal_score = clamp((s.customer_demand + s.marketplace_liquidity) / 2);

  // Weighted total (0-10)
  const total_priority_score =
    (revenue_potential_score * 0.18) +
    (speed_to_revenue_score * 0.10) +
    (buildability_score * 0.10) +
    (ai_operability_score * 0.08) +
    (margin_score * 0.12) +
    (compliance_risk_score * 0.08) +
    (exit_potential_score * 0.06) +
    (founder_attention_required_score * 0.08) +
    (cash_required_score * 0.06) +
    (market_signal_score * 0.14);

  return {
    revenue_potential_score, speed_to_revenue_score, buildability_score,
    ai_operability_score, margin_score, compliance_risk_score,
    exit_potential_score, founder_attention_required_score,
    cash_required_score, market_signal_score,
    total_priority_score: Number(total_priority_score.toFixed(2)),
  };
}

export function recommendDecision(sub: ReturnType<typeof computeSubscores>, signals: ScoringSignals): { decision: PriorityDecision; reason: string } {
  const t = sub.total_priority_score;
  if (signals.compliance_risk >= 9) return { decision: "kill_review", reason: "Compliance risk extreme — review continued operation." };
  if (t >= 8 && signals.current_revenue >= 5000) return { decision: "scale", reason: "High score with proven revenue — scale investment." };
  if (t >= 7 && signals.setup_completeness < 5) return { decision: "build_now", reason: "Strong opportunity but setup incomplete — finish build first." };
  if (t >= 6) return { decision: "operate", reason: "Healthy score — keep operating with current cadence." };
  if (t >= 4) return { decision: "watch", reason: "Mid score — monitor weekly before increasing investment." };
  if (signals.exit_fit >= 7) return { decision: "exit_prepare", reason: "Weak operationally but strong acquirer fit — prepare exit pack." };
  if (t < 3 && signals.current_revenue < 500) return { decision: "park", reason: "Low score with no revenue — park and reclaim founder time." };
  return { decision: "pause", reason: "Underperforming — pause until signals improve." };
}

const sb = () => supabase as any;

export async function fetchScores(): Promise<PriorityScore[]> {
  const { data, error } = await sb().from("portfolio_priority_scores").select("*").order("total_priority_score", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchDecisions(): Promise<PriorityDecisionRow[]> {
  const { data, error } = await sb().from("portfolio_priority_decisions").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function scoreBusiness(signals: ScoringSignals): Promise<PriorityScore> {
  const sub = computeSubscores(signals);
  const rec = recommendDecision(sub, signals);
  const row = {
    business_id: signals.business_id,
    ...sub,
    recommended_decision: rec.decision,
    reason_summary: rec.reason,
    audit_metadata: { signals },
  };
  const { data, error } = await sb().from("portfolio_priority_scores").insert(row).select().single();
  if (error) throw error; return data as PriorityScore;
}

export async function createDecision(input: {
  business_id: string; decision_type: PriorityDecision; reason?: string; expected_impact?: string;
}): Promise<PriorityDecisionRow> {
  const row = {
    business_id: input.business_id,
    decision_type: input.decision_type,
    decision_status: "founder_review" as const,
    reason: input.reason ?? null,
    expected_impact: input.expected_impact ?? null,
  };
  const { data, error } = await sb().from("portfolio_priority_decisions").insert(row).select().single();
  if (error) throw error; return data as PriorityDecisionRow;
}

export function latestScorePerBusiness(scores: PriorityScore[]): PriorityScore[] {
  const map = new Map<string, PriorityScore>();
  for (const s of scores) {
    const existing = map.get(s.business_id);
    if (!existing || new Date(s.created_at) > new Date(existing.created_at)) map.set(s.business_id, s);
  }
  return Array.from(map.values()).sort((a,b) => b.total_priority_score - a.total_priority_score);
}

export function summarize(scores: PriorityScore[], decisions: PriorityDecisionRow[]) {
  const latest = latestScorePerBusiness(scores);
  const byDecision = (d: PriorityDecision) => latest.filter(s => s.recommended_decision === d).length;
  return {
    businesses_scored: latest.length,
    build_now: byDecision("build_now"),
    scale: byDecision("scale"),
    operate: byDecision("operate"),
    watch: byDecision("watch"),
    pause: byDecision("pause"),
    park: byDecision("park"),
    kill_review: byDecision("kill_review"),
    exit_prepare: byDecision("exit_prepare"),
    avg_score: latest.length ? Number((latest.reduce((a,s) => a + s.total_priority_score, 0) / latest.length).toFixed(2)) : 0,
    pending_decisions: decisions.filter(d => d.decision_status === "founder_review" || d.decision_status === "recommended").length,
  };
}

export function diagnose(scores: PriorityScore[]) {
  const out: Array<{ business_id: string; severity: "info"|"warn"|"block"; message: string }> = [];
  const latest = latestScorePerBusiness(scores);
  for (const s of latest) {
    if (s.recommended_decision === "kill_review") out.push({ business_id: s.business_id, severity: "block", message: "Kill review recommended — founder approval required." });
    if (s.recommended_decision === "exit_prepare") out.push({ business_id: s.business_id, severity: "warn", message: "Exit-prepare flagged — adviser review before any buyer contact." });
    if (s.founder_attention_required_score <= 3) out.push({ business_id: s.business_id, severity: "warn", message: "High founder attention required — distraction risk." });
    if (s.compliance_risk_score <= 3) out.push({ business_id: s.business_id, severity: "block", message: "Compliance risk high — review before external action." });
  }
  return out;
}

export const DECISION_META: Record<PriorityDecision, { label: string; cls: string }> = {
  build_now: { label: "Build now", cls: "bg-primary/15 text-primary border-primary/30" },
  scale: { label: "Scale", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  operate: { label: "Operate", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  watch: { label: "Watch", cls: "bg-muted text-muted-foreground border-border/50" },
  pause: { label: "Pause", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  park: { label: "Park", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  kill_review: { label: "Kill review", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  exit_prepare: { label: "Exit prepare", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
};