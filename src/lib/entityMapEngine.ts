import { supabase } from "@/integrations/supabase/client";

export type LegalEntity = {
  id: string;
  entity_name: string;
  entity_type: string | null;
  jurisdiction: string | null;
  registration_number_summary: string | null;
  owner_summary: string | null;
  tax_residency_summary: string | null;
  financial_year_end: string | null;
  accountant_contact: string | null;
  legal_contact: string | null;
  active: boolean;
  audit_metadata: any;
};

export type EntityAssignment = {
  id: string;
  business_id: string;
  legal_entity_id: string;
  assignment_type: "owner" | "operator" | "billing_entity" | "brand_owner" | "ip_owner" | "marketplace_operator" | "service_provider";
  effective_from: string | null;
  effective_to: string | null;
  founder_confirmed: boolean;
  notes: string | null;
};

export type RevenueRoutingRule = {
  id: string;
  business_id: string;
  legal_entity_id: string | null;
  revenue_type: "product" | "service" | "subscription" | "marketplace_fee" | "commission" | "licence" | "consulting" | "other";
  route_to_entity: string | null;
  route_to_bank_summary: string | null;
  tax_notes: string | null;
  adviser_review_required: boolean;
  active: boolean;
};

export type PolicyAssignment = {
  id: string;
  business_id: string;
  legal_entity_id: string | null;
  policy_type: "terms" | "privacy" | "refund" | "marketplace_terms" | "seller_terms" | "subscription_terms" | "cookie_policy" | "disclaimer";
  policy_url: string | null;
  policy_status: "missing" | "draft" | "review_required" | "approved" | "published";
};

export type AdviserQuestion = {
  id: string;
  business_id: string | null;
  legal_entity_id: string | null;
  question: string;
  category: "vat" | "sales_tax" | "corporation_tax" | "us_tax" | "uae_tax" | "transfer_pricing" | "withholding" | "payroll" | "other";
  status: "draft" | "adviser_review" | "answered" | "closed";
  priority: string;
  created_at: string;
};

/** Policies expected by archetype — surfaces missing coverage. */
export const REQUIRED_POLICIES_BY_ARCHETYPE: Record<string, PolicyAssignment["policy_type"][]> = {
  saas: ["terms", "privacy", "subscription_terms", "cookie_policy"],
  marketplace: ["terms", "privacy", "marketplace_terms", "seller_terms", "refund", "cookie_policy"],
  ecommerce: ["terms", "privacy", "refund", "cookie_policy"],
  agency_service: ["terms", "privacy", "disclaimer"],
  consultancy: ["terms", "privacy", "disclaimer"],
  media_music_content: ["terms", "privacy", "disclaimer", "cookie_policy"],
  course_education: ["terms", "privacy", "refund", "cookie_policy"],
  directory_listing: ["terms", "privacy", "cookie_policy", "disclaimer"],
  lead_generation: ["terms", "privacy", "cookie_policy", "disclaimer"],
  membership_community: ["terms", "privacy", "subscription_terms", "cookie_policy"],
  property_rental: ["terms", "privacy", "refund", "disclaimer"],
  ai_tool_product: ["terms", "privacy", "subscription_terms", "disclaimer", "cookie_policy"],
  regulated_sensitive: ["terms", "privacy", "disclaimer", "cookie_policy"],
  subscription_service: ["terms", "privacy", "subscription_terms", "refund", "cookie_policy"],
  digital_product: ["terms", "privacy", "refund"],
  local_service: ["terms", "privacy", "disclaimer"],
  creator_brand: ["terms", "privacy", "disclaimer"],
  licensing_ip_business: ["terms", "privacy", "disclaimer"],
  advisory_business: ["terms", "privacy", "disclaimer"],
  hybrid_other: ["terms", "privacy"],
};

/* ----- fetchers ----- */
export async function fetchEntities() {
  const { data, error } = await supabase.from("legal_entities").select("*").order("entity_name");
  if (error) throw error;
  return (data ?? []) as LegalEntity[];
}
export async function fetchAssignments() {
  const { data, error } = await supabase.from("business_entity_assignments").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EntityAssignment[];
}
export async function fetchRoutingRules() {
  const { data, error } = await supabase.from("revenue_routing_rules").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RevenueRoutingRule[];
}
export async function fetchPolicies() {
  const { data, error } = await supabase.from("entity_policy_assignments").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PolicyAssignment[];
}
export async function fetchAdviserQuestions() {
  const { data, error } = await supabase.from("tax_sensitive_questions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdviserQuestion[];
}

/** Identify unmapped businesses (have assignments elsewhere but no entity assignment). */
export function unmappedBusinessIds(allBusinessIds: string[], assignments: EntityAssignment[]) {
  const mapped = new Set(assignments.map(a => a.business_id));
  return allBusinessIds.filter(b => !mapped.has(b));
}

/** Compute missing policies for a business given archetype + existing policies. */
export function missingPoliciesForBusiness(
  business_id: string,
  archetype_code: string | undefined,
  policies: PolicyAssignment[],
): PolicyAssignment["policy_type"][] {
  const required = REQUIRED_POLICIES_BY_ARCHETYPE[archetype_code ?? "hybrid_other"] ?? ["terms", "privacy"];
  const have = new Set(
    policies.filter(p => p.business_id === business_id && (p.policy_status === "approved" || p.policy_status === "published"))
      .map(p => p.policy_type),
  );
  return required.filter(p => !have.has(p));
}

/** Revenue streams without a routing rule. */
export function unroutedRevenueStreams(business_id: string, expected: RevenueRoutingRule["revenue_type"][], rules: RevenueRoutingRule[]) {
  const have = new Set(rules.filter(r => r.business_id === business_id && r.active).map(r => r.revenue_type));
  return expected.filter(t => !have.has(t));
}

/** Helper to push a sensitive item to the adviser queue (never AI advice). */
export async function pushAdviserQuestion(args: {
  question: string;
  category: AdviserQuestion["category"];
  business_id?: string;
  legal_entity_id?: string;
  priority?: string;
}) {
  const { data, error } = await supabase.from("tax_sensitive_questions").insert({
    question: args.question,
    category: args.category,
    business_id: args.business_id ?? null,
    legal_entity_id: args.legal_entity_id ?? null,
    priority: args.priority ?? "normal",
    status: "adviser_review",
  }).select().single();
  if (error) throw error;
  return data as AdviserQuestion;
}