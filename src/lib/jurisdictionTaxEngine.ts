import { supabase } from "@/integrations/supabase/client";

export type FxConfidence = "estimated"|"provider"|"manual"|"verified";
export type PartyType = "customer"|"seller"|"vendor"|"partner"|"entity"|"payment_provider"|"other";
export type JurisdictionConfidence = "unknown"|"inferred"|"provided"|"verified";
export type TaxFlag = "unknown"|"not_applicable"|"possible"|"required_review"|"confirmed";
export type AdviserReviewType = "vat"|"sales_tax"|"marketplace_tax"|"withholding"|"fx"|"entity_routing"|"seller_payout"|"customer_country"|"other";
export type AdviserReviewStatus = "draft"|"review_required"|"approved_to_ask"|"answered"|"closed";

export interface CurrencySetting {
  id: string; business_id: string | null;
  default_currency: string; supported_currencies: string[]; display_currency: string;
  fx_rate_source: string | null; fx_rate_confidence: FxConfidence;
}
export interface JurisdictionRecord {
  id: string; business_id: string | null; related_table: string | null; related_record_id: string | null;
  party_type: PartyType; country: string | null; region: string | null;
  tax_identifier_summary: string | null; jurisdiction_confidence: JurisdictionConfidence;
  created_at: string; audit_metadata: any;
}
export interface TaxTreatmentFlag {
  id: string; business_id: string | null; legal_entity_id: string | null;
  related_table: string | null; related_record_id: string | null;
  revenue_type: string | null; customer_country: string | null; seller_country: string | null; currency: string | null;
  vat_sales_tax_flag: TaxFlag; withholding_flag: TaxFlag; marketplace_tax_flag: TaxFlag;
  adviser_review_required: boolean; notes: string | null;
  created_at: string; audit_metadata: any;
}
export interface AdviserReviewItem {
  id: string; business_id: string | null; legal_entity_id: string | null;
  review_type: AdviserReviewType; question: string; priority: string;
  status: AdviserReviewStatus; answer_summary: string | null; created_at: string;
}

