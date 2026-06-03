import { supabase } from "@/integrations/supabase/client";

export type BusinessStatus = "idea" | "built" | "activated" | "live" | "paused" | "parked" | "sold";
export type RevenueModel = "recurring_subscription" | "retainer" | "transaction" | "marketplace" | "licence" | "hybrid" | "one_off";
export type ExitStage =
  | "built_no_revenue" | "activated" | "proof_10_25" | "operating_proof_50"
  | "exit_prep_100" | "buyer_mapping_150" | "sale_trigger_5m_usd"
  | "strong_threshold_5m_gbp" | "sale_ready_active";
export type LikelyExitRoute = "hold" | "licence" | "partnership" | "strategic_sale" | "marketplace_sale" | "PE_platform_sale" | "option_to_buy" | "not_ready";
export type EvidencePackStatus = "missing" | "partial" | "ready" | "verified";

export type PortfolioExitTarget = {
  id: string;
  business_id: string | null;
  business_name: string;
  business_status: BusinessStatus;
  revenue_model: RevenueModel;
  monthly_price_per_customer: number;
  current_active_customers: number;
  target_arr_usd: number | null;
  target_arr_gbp: number | null;
  gross_margin_percent: number | null;
  monthly_ai_cost: number;
  monthly_human_delivery_cost: number;
  monthly_other_operating_cost: number;
  churn_percent: number | null;
  customer_acquisition_cost: number | null;
  founder_dependency_score: number | null;
  ai_operated_score: number | null;
  repeatability_score: number | null;
  compliance_readiness_score: number | null;
  evidence_pack_status: EvidencePackStatus;
  buyer_fit_category: string | null;
  likely_exit_route: LikelyExitRoute;
  exit_stage: ExitStage;
  next_action: string | null;
  founder_approved: boolean;
  founder_override_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: string;
  gbp_usd_rate: number;
  default_target_arr_usd: number;
  default_target_arr_gbp: number;
  notes: string | null;
  updated_at: string;
};

export type Alert = {
  id: string;
  target_id: string;
  business_name: string;
  alert_code: string;
  alert_message: string;
  metric_value: number | null;
  triggered_at: string;
  acknowledged_at: string | null;
  notes: string | null;
};

const sb = () => supabase as any;

