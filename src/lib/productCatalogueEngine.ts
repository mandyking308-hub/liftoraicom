import { supabase } from "@/integrations/supabase/client";

export type ProductType =
  | "product" | "service" | "subscription" | "package" | "add_on"
  | "marketplace_listing" | "digital_asset" | "licence" | "course"
  | "consultation" | "other";

export type OfferType =
  | "standard" | "premium" | "trial" | "subscription" | "bundle"
  | "limited" | "custom" | "upsell" | "renewal";

export type OfferStatus = "draft" | "active_internal" | "approved" | "paused" | "retired";
export type ClaimStatus = "draft" | "approved" | "prohibited" | "retired";
export type RequirementType =
  | "human_time" | "ai_time" | "document" | "setup" | "access" | "customer_info" | "vendor" | "fulfilment";

export type Product = {
  id: string; business_id: string; product_name: string; product_type: ProductType;
  description: string | null; target_customer: string | null; delivery_type: string | null;
  cost_to_deliver_estimate: number | null; active: boolean;
  created_at: string; updated_at: string;
};

export type Offer = {
  id: string; business_id: string; product_id: string; offer_name: string; offer_type: OfferType;
  price_amount: number | null; currency: string; billing_frequency: string | null;
  discount_allowed: boolean; margin_estimate: number | null;
  offer_status: OfferStatus; approval_required: boolean;
  created_at: string; updated_at: string;
};

export type Claim = {
  id: string; business_id: string; product_id: string | null; offer_id: string | null;
  claim_text: string; claim_status: ClaimStatus; evidence_source: string | null;
  approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string;
};

export type Requirement = {
  id: string; business_id: string; product_id: string | null; offer_id: string | null;
  requirement_name: string; requirement_type: RequirementType; required: boolean;
  created_at: string; updated_at: string;
};

