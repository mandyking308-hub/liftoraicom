// Liftor — Business Sales Target & Revenue Pace Engine.
// Pure calc + thin Supabase persistence helpers. Founder/admin RLS only.
// No external side effects.

import { supabase } from "@/integrations/supabase/client";

export type SalesTargetInput = {
  target_monthly_revenue: number;
  target_annual_revenue: number;
  target_mrr: number;
  target_arr: number;
  currency: string;
  average_order_value: number;
  subscription_price: number;
  conversion_rate: number;          // 0..1 (overall lead→sale fallback)
  lead_to_call_rate: number;        // 0..1
  call_to_sale_rate: number;        // 0..1
  churn_rate: number;               // 0..1 monthly
  gross_margin: number;             // 0..1
  sales_cycle_days: number;
  target_first_sale_date?: string | null;
  target_first_1k_date?: string | null;
  target_first_10k_month_date?: string | null;
  commercial_stage: "setup" | "test" | "launch" | "growth" | "scale";
  max_safe_outreach_per_day: number;
  founder_approval_required: boolean;
};

export type PaceResult = {
  sales_needed_month: number;
  sales_needed_week: number;
  sales_needed_day: number;
  leads_needed_month: number;
  leads_needed_week: number;
  leads_needed_day: number;
  revenue_gap: number;
  projected_mrr: number;
  projected_arr: number;
  current_month_revenue: number;
  current_mrr: number;
  current_arr: number;
  pace_status: "behind" | "on_track" | "ahead" | "not_ready";
  recommended_daily_action: string;
};

export function calculatePace(
  t: SalesTargetInput,
  current_month_revenue = 0,
  current_mrr = 0,
  current_arr = 0,
  pctMonthElapsed = monthPctElapsed(),
): PaceResult {
  const aov = Math.max(0, Number(t.average_order_value) || 0);
  const subPrice = Math.max(0, Number(t.subscription_price) || 0);
  const ticket = aov > 0 ? aov : subPrice;
  const target = Math.max(0, Number(t.target_monthly_revenue) || 0);

  const conv = clamp01(t.conversion_rate || (t.lead_to_call_rate * t.call_to_sale_rate) || 0);
  const sales_needed_month = ticket > 0 ? Math.ceil(target / ticket) : 0;
  const leads_needed_month = conv > 0 ? Math.ceil(sales_needed_month / conv) : 0;

  const sales_needed_week = +(sales_needed_month / 4.33).toFixed(2);
  const sales_needed_day = +(sales_needed_month / 30).toFixed(2);
  const leads_needed_week = +(leads_needed_month / 4.33).toFixed(2);
  const leads_needed_day = +(leads_needed_month / 30).toFixed(2);

  const revenue_gap = Math.max(0, target - current_month_revenue);

  // Projected MRR/ARR — naive: current MRR less churn, plus new subs from target.
  const churn = clamp01(t.churn_rate || 0);
  const new_subs_per_month = subPrice > 0 ? sales_needed_month : 0;
  const projected_mrr = Math.max(0, current_mrr * (1 - churn) + new_subs_per_month * subPrice);
  const projected_arr = Math.max(0, t.target_arr || projected_mrr * 12);

  // Pace status
  const expected = target * Math.min(1, Math.max(0, pctMonthElapsed));
  let pace_status: PaceResult["pace_status"] = "not_ready";
  if (target > 0) {
    const pace = expected > 0 ? current_month_revenue / expected : 1;
    if (current_month_revenue >= target) pace_status = "ahead";
    else if (pace >= 0.9) pace_status = "on_track";
    else pace_status = "behind";
  }

  const cur = (n: number) => `${t.currency || "GBP"} ${Math.round(n).toLocaleString()}`;
  let recommended_daily_action = "Set a monthly revenue target so Liftor knows what speed to operate at.";
  if (target > 0) {
    if (pace_status === "ahead") recommended_daily_action = "Target hit — protect margin, focus on retention and upsells.";
    else if (pace_status === "on_track") recommended_daily_action = `Maintain pace. Aim for ${Math.ceil(leads_needed_day)} qualified leads and ${Math.max(1, Math.round(sales_needed_day))} sales today.`;
    else recommended_daily_action = `Behind pace by ${cur(revenue_gap)}. Today: prepare ${Math.ceil(leads_needed_day)} qualified leads and ${Math.max(1, Math.round(sales_needed_day))} sales. Drafts only — no external sending without founder approval.`;
  }

  return {
    sales_needed_month,
    sales_needed_week,
    sales_needed_day,
    leads_needed_month,
    leads_needed_week,
    leads_needed_day,
    revenue_gap,
    projected_mrr,
    projected_arr,
    current_month_revenue,
    current_mrr,
    current_arr,
    pace_status,
    recommended_daily_action,
  };
}

function clamp01(n: number) { return Math.max(0, Math.min(1, Number(n) || 0)); }