export async function fetchSettings(): Promise<Settings> {
  const { data } = await sb().from("portfolio_exit_target_settings").select("*").order("created_at").limit(1).maybeSingle();
  return data ?? { id: "", gbp_usd_rate: 1.27, default_target_arr_usd: 5_000_000, default_target_arr_gbp: 5_000_000, notes: null, updated_at: new Date().toISOString() };
}
export async function fetchTargets(): Promise<PortfolioExitTarget[]> {
  const { data } = await sb().from("portfolio_exit_targets").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as PortfolioExitTarget[];
}
export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await sb().from("portfolio_exit_target_alerts").select("*").order("triggered_at", { ascending: false });
  return (data ?? []) as Alert[];
}
export async function upsertTarget(t: Partial<PortfolioExitTarget> & { business_name: string }) {
  const { data, error } = await sb().from("portfolio_exit_targets").upsert(t).select().single();
  if (error) throw error;
  return data as PortfolioExitTarget;
}
export async function deleteTarget(id: string) {
  const { error } = await sb().from("portfolio_exit_targets").delete().eq("id", id);
  if (error) throw error;
}
export async function saveSettings(s: Partial<Settings>) {
  const { data, error } = await sb().from("portfolio_exit_target_settings").upsert(s).select().single();
  if (error) throw error;
  return data as Settings;
}
export async function ackAlert(id: string) {
  const { error } = await sb().from("portfolio_exit_target_alerts").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function insertAlertIfNew(row: Omit<Alert, "id" | "triggered_at" | "acknowledged_at"> & { triggered_at?: string }) {
  // Idempotent via UNIQUE(target_id, alert_code)
  await sb().from("portfolio_exit_target_alerts").upsert(row, { onConflict: "target_id,alert_code", ignoreDuplicates: true });
}

// === Pure computations ===

export type Computed = {
  mrr: number;
  arr: number;
  customers_needed_usd: number;
  customers_remaining_usd: number;
  progress_to_usd_percent: number;
  customers_needed_gbp: number;
  customers_remaining_gbp: number;
  progress_to_gbp_percent: number;
  estimated_monthly_profit: number;
  cac_payback_months: number | null;
  sale_readiness_score: number;
  derived_exit_stage: ExitStage;
  alerts_due: { code: string; message: string; value: number }[];
};

export function compute(t: PortfolioExitTarget, settings: Settings): Computed {
  const price = Number(t.monthly_price_per_customer) || 0;
  const customers = Number(t.current_active_customers) || 0;
  const mrr = price * customers;
  const arr = mrr * 12;

  const fx = Number(settings.gbp_usd_rate) || 1.27;
  const targetUsd = Number(t.target_arr_usd ?? settings.default_target_arr_usd) || 0;
  const targetGbp = Number(t.target_arr_gbp ?? settings.default_target_arr_gbp) || 0;

  // Convert ARR to USD/GBP for comparison. Assume price is in business native currency:
  // we treat ARR as native (no per-business currency field); compare directly. This keeps the
  // engine simple — founder can set both targets in matching units.
  const customers_needed_usd = price > 0 ? Math.ceil(targetUsd / (price * 12)) : 0;
  const customers_needed_gbp = price > 0 ? Math.ceil(targetGbp / (price * 12)) : 0;

  const progress_to_usd_percent = targetUsd > 0 ? Math.min(100, (arr / targetUsd) * 100) : 0;
  const progress_to_gbp_percent = targetGbp > 0 ? Math.min(100, (arr / targetGbp) * 100) : 0;

  const opex = (Number(t.monthly_ai_cost) || 0) + (Number(t.monthly_human_delivery_cost) || 0) + (Number(t.monthly_other_operating_cost) || 0);
  const grossProfit = mrr * ((Number(t.gross_margin_percent) || 100) / 100);
  const estimated_monthly_profit = grossProfit - opex;

  const cac = Number(t.customer_acquisition_cost ?? 0);
  const grossMonthlyPerCustomer = price * ((Number(t.gross_margin_percent) || 100) / 100);
  const cac_payback_months = cac > 0 && grossMonthlyPerCustomer > 0 ? cac / grossMonthlyPerCustomer : null;

  // Sale readiness — weighted across revenue, margin, churn, repeatability, compliance,
  // founder-dependency (inverted), AI-operated, evidence pack and buyer fit. Revenue alone is not enough.
  const norm = (v: number | null | undefined) => Math.max(0, Math.min(100, Number(v) || 0));
  const inv = (v: number | null | undefined) => 100 - norm(v);
  const churnScore = t.churn_percent == null ? 50 : Math.max(0, 100 - Number(t.churn_percent) * 10);
  const marginScore = norm(t.gross_margin_percent);
  const revenueScore = Math.min(100, progress_to_usd_percent);
  const evidenceScore = { missing: 0, partial: 40, ready: 75, verified: 100 }[t.evidence_pack_status] ?? 0;
  const sale_readiness_score = Math.round(
    revenueScore * 0.18 +
    marginScore * 0.12 +
    churnScore * 0.10 +
    norm(t.repeatability_score) * 0.12 +
    norm(t.compliance_readiness_score) * 0.10 +
    inv(t.founder_dependency_score) * 0.12 +
    norm(t.ai_operated_score) * 0.12 +
    evidenceScore * 0.10 +
    (t.buyer_fit_category ? 100 : 0) * 0.04
  );

  const derived_exit_stage = deriveStage(customers, arr, targetUsd, targetGbp, fx, t.business_status);

  const alerts_due = computeAlertsDue(customers, arr, targetUsd, targetGbp);

  return {
    mrr, arr,
    customers_needed_usd, customers_remaining_usd: Math.max(0, customers_needed_usd - customers),
    progress_to_usd_percent,
    customers_needed_gbp, customers_remaining_gbp: Math.max(0, customers_needed_gbp - customers),
    progress_to_gbp_percent,
    estimated_monthly_profit, cac_payback_months,
    sale_readiness_score, derived_exit_stage, alerts_due,
  };
}

export function deriveStage(customers: number, arr: number, targetUsd: number, targetGbp: number, _fx: number, status: BusinessStatus): ExitStage {
  if (status === "sold") return "sale_ready_active";
  if (arr >= targetGbp && targetGbp > 0) return "strong_threshold_5m_gbp";
  if (arr >= targetUsd && targetUsd > 0) return "sale_trigger_5m_usd";
  if (customers >= 150) return "buyer_mapping_150";
  if (customers >= 100) return "exit_prep_100";
  if (customers >= 50) return "operating_proof_50";
  if (customers >= 10) return "proof_10_25";
  if (status === "activated" || status === "live") return "activated";
  return "built_no_revenue";
}

export function computeAlertsDue(customers: number, arr: number, targetUsd: number, targetGbp: number) {
  const out: { code: string; message: string; value: number }[] = [];
  const milestones: Array<[number, string]> = [
    [10, "10 recurring customers reached — proof stage begins"],
    [25, "25 recurring customers reached — proof validated"],
    [50, "50 customers reached — operating proof"],
    [100, "100 customers reached — exit preparation should begin"],
    [150, "150 customers reached — strategic buyer mapping"],
  ];
  for (const [n, msg] of milestones) {
    if (customers >= n) out.push({ code: `customers_${n}`, message: msg, value: customers });
  }
  if (targetUsd > 0 && arr >= targetUsd * 0.75) out.push({ code: "arr_75pct_usd", message: "Reached 75% of $5m ARR equivalent", value: arr });
  if (targetUsd > 0 && arr >= targetUsd) out.push({ code: "arr_5m_usd", message: "Reached $5m ARR equivalent — sale/adviser trigger", value: arr });
  if (targetGbp > 0 && arr >= targetGbp) out.push({ code: "arr_5m_gbp", message: "Reached £5m ARR — strong sale threshold", value: arr });
  return out;
}

export const STAGE_META: Record<ExitStage, { label: string; cls: string }> = {
  built_no_revenue:       { label: "Built / no revenue",      cls: "bg-muted text-muted-foreground border-border/50" },
  activated:              { label: "Activated",               cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  proof_10_25:            { label: "Proof (10–25)",           cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  operating_proof_50:     { label: "Operating proof (50)",    cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  exit_prep_100:          { label: "Exit prep (100)",         cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  buyer_mapping_150:      { label: "Buyer mapping (150)",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  sale_trigger_5m_usd:    { label: "Sale trigger ($5m ARR)",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  strong_threshold_5m_gbp:{ label: "Strong (£5m ARR)",        cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  sale_ready_active:      { label: "Sale-ready / active",     cls: "bg-primary/15 text-primary border-primary/40" },
};

export function summarisePortfolio(targets: PortfolioExitTarget[], settings: Settings) {
  const computed = targets.map(t => ({ t, c: compute(t, settings) }));
  const total_mrr = computed.reduce((s, x) => s + x.c.mrr, 0);
  const total_arr = computed.reduce((s, x) => s + x.c.arr, 0);
  const activated = targets.filter(t => ["activated", "live"].includes(t.business_status)).length;
  const revenue_generating = computed.filter(x => x.c.mrr > 0).length;
  const in_proof = computed.filter(x => ["proof_10_25", "operating_proof_50"].includes(x.c.derived_exit_stage)).length;
  const in_exit_prep = computed.filter(x => ["exit_prep_100", "buyer_mapping_150"].includes(x.c.derived_exit_stage)).length;
  const near_sale_trigger = computed.filter(x => x.c.progress_to_usd_percent >= 75).length;
  const highest_potential = [...computed].sort((a, b) => b.c.sale_readiness_score - a.c.sale_readiness_score)[0]?.t ?? null;
  const fastest_moving = [...computed].sort((a, b) => b.c.progress_to_usd_percent - a.c.progress_to_usd_percent)[0]?.t ?? null;
  const best_ai_margin = [...computed].sort((a, b) => (b.t.ai_operated_score ?? 0) * (b.t.gross_margin_percent ?? 0) - (a.t.ai_operated_score ?? 0) * (a.t.gross_margin_percent ?? 0))[0]?.t ?? null;
  const needs_attention = [...computed].sort((a, b) => a.c.sale_readiness_score - b.c.sale_readiness_score).find(x => x.t.business_status !== "sold" && x.t.business_status !== "parked")?.t ?? null;
  return {
    total_mrr, total_arr, activated, revenue_generating, in_proof, in_exit_prep, near_sale_trigger,
    highest_potential, fastest_moving, best_ai_margin, needs_attention, total: targets.length,
  };
}

export function fmtMoney(n: number, currency: "USD" | "GBP" = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
}

export async function syncAlertsForTarget(t: PortfolioExitTarget, settings: Settings) {
  const c = compute(t, settings);
  for (const a of c.alerts_due) {
    await insertAlertIfNew({
      target_id: t.id, business_name: t.business_name,
      alert_code: a.code, alert_message: a.message, metric_value: a.value, notes: null,
    });
  }
}