const sb = () => supabase as any;

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await sb().from("global_products").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchOffers(): Promise<Offer[]> {
  const { data, error } = await sb().from("global_offers").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchClaims(): Promise<Claim[]> {
  const { data, error } = await sb().from("offer_claims").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchRequirements(): Promise<Requirement[]> {
  const { data, error } = await sb().from("offer_delivery_requirements").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updateOfferStatus(id: string, status: OfferStatus): Promise<void> {
  const { error } = await sb().from("global_offers").update({ offer_status: status }).eq("id", id);
  if (error) throw error;
}
export async function updateClaimStatus(id: string, status: ClaimStatus, approverUserId?: string): Promise<void> {
  const patch: Record<string, unknown> = { claim_status: status };
  if (status === "approved") {
    patch.approved_at = new Date().toISOString();
    if (approverUserId) patch.approved_by = approverUserId;
  }
  const { error } = await sb().from("offer_claims").update(patch).eq("id", id);
  if (error) throw error;
}

export function summarize(products: Product[], offers: Offer[], claims: Claim[], reqs: Requirement[]) {
  return {
    products_total: products.length,
    products_active: products.filter(p => p.active).length,
    offers_total: offers.length,
    offers_approved: offers.filter(o => o.offer_status === "approved").length,
    offers_internal: offers.filter(o => o.offer_status === "active_internal").length,
    offers_draft: offers.filter(o => o.offer_status === "draft").length,
    claims_total: claims.length,
    claims_pending: claims.filter(c => c.claim_status === "draft").length,
    claims_prohibited: claims.filter(c => c.claim_status === "prohibited").length,
    requirements_total: reqs.length,
  };
}

/**
 * Diagnostics:
 * - product has no offers
 * - offer has no price
 * - offer has no delivery requirements
 * - product/offer claims not approved
 */
export function diagnose(products: Product[], offers: Offer[], claims: Claim[], reqs: Requirement[]) {
  const out: Array<{ id: string; severity: "info" | "warn" | "block"; message: string }> = [];
  const offersByProduct = new Map<string, Offer[]>();
  for (const o of offers) {
    const arr = offersByProduct.get(o.product_id) ?? [];
    arr.push(o); offersByProduct.set(o.product_id, arr);
  }
  const reqsByOffer = new Map<string, Requirement[]>();
  for (const r of reqs) {
    if (!r.offer_id) continue;
    const arr = reqsByOffer.get(r.offer_id) ?? [];
    arr.push(r); reqsByOffer.set(r.offer_id, arr);
  }
  const claimsByOffer = new Map<string, Claim[]>();
  const claimsByProduct = new Map<string, Claim[]>();
  for (const c of claims) {
    if (c.offer_id) { const a = claimsByOffer.get(c.offer_id) ?? []; a.push(c); claimsByOffer.set(c.offer_id, a); }
    if (c.product_id) { const a = claimsByProduct.get(c.product_id) ?? []; a.push(c); claimsByProduct.set(c.product_id, a); }
  }

  for (const p of products.filter(p => p.active)) {
    if (!offersByProduct.has(p.id)) {
      out.push({ id: p.id, severity: "warn", message: `Product "${p.product_name}" has no offer — Sales cannot quote.` });
    }
    const pClaims = claimsByProduct.get(p.id) ?? [];
    if (pClaims.length && !pClaims.some(c => c.claim_status === "approved")) {
      out.push({ id: p.id, severity: "warn", message: `Product "${p.product_name}" has only unapproved claims.` });
    }
  }
  for (const o of offers) {
    if (o.price_amount == null || Number(o.price_amount) <= 0) {
      out.push({ id: o.id, severity: "warn", message: `Offer "${o.offer_name}" has no price — Sales cannot invent one.` });
    }
    if (!reqsByOffer.get(o.id)?.length) {
      out.push({ id: o.id, severity: "warn", message: `Offer "${o.offer_name}" has no delivery requirements.` });
    }
    const oClaims = claimsByOffer.get(o.id) ?? [];
    if (oClaims.some(c => c.claim_status === "prohibited")) {
      out.push({ id: o.id, severity: "block", message: `Offer "${o.offer_name}" contains prohibited claims.` });
    }
    if (o.offer_status === "approved" && o.approval_required) {
      const anyApproved = oClaims.some(c => c.claim_status === "approved");
      const anyDraft = oClaims.some(c => c.claim_status === "draft");
      if (anyDraft && !anyApproved) out.push({ id: o.id, severity: "block", message: `Offer "${o.offer_name}" approved but has unapproved claims.` });
    }
  }
  for (const c of claims.filter(c => c.claim_status === "draft")) {
    out.push({ id: c.id, severity: "info", message: `Claim awaiting approval: "${c.claim_text.slice(0, 80)}"` });
  }
  return out;
}

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  product: "Product", service: "Service", subscription: "Subscription", package: "Package",
  add_on: "Add-on", marketplace_listing: "Marketplace listing", digital_asset: "Digital asset",
  licence: "Licence", course: "Course", consultation: "Consultation", other: "Other",
};

export const OFFER_STATUS_META: Record<OfferStatus, { label: string; cls: string }> = {
  draft:           { label: "Draft",           cls: "bg-muted text-muted-foreground border-border/50" },
  active_internal: { label: "Active internal", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  approved:        { label: "Approved",        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused:          { label: "Paused",          cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  retired:         { label: "Retired",         cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; cls: string }> = {
  draft:      { label: "Draft",      cls: "bg-muted text-muted-foreground border-border/50" },
  approved:   { label: "Approved",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  prohibited: { label: "Prohibited", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  retired:    { label: "Retired",    cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

export const REQUIREMENT_TYPE_LABEL: Record<RequirementType, string> = {
  human_time: "Human time", ai_time: "AI time", document: "Document", setup: "Setup",
  access: "Access", customer_info: "Customer info", vendor: "Vendor", fulfilment: "Fulfilment",
};

export function formatPrice(amount: number | null, currency: string, freq?: string | null) {
  if (amount == null) return "—";
  const f = freq ? ` / ${freq}` : "";
  try { return `${new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount))}${f}`; }
  catch { return `${amount} ${currency}${f}`; }
}