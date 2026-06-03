import { supabase } from "@/integrations/supabase/client";

const sb = () => supabase as any;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export type AFCategory =
  | "saas" | "ai" | "ecommerce" | "agency" | "app" | "marketplace"
  | "content" | "domain" | "brand" | "trademark" | "ip" | "distressed_retail" | "other";

export type AFDistressSignal =
  | "founder_exhausted" | "cash_shortage" | "poor_marketing" | "overbuilt_no_sales"
  | "liquidation" | "administration" | "bankruptcy" | "revenue_decline" | "unknown";

export type AFRecommendedAction =
  | "watch" | "investigate" | "prepare_offer" | "seek_funding" | "acquire" | "park" | "reject";

export type AFFunderType =
  | "seller_finance" | "hnw" | "family_office" | "micro_pe" | "independent_sponsor"
  | "search_fund_investor" | "strategic_partner" | "lender" | "revenue_based_finance"
  | "angel" | "internal_cash" | "other";

export type AFStructure =
  | "equity" | "debt" | "spv" | "seller_finance" | "earn_out"
  | "revenue_share" | "co_buy" | "convertible" | "other";

export type AFRiskAppetite = "low" | "medium" | "high";

export type AFFunderStatus = "not_contacted" | "warm" | "active" | "declined" | "invested" | "parked";

export type AFPitchStatus = "not_started" | "draft" | "ready_for_review" | "approved" | "sent";

export type AFApprovalStatus = "pending" | "approved" | "rejected" | "needs_adviser";