export function monthPctElapsed(d = new Date()): number {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return (d.getTime() - start) / (end - start);
}

// --- Supabase helpers (founder/admin RLS only) -----------------------------

function isUuid(id: string | null | undefined): boolean {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function loadSalesTarget(businessId: string | null, draftName?: string) {
  try {
    const q = (supabase.from as any)("business_sales_targets").select("*").order("updated_at", { ascending: false }).limit(1);
    const { data } = isUuid(businessId) ? await q.eq("business_id", businessId) : await q.eq("draft_business_name", draftName ?? "");
    return (data as any[] | null)?.[0] ?? null;
  } catch { return null; }
}

export async function saveSalesTarget(businessId: string | null, draftName: string, input: SalesTargetInput) {
  try {
    const existing = await loadSalesTarget(businessId, draftName);
    const row: any = {
      ...input,
      business_id: isUuid(businessId) ? businessId : null,
      draft_business_name: isUuid(businessId) ? null : draftName,
    };
    if (existing?.id) {
      await (supabase.from as any)("business_sales_targets").update(row).eq("id", existing.id);
      return existing.id as string;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await (supabase.from as any)("business_sales_targets").insert({ ...row, created_by: user?.id ?? null }).select("id").single();
    return (data as any)?.id ?? null;
  } catch { return null; }
}

export async function savePaceCalculation(
  businessId: string | null,
  draftName: string,
  sales_target_id: string | null,
  p: PaceResult,
) {
  try {
    const row: any = {
      business_id: isUuid(businessId) ? businessId : null,
      draft_business_name: isUuid(businessId) ? null : draftName,
      sales_target_id,
      ...p,
      calculated_at: new Date().toISOString(),
    };
    await (supabase.from as any)("business_sales_pace_calculations").insert(row);
  } catch { /* tolerated */ }
}

export async function loadCurrentRevenueRollup(businessId: string | null) {
  // Aggregates business_revenue_events into MTD revenue, MRR, ARR.
  // MRR derived from subscription_created/renewed minus churn over last 30d.
  if (!isUuid(businessId)) return { mtd: 0, today: 0, yesterday: 0, mrr: 0, arr: 0, failed_payments: 0, refunds: 0, new_subs: 0, renewed_subs: 0, churned_subs: 0 };
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  try {
    const { data } = await (supabase.from as any)("business_revenue_events")
      .select("event_type, amount, occurred_at")
      .eq("business_id", businessId)
      .gte("occurred_at", since30);
    const rows: any[] = data || [];
    const isRev = (t: string) => ["payment_succeeded", "subscription_created", "subscription_renewed", "invoice_paid"].includes(t);
    let mtd = 0, today = 0, yesterday = 0, mrr = 0, refunds = 0, failed = 0;
    let new_subs = 0, renewed_subs = 0, churned_subs = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      const at = r.occurred_at;
      if (isRev(r.event_type)) {
        if (at >= startOfMonth) mtd += amt;
        if (at >= startOfDay) today += amt;
        else if (at >= startOfYesterday) yesterday += amt;
        if (["subscription_created", "subscription_renewed"].includes(r.event_type)) mrr += amt;
      }
      if (r.event_type === "subscription_created") new_subs += 1;
      if (r.event_type === "subscription_renewed") renewed_subs += 1;
      if (r.event_type === "churn") churned_subs += 1;
      if (r.event_type === "refund") refunds += 1;
      if (["subscription_failed", "invoice_failed"].includes(r.event_type)) failed += 1;
    }
    return { mtd, today, yesterday, mrr, arr: mrr * 12, failed_payments: failed, refunds, new_subs, renewed_subs, churned_subs };
  } catch {
    return { mtd: 0, today: 0, yesterday: 0, mrr: 0, arr: 0, failed_payments: 0, refunds: 0, new_subs: 0, renewed_subs: 0, churned_subs: 0 };
  }
}

export async function listSalesTargetsAll() {
  try {
    const { data } = await (supabase.from as any)("business_sales_targets").select("*").order("updated_at", { ascending: false }).limit(200);
    return (data as any[] | null) ?? [];
  } catch { return []; }
}

export async function listLatestPaceAll() {
  try {
    const { data } = await (supabase.from as any)("business_sales_pace_calculations").select("*").order("calculated_at", { ascending: false }).limit(500);
    return (data as any[] | null) ?? [];
  } catch { return []; }
}

export function commercialReadinessStatus(t: any | null, hasRevenueFeed: boolean): string {
  if (!t) return "no_target_set";
  if (!t.target_monthly_revenue || Number(t.target_monthly_revenue) <= 0) return "no_target_set";
  if (!t.average_order_value && !t.subscription_price) return "blocked_missing_offer_price";
  if (!t.conversion_rate && !(t.lead_to_call_rate && t.call_to_sale_rate)) return "blocked_missing_conversion_assumption";
  if (!hasRevenueFeed) return "blocked_missing_payment_feed";
  return "ready_for_test_sales";
}