export const FX_META: Record<FxConfidence, { label: string; cls: string }> = {
  estimated: { label: "Estimated", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  provider:  { label: "Provider",  cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  manual:    { label: "Manual",    cls: "bg-muted text-muted-foreground border-border/50" },
  verified:  { label: "Verified",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};
export const JURISDICTION_META: Record<JurisdictionConfidence, { label: string; cls: string }> = {
  unknown:  { label: "Unknown",  cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  inferred: { label: "Inferred", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  provided: { label: "Provided", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  verified: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};
export const TAX_FLAG_META: Record<TaxFlag, { label: string; cls: string }> = {
  unknown:         { label: "Unknown",         cls: "bg-muted text-muted-foreground border-border/50" },
  not_applicable:  { label: "N/A",             cls: "bg-muted text-muted-foreground border-border/50" },
  possible:        { label: "Possible",        cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  required_review: { label: "Review required", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  confirmed:       { label: "Confirmed",       cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};
export const PARTY_META: Record<PartyType, string> = {
  customer: "Customer", seller: "Seller", vendor: "Vendor", partner: "Partner",
  entity: "Entity", payment_provider: "Provider", other: "Other",
};
export const REVIEW_TYPE_META: Record<AdviserReviewType, string> = {
  vat: "VAT", sales_tax: "Sales tax", marketplace_tax: "Marketplace tax",
  withholding: "Withholding", fx: "FX", entity_routing: "Entity routing",
  seller_payout: "Seller payout", customer_country: "Customer country", other: "Other",
};

function isTest(m: any): boolean {
  return !!m && typeof m === "object" && (m.live_internal_test === true || m.is_test_data === true || m.test === true);
}

export async function fetchCurrencySettings(): Promise<CurrencySetting[]> {
  const { data, error } = await (supabase as any).from("currency_settings").select("*").order("default_currency");
  if (error) { console.warn("currency_settings fetch failed", error); return []; }
  return (data ?? []) as CurrencySetting[];
}
export async function fetchJurisdictionRecords(opts: { party_type?: PartyType[] } = {}): Promise<JurisdictionRecord[]> {
  let q = (supabase as any).from("jurisdiction_records").select("*").order("country");
  if (opts.party_type?.length) q = q.in("party_type", opts.party_type);
  const { data, error } = await q;
  if (error) { console.warn("jurisdiction_records fetch failed", error); return []; }
  return (data ?? []) as JurisdictionRecord[];
}
export async function fetchTaxFlags(): Promise<TaxTreatmentFlag[]> {
  const { data, error } = await (supabase as any).from("tax_treatment_flags").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("tax_treatment_flags fetch failed", error); return []; }
  return (data ?? []) as TaxTreatmentFlag[];
}
export async function fetchAdviserReviewItems(opts: { status?: AdviserReviewStatus[] } = {}): Promise<AdviserReviewItem[]> {
  let q = (supabase as any).from("jurisdiction_adviser_review_items").select("*").order("created_at", { ascending: false });
  if (opts.status?.length) q = q.in("status", opts.status);
  const { data, error } = await q;
  if (error) { console.warn("jurisdiction_adviser_review_items fetch failed", error); return []; }
  return (data ?? []) as AdviserReviewItem[];
}

export interface JTSummary {
  total_currencies: number;
  estimated_fx: number;
  total_jurisdictions: number;
  unknown_jurisdictions: number;
  customer_countries: number;
  seller_countries: number;
  total_flags: number;
  vat_review: number;
  withholding_review: number;
  marketplace_review: number;
  adviser_pending: number;
  adviser_open: number;
  test_records: number;
  top_review: AdviserReviewItem | null;
}

const REVIEW_FLAGS: TaxFlag[] = ["possible","required_review"];

export function summarize(
  currencies: CurrencySetting[],
  jurisdictions: JurisdictionRecord[],
  flags: TaxTreatmentFlag[],
  reviews: AdviserReviewItem[],
): JTSummary {
  const customerCountries = new Set(jurisdictions.filter(j => j.party_type === "customer" && j.country).map(j => j.country as string));
  const sellerCountries   = new Set(jurisdictions.filter(j => j.party_type === "seller"   && j.country).map(j => j.country as string));
  const open = reviews.filter(r => r.status === "draft" || r.status === "review_required" || r.status === "approved_to_ask");
  const top  = open.slice().sort((a,b) => (a.priority < b.priority ? 1 : -1))[0] ?? null;
  return {
    total_currencies: currencies.length,
    estimated_fx: currencies.filter(c => c.fx_rate_confidence === "estimated").length,
    total_jurisdictions: jurisdictions.length,
    unknown_jurisdictions: jurisdictions.filter(j => j.jurisdiction_confidence === "unknown" || !j.country).length,
    customer_countries: customerCountries.size,
    seller_countries: sellerCountries.size,
    total_flags: flags.length,
    vat_review:          flags.filter(f => REVIEW_FLAGS.includes(f.vat_sales_tax_flag)).length,
    withholding_review:  flags.filter(f => REVIEW_FLAGS.includes(f.withholding_flag)).length,
    marketplace_review:  flags.filter(f => REVIEW_FLAGS.includes(f.marketplace_tax_flag)).length,
    adviser_pending: reviews.filter(r => r.status === "draft" || r.status === "review_required").length,
    adviser_open: open.length,
    test_records:
      jurisdictions.filter(j => isTest(j.audit_metadata)).length +
      flags.filter(f => isTest(f.audit_metadata)).length,
    top_review: top,
  };
}

/** Tracker-only classifier. Never gives final tax/legal advice. */
export function suggestTaxFlag(opts: { customer_country?: string | null; seller_country?: string | null }): {
  vat: TaxFlag; sales_tax: TaxFlag; marketplace: TaxFlag; reason: string;
} {
  const EU = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]);
  const c = (opts.customer_country ?? "").toUpperCase();
  const s = (opts.seller_country ?? "").toUpperCase();
  if (!c) return { vat: "unknown", sales_tax: "unknown", marketplace: "unknown", reason: "Customer country unknown" };
  if (c === "GB") return { vat: "possible", sales_tax: "not_applicable", marketplace: s && s !== "GB" ? "possible" : "unknown", reason: "UK VAT may apply" };
  if (EU.has(c))  return { vat: "required_review", sales_tax: "not_applicable", marketplace: "possible", reason: "EU VAT / OSS likely" };
  if (c === "US") return { vat: "not_applicable", sales_tax: "required_review", marketplace: "possible", reason: "US sales-tax nexus review" };
  if (c === "AE") return { vat: "possible", sales_tax: "not_applicable", marketplace: "unknown", reason: "UAE VAT (5%) possible" };
  return { vat: "unknown", sales_tax: "unknown", marketplace: "unknown", reason: `Country ${c} — adviser review needed` };
}