export type AFOpportunity = {
  id: string;
  opportunity_name: string;
  source: string | null;
  source_url: string | null;
  category: AFCategory;
  country: string | null;
  asking_price: number | null;
  revenue_ttm: number | null;
  profit_ttm: number | null;
  current_mrr: number | null;
  current_arr: number | null;
  customer_count: number | null;
  user_count: number | null;
  email_list_size: number | null;
  social_following: number | null;
  owner_reason_for_sale: string | null;
  distress_signal: AFDistressSignal;
  asset_quality_score: number | null;
  brand_value_score: number | null;
  liftor_fit_score: number | null;
  turnaround_potential_score: number | null;
  replacement_cost_score: number | null;
  legal_risk_score: number | null;
  overall_priority_score: number | null;
  liftor_operating_advantage: string | null;
  recommended_action: AFRecommendedAction;
  founder_approval_required: boolean;
  founder_approved: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AFFunder = {
  id: string;
  funder_name: string;
  funder_type: AFFunderType;
  contact_name: string | null;
  contact_email: string | null;
  contact_url: string | null;
  geography: string | null;
  preferred_deal_size_min: number | null;
  preferred_deal_size_max: number | null;
  preferred_asset_type: string | null;
  accepts_pre_revenue: boolean;
  accepts_loss_making: boolean;
  requires_profitability: boolean;
  preferred_structure: AFStructure;
  risk_appetite: AFRiskAppetite;
  status: AFFunderStatus;
  notes: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
};

export type AFDealStructure = {
  id: string;
  opportunity_id: string;
  total_purchase_price: number | null;
  cash_upfront: number | null;
  seller_finance_amount: number | null;
  deferred_payment_amount: number | null;
  earn_out_amount: number | null;
  revenue_share_terms: string | null;
  investor_equity_required: number | null;
  debt_required: number | null;
  spv_required: boolean;
  legal_review_required: boolean;
  tax_review_required: boolean;
  regulatory_risk: string | null;
  recommended_structure: string | null;
  founder_approval_status: AFApprovalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AFPitchPack = {
  id: string;
  opportunity_id: string;
  pitch_status: AFPitchStatus;
  acquisition_memo: string | null;
  investment_thesis: string | null;
  why_this_asset: string | null;
  why_now: string | null;
  distress_or_value_gap: string | null;
  liftor_advantage: string | null;
  ninety_day_relaunch_plan: string | null;
  twelve_month_growth_plan: string | null;
  funding_required: number | null;
  proposed_capital_stack: string | null;
  expected_return_routes: string | null;
  key_risks: string | null;
  due_diligence_required: string | null;
  funder_shortlist: string[];
  founder_approval_status: AFApprovalStatus;
  created_at: string;
  updated_at: string;
};

// ---------- Scoring ----------

export type AFScores = {
  asset_quality_score: number;
  brand_value_score: number;
  liftor_fit_score: number;
  turnaround_potential_score: number;
  replacement_cost_score: number;
  legal_risk_score: number; // higher = riskier
  overall_priority_score: number;
};

/**
 * Deterministic scoring. Liftor only seeks funding for acquisitions where it
 * has a clear operating advantage after acquisition — cheap alone is never enough.
 */
export function computeScores(o: Partial<AFOpportunity>): AFScores {
  const asset_quality_score = clamp(
    ((o.revenue_ttm ?? 0) > 0 ? 20 : 0) +
    ((o.profit_ttm ?? 0) > 0 ? 20 : 0) +
    ((o.current_mrr ?? 0) > 0 ? 20 : 0) +
    (Math.log10(Math.max(o.customer_count ?? 0, 1)) * 10) +
    ((o.user_count ?? 0) > 0 ? 10 : 0)
  );

  const brand_value_score = clamp(
    (Math.log10(Math.max(o.social_following ?? 0, 1)) * 10) +
    (Math.log10(Math.max(o.email_list_size ?? 0, 1)) * 10) +
    (o.category === "brand" || o.category === "trademark" ? 20 : 0) +
    (o.category === "domain" ? 15 : 0)
  );

  const liftor_fit_score = clamp(
    (o.liftor_operating_advantage ? 35 : 0) +
    (o.category && ["saas", "ai", "ecommerce", "agency", "app", "marketplace"].includes(o.category) ? 25 : 5) +
    ((o.current_mrr ?? 0) > 0 || (o.customer_count ?? 0) > 0 ? 20 : 0) +
    ((o.profit_ttm ?? 0) > 0 ? 10 : 0)
  );

  const turnaround_potential_score = clamp(
    (o.distress_signal === "founder_exhausted" ? 30 :
     o.distress_signal === "poor_marketing" ? 30 :
     o.distress_signal === "overbuilt_no_sales" ? 25 :
     o.distress_signal === "revenue_decline" ? 20 :
     o.distress_signal === "cash_shortage" ? 15 : 5) +
    (liftor_fit_score * 0.4)
  );

  const replacement_cost_score = clamp(
    (Math.log10(Math.max(o.customer_count ?? 0, 1)) * 12) +
    ((o.current_arr ?? 0) > 0 ? 25 : 0) +
    (o.category === "saas" || o.category === "ai" ? 25 : 10) +
    ((o.email_list_size ?? 0) > 1000 ? 15 : 0)
  );

  const legal_risk_score = clamp(
    (o.distress_signal === "bankruptcy" || o.distress_signal === "administration" || o.distress_signal === "liquidation" ? 50 : 10) +
    (!o.country ? 10 : 0) +
    (o.category === "trademark" || o.category === "ip" ? 15 : 0)
  );

  const overall_priority_score = clamp(
    liftor_fit_score * 0.30 +
    asset_quality_score * 0.15 +
    brand_value_score * 0.10 +
    turnaround_potential_score * 0.15 +
    replacement_cost_score * 0.10 +
    20 -
    legal_risk_score * 0.25
  );

  return {
    asset_quality_score, brand_value_score, liftor_fit_score,
    turnaround_potential_score, replacement_cost_score,
    legal_risk_score, overall_priority_score,
  };
}

export function recommendAction(o: Partial<AFOpportunity>, s: AFScores): AFRecommendedAction {
  if (s.legal_risk_score >= 70) return "reject";
  if (s.liftor_fit_score < 35) return "reject";
  if (s.overall_priority_score < 25) return "park";
  if (s.overall_priority_score < 45) return "watch";
  const need = (o.asking_price ?? 0);
  if (s.overall_priority_score >= 65 && need > 50_000) return "seek_funding";
  if (s.overall_priority_score < 65) return "investigate";
  if (s.overall_priority_score < 80) return "prepare_offer";
  return "acquire";
}

export function applyScoringDefaults(o: Partial<AFOpportunity>): Partial<AFOpportunity> {
  const s = computeScores(o);
  return {
    ...o,
    ...s,
    recommended_action: recommendAction(o, s),
  };
}

// ---------- Funder matching ----------

/**
 * Match an opportunity to candidate funders by deal size, asset preference,
 * profitability constraints, and structure compatibility. Pure function.
 */
export function matchFunders(o: Partial<AFOpportunity>, funders: AFFunder[]): AFFunder[] {
  const need = o.asking_price ?? 0;
  const isProfitable = (o.profit_ttm ?? 0) > 0;
  const hasRevenue = (o.revenue_ttm ?? 0) > 0 || (o.current_mrr ?? 0) > 0;
  return funders.filter(f => {
    if (f.status === "declined" || f.status === "parked") return false;
    if (f.requires_profitability && !isProfitable) return false;
    if (!f.accepts_pre_revenue && !hasRevenue) return false;
    if (!f.accepts_loss_making && !isProfitable && hasRevenue) return false;
    if (need > 0) {
      if (f.preferred_deal_size_min != null && need < f.preferred_deal_size_min) return false;
      if (f.preferred_deal_size_max != null && need > f.preferred_deal_size_max) return false;
    }
    if (f.preferred_asset_type && o.category &&
        !f.preferred_asset_type.toLowerCase().includes(o.category.toLowerCase())) {
      // soft filter: allow if "any" mentioned, else exclude
      if (!/any|all/i.test(f.preferred_asset_type)) return false;
    }
    return true;
  });
}

// ---------- UK regulatory flag ----------

/**
 * Any structure that pools external investors (SPV / syndicate / co-buy / equity raise)
 * must trigger legal + tax review and be founder-approval gated.
 */
export function requiresUKRegulatoryReview(d: Partial<AFDealStructure>): boolean {
  if (d.spv_required) return true;
  if ((d.investor_equity_required ?? 0) > 0) return true;
  return false;
}

export function stampRegulatoryFlags(d: Partial<AFDealStructure>): Partial<AFDealStructure> {
  const needs = requiresUKRegulatoryReview(d);
  return {
    ...d,
    legal_review_required: d.legal_review_required || needs,
    tax_review_required: d.tax_review_required || needs,
    regulatory_risk: needs
      ? (d.regulatory_risk ?? "UK: external investor pooling — FCA / FSMA financial promotion review required before any approach.")
      : d.regulatory_risk ?? null,
  };
}

// ---------- Pitch pack readiness ----------

export const PITCH_PACK_REQUIRED_FIELDS: (keyof AFPitchPack)[] = [
  "investment_thesis", "why_this_asset", "why_now", "liftor_advantage",
  "ninety_day_relaunch_plan", "twelve_month_growth_plan",
  "funding_required", "proposed_capital_stack", "expected_return_routes",
  "key_risks", "due_diligence_required",
];

export function pitchPackReadiness(p: Partial<AFPitchPack> | null): {
  ready: boolean; missing: string[]; status: AFPitchStatus;
} {
  if (!p) return { ready: false, missing: PITCH_PACK_REQUIRED_FIELDS.map(String), status: "not_started" };
  const missing = PITCH_PACK_REQUIRED_FIELDS.filter(k => {
    const v = (p as any)[k];
    return v == null || v === "" || (typeof v === "number" && v <= 0);
  }).map(String);
  return {
    ready: missing.length === 0,
    missing,
    status: missing.length === 0 ? "ready_for_review" : (p.pitch_status ?? "draft"),
  };
}

// ---------- Dashboard aggregation ----------

export type AFCommandSummary = {
  total_opportunities: number;
  top_opportunities: AFOpportunity[];
  assets_needing_funding: AFOpportunity[];
  best_seller_finance: AFOpportunity[];
  best_earn_out: AFOpportunity[];
  best_strategic_co_buyer: AFOpportunity[];
  best_family_office_hnw: AFOpportunity[];
  best_internal_cash: AFOpportunity[];
  needing_legal_review: AFOpportunity[];
  awaiting_founder_approval: AFOpportunity[];
  pitch_packs_ready: AFPitchPack[];
};

export function summariseAcquisitionFunding(
  opps: AFOpportunity[], pitches: AFPitchPack[],
): AFCommandSummary {
  const sorted = [...opps].sort((a, b) => (b.overall_priority_score ?? 0) - (a.overall_priority_score ?? 0));
  const live = sorted.filter(o => o.recommended_action !== "reject" && o.recommended_action !== "park");

  const isSellerFinanceFit = (o: AFOpportunity) =>
    o.distress_signal === "founder_exhausted" && (o.asking_price ?? 0) <= 500_000;
  const isEarnOutFit = (o: AFOpportunity) =>
    o.distress_signal === "revenue_decline" || o.distress_signal === "poor_marketing";
  const isCoBuyerFit = (o: AFOpportunity) =>
    (o.asking_price ?? 0) > 1_000_000 && (o.liftor_fit_score ?? 0) >= 50;
  const isFamilyOfficeFit = (o: AFOpportunity) =>
    (o.asking_price ?? 0) > 250_000 && (o.revenue_ttm ?? 0) > 0;
  const isInternalCashFit = (o: AFOpportunity) =>
    (o.asking_price ?? 0) <= 50_000 && (o.liftor_fit_score ?? 0) >= 50;

  return {
    total_opportunities: opps.length,
    top_opportunities: live.slice(0, 10),
    assets_needing_funding: live.filter(o => o.recommended_action === "seek_funding"),
    best_seller_finance: live.filter(isSellerFinanceFit).slice(0, 10),
    best_earn_out: live.filter(isEarnOutFit).slice(0, 10),
    best_strategic_co_buyer: live.filter(isCoBuyerFit).slice(0, 10),
    best_family_office_hnw: live.filter(isFamilyOfficeFit).slice(0, 10),
    best_internal_cash: live.filter(isInternalCashFit).slice(0, 10),
    needing_legal_review: live.filter(o => (o.legal_risk_score ?? 0) >= 50),
    awaiting_founder_approval: live.filter(o => o.founder_approval_required && !o.founder_approved),
    pitch_packs_ready: pitches.filter(p => p.pitch_status === "ready_for_review" || p.pitch_status === "approved"),
  };
}

// ---------- Labels ----------

export const ACTION_LABEL: Record<AFRecommendedAction, string> = {
  watch: "Watch", investigate: "Investigate", prepare_offer: "Prepare offer",
  seek_funding: "Seek funding", acquire: "Acquire (founder approval)",
  park: "Park", reject: "Reject",
};

export const FUNDER_TYPE_LABEL: Record<AFFunderType, string> = {
  seller_finance: "Seller finance",
  hnw: "HNW individual",
  family_office: "Family office",
  micro_pe: "Micro-PE",
  independent_sponsor: "Independent sponsor",
  search_fund_investor: "Search fund investor",
  strategic_partner: "Strategic partner",
  lender: "Lender",
  revenue_based_finance: "Revenue-based finance",
  angel: "Angel",
  internal_cash: "Internal cash",
  other: "Other",
};

export const STRUCTURE_LABEL: Record<AFStructure, string> = {
  equity: "Equity", debt: "Debt", spv: "SPV", seller_finance: "Seller finance",
  earn_out: "Earn-out", revenue_share: "Revenue share", co_buy: "Co-buy",
  convertible: "Convertible", other: "Other",
};

export function fmtMoney(n: number | null | undefined, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

// ---------- Data access ----------

export async function fetchOpportunities(): Promise<AFOpportunity[]> {
  const { data } = await sb().from("acquisition_funding_opportunities").select("*")
    .order("overall_priority_score", { ascending: false, nullsFirst: false });
  return (data ?? []) as AFOpportunity[];
}
export async function fetchOpportunity(id: string): Promise<AFOpportunity | null> {
  const { data } = await sb().from("acquisition_funding_opportunities").select("*").eq("id", id).maybeSingle();
  return data as AFOpportunity | null;
}
export async function upsertOpportunity(o: Partial<AFOpportunity> & { opportunity_name: string }) {
  const scored = applyScoringDefaults(o);
  const { data, error } = await sb().from("acquisition_funding_opportunities").upsert(scored).select().single();
  if (error) throw error;
  return data as AFOpportunity;
}
export async function deleteOpportunity(id: string) {
  const { error } = await sb().from("acquisition_funding_opportunities").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFunders(): Promise<AFFunder[]> {
  const { data } = await sb().from("acquisition_funding_sources").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as AFFunder[];
}
export async function upsertFunder(f: Partial<AFFunder> & { funder_name: string; funder_type: AFFunderType }) {
  const { data, error } = await sb().from("acquisition_funding_sources").upsert(f).select().single();
  if (error) throw error;
  return data as AFFunder;
}
export async function deleteFunder(id: string) {
  const { error } = await sb().from("acquisition_funding_sources").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDealStructures(opportunityId?: string): Promise<AFDealStructure[]> {
  let q = sb().from("acquisition_funding_deal_structures").select("*").order("updated_at", { ascending: false });
  if (opportunityId) q = q.eq("opportunity_id", opportunityId);
  const { data } = await q;
  return (data ?? []) as AFDealStructure[];
}
export async function upsertDealStructure(d: Partial<AFDealStructure> & { opportunity_id: string }) {
  const stamped = stampRegulatoryFlags(d);
  const { data, error } = await sb().from("acquisition_funding_deal_structures").upsert(stamped).select().single();
  if (error) throw error;
  return data as AFDealStructure;
}

export async function fetchPitchPacks(opportunityId?: string): Promise<AFPitchPack[]> {
  let q = sb().from("acquisition_funding_pitch_packs").select("*").order("updated_at", { ascending: false });
  if (opportunityId) q = q.eq("opportunity_id", opportunityId);
  const { data } = await q;
  return (data ?? []) as AFPitchPack[];
}
export async function upsertPitchPack(p: Partial<AFPitchPack> & { opportunity_id: string }) {
  const readiness = pitchPackReadiness(p);
  const next = { ...p, pitch_status: p.pitch_status ?? readiness.status };
  const { data, error } = await sb().from("acquisition_funding_pitch_packs").upsert(next).select().single();
  if (error) throw error;
  return data as AFPitchPack;
}