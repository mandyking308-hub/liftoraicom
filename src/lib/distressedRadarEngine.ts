import { supabase } from "@/integrations/supabase/client";

export type Category =
  | "saas" | "ai" | "ecommerce" | "agency" | "app" | "marketplace"
  | "content" | "domain" | "brand" | "trademark" | "ip" | "distressed_retail" | "other";

export type DistressType =
  | "founder_exhausted" | "cash_shortage" | "liquidation" | "administration"
  | "bankruptcy" | "revenue_decline" | "overbuilt_no_sales" | "codebase_only"
  | "brand_ip_sale" | "turnaround" | "unknown";

export type RecommendedStructure =
  | "cash_purchase" | "seller_finance" | "earn_out" | "revenue_share"
  | "spv" | "investor_partner" | "debt" | "do_not_buy";

export type RecommendedAction =
  | "watch" | "investigate" | "bid_ready" | "finance_needed"
  | "acquire" | "park" | "reject";

export type SaleRoute =
  | "flippa" | "acquire" | "private_sale" | "broker" | "strategic_buyer" | "do_not_sell";

export type AcquisitionOpportunity = {
  id: string;
  opportunity_name: string;
  source: string | null;
  source_url: string | null;
  country: string | null;
  category: Category;
  distress_type: DistressType;
  asking_price: number | null;
  revenue_ttm: number | null;
  profit_ttm: number | null;
  monthly_recurring_revenue: number | null;
  annual_recurring_revenue: number | null;
  customer_count: number | null;
  user_count: number | null;
  email_list_size: number | null;
  social_following: number | null;
  domain_strength: number | null;
  trademark_status: string | null;
  ip_assets: string | null;
  code_assets: string | null;
  customer_data_status: string | null;
  operational_complexity: number | null;
  founder_dependency: number | null;
  liftor_advantage_notes: string | null;
  liftor_fit_score: number | null;
  brand_value_score: number | null;
  replacement_cost_score: number | null;
  turnaround_score: number | null;
  legal_risk_score: number | null;
  financing_feasibility_score: number | null;
  exit_route_score: number | null;
  overall_priority_score: number | null;
  financing_required: number | null;
  recommended_structure: RecommendedStructure;
  recommended_action: RecommendedAction;
  notes: string | null;
  next_action: string | null;
  founder_approval_required: boolean;
  founder_approved: boolean;
  scanned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DisposalAsset = {
  id: string;
  asset_name: string;
  category: Category;
  build_status: string | null;
  revenue_status: string | null;
  reason_for_disposal: string | null;
  sale_route: SaleRoute;
  asking_price_estimate: number | null;
  evidence_pack_status: "missing" | "partial" | "ready" | "verified";
  handover_docs_status: "missing" | "partial" | "ready" | "verified";
  code_ip_status: string | null;
  customer_data_status: string | null;
  compliance_risk: string | null;
  recommended_action: "hold" | "prepare" | "list" | "sold" | "do_not_sell";
  notes: string | null;
  founder_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancingOption = {
  id: string;
  opportunity_id: string;
  structure: RecommendedStructure;
  feasibility_score: number | null;
  estimated_capital: number | null;
  estimated_term_months: number | null;
  notes: string | null;
  recommended: boolean;
  founder_approved: boolean;
  created_at: string;
  updated_at: string;
};

const sb = () => supabase as any;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// ---------- Scoring ----------

export type Scores = {
  liftor_fit_score: number;
  brand_value_score: number;
  replacement_cost_score: number;
  turnaround_score: number;
  legal_risk_score: number;       // higher = riskier
  financing_feasibility_score: number;
  exit_route_score: number;
  overall_priority_score: number;
};

/**
 * Deterministic scoring. Liftor only recommends buying when there is a clear
 * post-acquisition operating advantage — cheap alone is never enough.
 */
export function computeScores(o: Partial<AcquisitionOpportunity>): Scores {
  const fitInputs = [
    o.liftor_advantage_notes ? 25 : 0,
    (o.operational_complexity ?? 100) <= 50 ? 20 : 0,
    (o.founder_dependency ?? 100) <= 50 ? 15 : 0,
    o.category && ["saas", "ai", "ecommerce", "agency", "app", "marketplace"].includes(o.category) ? 20 : 5,
    (o.customer_count ?? 0) > 0 || (o.monthly_recurring_revenue ?? 0) > 0 ? 20 : 0,
  ];
  const liftor_fit_score = clamp(fitInputs.reduce((a, b) => a + b, 0));

  const brand_value_score = clamp(
    (Math.log10(Math.max(o.social_following ?? 0, 1)) * 8) +
    (Math.log10(Math.max(o.email_list_size ?? 0, 1)) * 8) +
    ((o.domain_strength ?? 0) * 0.4) +
    (o.trademark_status === "registered" ? 20 : o.trademark_status === "pending" ? 8 : 0)
  );

  const replacement_cost_score = clamp(
    (o.code_assets ? 25 : 0) +
    (o.ip_assets ? 20 : 0) +
    (Math.log10(Math.max(o.customer_count ?? 0, 1)) * 12) +
    (o.customer_data_status === "clean" ? 15 : o.customer_data_status === "partial" ? 7 : 0) +
    ((o.domain_strength ?? 0) * 0.2)
  );

  const turnaround_score = clamp(
    (o.distress_type === "founder_exhausted" ? 30 :
     o.distress_type === "overbuilt_no_sales" ? 25 :
     o.distress_type === "revenue_decline" ? 20 :
     o.distress_type === "turnaround" ? 25 :
     o.distress_type === "cash_shortage" ? 15 : 5) +
    ((100 - (o.founder_dependency ?? 100)) * 0.3) +
    ((100 - (o.operational_complexity ?? 100)) * 0.3)
  );

  // Higher = MORE legal risk (insolvency / bankruptcy / unknown trademark increase risk).
  const legal_risk_score = clamp(
    (o.distress_type === "bankruptcy" || o.distress_type === "administration" || o.distress_type === "liquidation" ? 45 : 10) +
    (o.trademark_status && o.trademark_status !== "registered" ? 15 : 0) +
    (o.customer_data_status === "unknown" || o.customer_data_status === "missing" ? 20 : 0) +
    (!o.country ? 5 : 0)
  );

  const ask = o.asking_price ?? 0;
  const fin = o.financing_required ?? ask;
  const financing_feasibility_score = clamp(
    fin === 0 ? 50 :
    fin <= 50_000 ? 90 :
    fin <= 250_000 ? 75 :
    fin <= 1_000_000 ? 55 :
    fin <= 5_000_000 ? 35 : 15
  );

  const exit_route_score = clamp(
    (o.category === "saas" || o.category === "ai" ? 35 : 15) +
    ((o.monthly_recurring_revenue ?? 0) > 0 ? 25 : 0) +
    (brand_value_score * 0.3) +
    (o.trademark_status === "registered" ? 10 : 0)
  );

  // Overall priority: fit dominates, brand+replacement matter,
  // turnaround + exit add upside, legal risk + financing constraints subtract.
  const overall_priority_score = clamp(
    liftor_fit_score * 0.30 +
    brand_value_score * 0.15 +
    replacement_cost_score * 0.10 +
    turnaround_score * 0.15 +
    exit_route_score * 0.15 +
    financing_feasibility_score * 0.10 -
    legal_risk_score * 0.20 +
    15 // baseline so good fits don't sit near 0
  );

  return {
    liftor_fit_score, brand_value_score, replacement_cost_score,
    turnaround_score, legal_risk_score, financing_feasibility_score,
    exit_route_score, overall_priority_score,
  };
}

/**
 * Recommend an action. Liftor never recommends "acquire" just because the price
 * is low — fit + low legal risk + viable financing must all be present.
 */
export function recommendAction(o: Partial<AcquisitionOpportunity>, s: Scores): RecommendedAction {
  if (s.legal_risk_score >= 70) return "reject";
  if (s.liftor_fit_score < 35) return "reject";
  if (s.overall_priority_score < 25) return "park";
  if (s.overall_priority_score < 45) return "watch";
  if (s.financing_feasibility_score < 40 && (o.financing_required ?? o.asking_price ?? 0) > 0) return "finance_needed";
  if (s.overall_priority_score < 65) return "investigate";
  if (s.overall_priority_score < 80) return "bid_ready";
  return "acquire";
}

export function recommendStructure(o: Partial<AcquisitionOpportunity>, s: Scores): RecommendedStructure {
  if (s.legal_risk_score >= 70 || s.liftor_fit_score < 35) return "do_not_buy";
  const fin = o.financing_required ?? o.asking_price ?? 0;
  if (fin === 0) return "cash_purchase";
  if (fin <= 50_000) return "cash_purchase";
  if (o.distress_type === "founder_exhausted" && fin <= 500_000) return "seller_finance";
  if (o.distress_type === "revenue_decline" || o.distress_type === "turnaround") return "earn_out";
  if ((o.monthly_recurring_revenue ?? 0) > 0 && fin <= 1_000_000) return "revenue_share";
  if (fin <= 5_000_000) return "spv";
  return "investor_partner";
}

export function applyScoringDefaults(o: Partial<AcquisitionOpportunity>): Partial<AcquisitionOpportunity> {
  const s = computeScores(o);
  return {
    ...o,
    ...s,
    recommended_action: recommendAction(o, s),
    recommended_structure: recommendStructure(o, s),
  };
}

// ---------- Disposal ----------

export function disposalReadiness(d: DisposalAsset): { ready: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (d.evidence_pack_status !== "ready" && d.evidence_pack_status !== "verified") reasons.push("Evidence pack incomplete");
  if (d.handover_docs_status !== "ready" && d.handover_docs_status !== "verified") reasons.push("Handover docs incomplete");
  if (d.compliance_risk && /high|block|critical/i.test(d.compliance_risk)) reasons.push("Compliance risk too high");
  if (d.sale_route === "do_not_sell") reasons.push("Marked do_not_sell");
  return { ready: reasons.length === 0, reasons };
}

// ---------- Dashboard summaries ----------

export type RadarSummary = {
  total_opps: number;
  top_acquisitions: AcquisitionOpportunity[];
  distressed_brands_to_watch: AcquisitionOpportunity[];
  marketplace_assets: AcquisitionOpportunity[];
  needing_financing: AcquisitionOpportunity[];
  needing_legal_review: AcquisitionOpportunity[];
  awaiting_founder_approval: AcquisitionOpportunity[];
  weekly_new: number;
  weekly_rejected: { opp: AcquisitionOpportunity; reason: string }[];
  disposal_ready: DisposalAsset[];
  disposal_blocked: DisposalAsset[];
};

export function summariseRadar(opps: AcquisitionOpportunity[], disposals: DisposalAsset[]): RadarSummary {
  const sorted = [...opps].sort((a, b) => (b.overall_priority_score ?? 0) - (a.overall_priority_score ?? 0));
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekly_new = opps.filter(o => new Date(o.created_at).getTime() >= weekAgo).length;
  const weekly_rejected = opps
    .filter(o => o.recommended_action === "reject" && new Date(o.updated_at).getTime() >= weekAgo)
    .map(o => ({
      opp: o,
      reason: (o.legal_risk_score ?? 0) >= 70 ? "Legal/IP risk too high"
            : (o.liftor_fit_score ?? 0) < 35 ? "No Liftor operating advantage"
            : "Low overall priority",
    }));

  const isMarketplace = (o: AcquisitionOpportunity) =>
    (o.source ?? "").toLowerCase().match(/flippa|acquire|microacquire|empire|motion/) !== null;
  const isDistressedBrand = (o: AcquisitionOpportunity) =>
    ["administration", "liquidation", "bankruptcy", "cash_shortage", "distressed_retail" as DistressType]
      .includes(o.distress_type) || o.category === "brand" || o.category === "distressed_retail";

  return {
    total_opps: opps.length,
    top_acquisitions: sorted.slice(0, 10),
    distressed_brands_to_watch: sorted.filter(isDistressedBrand).slice(0, 10),
    marketplace_assets: sorted.filter(isMarketplace).slice(0, 10),
    needing_financing: sorted.filter(o => o.recommended_action === "finance_needed"),
    needing_legal_review: sorted.filter(o => (o.legal_risk_score ?? 0) >= 50),
    awaiting_founder_approval: sorted.filter(o => o.founder_approval_required && !o.founder_approved && o.recommended_action !== "reject" && o.recommended_action !== "park"),
    weekly_new,
    weekly_rejected,
    disposal_ready: disposals.filter(d => disposalReadiness(d).ready && d.sale_route !== "do_not_sell"),
    disposal_blocked: disposals.filter(d => !disposalReadiness(d).ready),
  };
}

// ---------- Data access ----------

export async function fetchOpportunities(): Promise<AcquisitionOpportunity[]> {
  const { data } = await sb().from("distressed_acquisition_opportunities").select("*").order("overall_priority_score", { ascending: false, nullsFirst: false });
  return (data ?? []) as AcquisitionOpportunity[];
}
export async function fetchOpportunity(id: string): Promise<AcquisitionOpportunity | null> {
  const { data } = await sb().from("distressed_acquisition_opportunities").select("*").eq("id", id).maybeSingle();
  return data as AcquisitionOpportunity | null;
}
export async function upsertOpportunity(o: Partial<AcquisitionOpportunity> & { opportunity_name: string }) {
  const scored = applyScoringDefaults(o);
  const { data, error } = await sb().from("distressed_acquisition_opportunities").upsert(scored).select().single();
  if (error) throw error;
  return data as AcquisitionOpportunity;
}
export async function deleteOpportunity(id: string) {
  const { error } = await sb().from("distressed_acquisition_opportunities").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDisposals(): Promise<DisposalAsset[]> {
  const { data } = await sb().from("distressed_disposal_assets").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as DisposalAsset[];
}
export async function upsertDisposal(d: Partial<DisposalAsset> & { asset_name: string }) {
  const { data, error } = await sb().from("distressed_disposal_assets").upsert(d).select().single();
  if (error) throw error;
  return data as DisposalAsset;
}
export async function deleteDisposal(id: string) {
  const { error } = await sb().from("distressed_disposal_assets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFinancing(opportunityId: string): Promise<FinancingOption[]> {
  const { data } = await sb().from("distressed_deal_financing_options").select("*").eq("opportunity_id", opportunityId).order("feasibility_score", { ascending: false, nullsFirst: false });
  return (data ?? []) as FinancingOption[];
}
export async function fetchAllFinancing(): Promise<FinancingOption[]> {
  const { data } = await sb().from("distressed_deal_financing_options").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as FinancingOption[];
}
export async function upsertFinancing(f: Partial<FinancingOption> & { opportunity_id: string; structure: RecommendedStructure }) {
  const { data, error } = await sb().from("distressed_deal_financing_options").upsert(f).select().single();
  if (error) throw error;
  return data as FinancingOption;
}
export async function deleteFinancing(id: string) {
  const { error } = await sb().from("distressed_deal_financing_options").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Source registry (for weekly scanning) ----------

export const SCAN_SOURCES: { id: string; name: string; type: "marketplace" | "insolvency" | "trademark" | "news" | "registry" }[] = [
  { id: "flippa", name: "Flippa", type: "marketplace" },
  { id: "acquire", name: "Acquire.com", type: "marketplace" },
  { id: "gazette", name: "The Gazette insolvency notices", type: "insolvency" },
  { id: "companies_house", name: "Companies House", type: "registry" },
  { id: "pacer", name: "PACER / US bankruptcy records", type: "insolvency" },
  { id: "wipo", name: "WIPO Global Brand Database", type: "trademark" },
  { id: "tm_dbs", name: "National trademark databases", type: "trademark" },
  { id: "domain_markets", name: "Domain marketplaces", type: "marketplace" },
  { id: "news_alerts", name: "Public news / search alerts", type: "news" },
  { id: "linkedin", name: "LinkedIn / news signals", type: "news" },
  { id: "ip_announcements", name: "Insolvency practitioner announcements", type: "insolvency" },
  { id: "ma_advisers", name: "M&A adviser distressed asset announcements", type: "news" },
];

export const STRUCTURE_LABEL: Record<RecommendedStructure, string> = {
  cash_purchase: "Cash purchase",
  seller_finance: "Seller finance",
  earn_out: "Earn-out",
  revenue_share: "Revenue share",
  spv: "Acquisition SPV",
  investor_partner: "Investor / partner",
  debt: "Secured debt",
  do_not_buy: "Do not buy",
};

export const ACTION_LABEL: Record<RecommendedAction, string> = {
  watch: "Watch",
  investigate: "Investigate",
  bid_ready: "Bid ready",
  finance_needed: "Finance needed",
  acquire: "Acquire (founder approval)",
  park: "Park",
  reject: "Reject",
};

export function fmtMoney(n: number | null | undefined, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}