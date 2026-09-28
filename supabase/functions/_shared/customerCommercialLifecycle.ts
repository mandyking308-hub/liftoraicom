export type CustomerSuccessActionType =
  | "onboarding_welcome"
  | "onboarding_start"
  | "product_account_activation"
  | "ordinary_checkin"
  | "approved_support_response"
  | "approved_survey"
  | "renewal_workflow"
  | "approved_upsell_cross_sell"
  | "retention"
  | "winback"
  | "refund";

export const STANDARD_CUSTOMER_SUCCESS_ACTIONS: CustomerSuccessActionType[] = [
  "onboarding_welcome",
  "onboarding_start",
  "product_account_activation",
  "ordinary_checkin",
  "approved_support_response",
  "approved_survey",
  "renewal_workflow",
  "approved_upsell_cross_sell",
  "retention",
  "winback",
  "refund",
];

export function authorizeConversationBusiness(input: {
  callerAuthorized: boolean;
  requestedBusinessId: unknown;
  conversationBusinessId: unknown;
}): { ok: true; businessId: string } | { ok: false; reason: "forbidden" | "business_context_required" | "business_context_mismatch" } {
  if (!input.callerAuthorized) return { ok: false, reason: "forbidden" };
  if (typeof input.requestedBusinessId !== "string" || !input.requestedBusinessId.trim() ||
      typeof input.conversationBusinessId !== "string" || !input.conversationBusinessId.trim()) {
    return { ok: false, reason: "business_context_required" };
  }
  if (input.requestedBusinessId !== input.conversationBusinessId) return { ok: false, reason: "business_context_mismatch" };
  return { ok: true, businessId: input.conversationBusinessId };
}

export function resolveEmailIdentityMatches<T>(rows: T[] | null | undefined):
  | { status: "not_found" }
  | { status: "matched"; contact: T }
  | { status: "ambiguous" } {
  if (!rows?.length) return { status: "not_found" };
  if (rows.length !== 1) return { status: "ambiguous" };
  return { status: "matched", contact: rows[0] };
}

export function resolveBusinessRelationshipMatches<T>(rows: T[] | null | undefined):
  | { status: "not_found" }
  | { status: "matched"; relationship: T }
  | { status: "ambiguous" } {
  if (!rows?.length) return { status: "not_found" };
  if (rows.length !== 1) return { status: "ambiguous" };
  return { status: "matched", relationship: rows[0] };
}

export function customerContextMatches(row: any, expected: {
  businessId: string;
  contactId: string;
  relationshipId: string;
}): boolean {
  return !!row && row.business_id === expected.businessId &&
    (row.contact_id ?? row.crm_contact_id) === expected.contactId &&
    row.business_contact_relationship_id === expected.relationshipId;
}

export type ApprovedOfferResolution =
  | { ok: true; businessId: string; productId: string; offerId: string; stripePriceId: string; stripeProductId: string; approvedPriceAmount: number; currency: string; requestedDiscountPercent: number; maxDiscountPercent: number }
  | { ok: false; reason: string };

export function resolveApprovedCommercialOffer(input: {
  businessId: string;
  contactId?: string;
  offer: any;
  product: any;
  relationship: any;
  requestedDiscountPercent?: unknown;
}): ApprovedOfferResolution {
  const { businessId, offer, product, relationship } = input;
  if (!businessId || !offer?.id || !product?.id || !relationship?.id) return { ok: false, reason: "commercial_context_required" };
  if (offer.business_id !== businessId || product.business_id !== businessId || relationship.business_id !== businessId) {
    return { ok: false, reason: "business_context_mismatch" };
  }
  if (input.contactId && relationship.contact_id !== input.contactId) return { ok: false, reason: "contact_relationship_mismatch" };
  if (offer.product_id !== product.id) return { ok: false, reason: "offer_product_mismatch" };
  if (offer.active !== true || product.active !== true || offer.offer_stage !== "approved" || offer.approval_status !== "approved" ||
      offer.standard_checkout_enabled !== true || offer.requires_founder_approval !== false || !offer.approved_at) {
    return { ok: false, reason: "offer_not_approved_for_standard_checkout" };
  }
  const approvedPriceAmount = Number(offer.approved_price_amount);
  const currency = String(offer.approved_currency ?? "").trim().toUpperCase();
  const stripePriceId = String(offer.stripe_price_id ?? "").trim();
  const stripeProductId = String(offer.stripe_product_id ?? "").trim();
  const maxDiscountPercent = Number(offer.max_discount_percent ?? 0);
  if (!Number.isFinite(approvedPriceAmount) || approvedPriceAmount <= 0 || !/^[A-Z]{3}$/.test(currency) ||
      !stripePriceId || !stripeProductId || !offer.approved_by || !Number.isFinite(maxDiscountPercent) || maxDiscountPercent < 0 || maxDiscountPercent >= 100) {
    return { ok: false, reason: "approved_commercial_envelope_incomplete" };
  }
  try { new Intl.NumberFormat("en", { style: "currency", currency }).format(approvedPriceAmount); }
  catch { return { ok: false, reason: "approved_commercial_envelope_incomplete" }; }
  const rawDiscount = input.requestedDiscountPercent ?? 0;
  const discount = typeof rawDiscount === "number" ? rawDiscount : Number(rawDiscount);
  if (!Number.isFinite(discount) || discount < 0 || discount > maxDiscountPercent) {
    return { ok: false, reason: "discount_exceeds_approved_ceiling" };
  }
  if (discount > 0 && offer.discount_allowed !== true) return { ok: false, reason: "discount_not_allowed" };

  if (offer.customer_segment_rules != null && (typeof offer.customer_segment_rules !== "object" || Array.isArray(offer.customer_segment_rules))) {
    return { ok: false, reason: "customer_segment_rules_invalid" };
  }
  const rules = (offer.customer_segment_rules ?? {}) as Record<string, unknown>;
  const ruleListKeys = ["allowed_qualifications", "allowed_relevance_levels", "required_categories", "allowed_categories", "excluded_qualifications"];
  const supportedRuleKeys = new Set([...ruleListKeys, "minimum_relevance_score"]);
  if (Object.keys(rules).some((key) => !supportedRuleKeys.has(key)) ||
      ruleListKeys.some((key) => key in rules && !Array.isArray(rules[key]))) {
    return { ok: false, reason: "customer_segment_rules_invalid" };
  }
  if ("minimum_relevance_score" in rules && (typeof rules.minimum_relevance_score !== "number" ||
      !Number.isFinite(rules.minimum_relevance_score) || rules.minimum_relevance_score < 0 || rules.minimum_relevance_score > 100)) {
    return { ok: false, reason: "customer_segment_rules_invalid" };
  }
  const allowedQualifications = Array.isArray(rules.allowed_qualifications) ? rules.allowed_qualifications : [];
  const allowedRelevanceLevels = Array.isArray(rules.allowed_relevance_levels) ? rules.allowed_relevance_levels : [];
  const requiredCategories = Array.isArray(rules.required_categories) ? rules.required_categories : [];
  const allowedCategories = Array.isArray(rules.allowed_categories) ? rules.allowed_categories : [];
  const excludedQualifications = Array.isArray(rules.excluded_qualifications) ? rules.excluded_qualifications : [];
  const relationshipCategories = Array.isArray(relationship.business_relevance_categories)
    ? relationship.business_relevance_categories
    : [];
  if (allowedQualifications.length && !allowedQualifications.includes(relationship.qualification)) {
    return { ok: false, reason: "customer_segment_not_eligible" };
  }
  if (allowedRelevanceLevels.length && !allowedRelevanceLevels.includes(relationship.business_relevance_level)) {
    return { ok: false, reason: "customer_segment_not_eligible" };
  }
  if (excludedQualifications.includes(relationship.qualification)) {
    return { ok: false, reason: "customer_segment_not_eligible" };
  }
  if (requiredCategories.length && !requiredCategories.every((category) => relationshipCategories.includes(category))) {
    return { ok: false, reason: "customer_segment_not_eligible" };
  }
  if (allowedCategories.length && !allowedCategories.some((category) => relationshipCategories.includes(category))) {
    return { ok: false, reason: "customer_segment_not_eligible" };
  }
  const minimumRelevanceScore = rules.minimum_relevance_score;
  if (minimumRelevanceScore !== undefined) {
    const minScore = Number(minimumRelevanceScore);
    const customerScore = Number(relationship.business_relevance_score);
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100 ||
        !Number.isFinite(customerScore) || customerScore < minScore) {
      return { ok: false, reason: "customer_segment_not_eligible" };
    }
  }
  if ([allowedQualifications, allowedRelevanceLevels, requiredCategories, allowedCategories, excludedQualifications]
    .some((list) => list.some((entry) => typeof entry !== "string" || !entry.trim()))) {
    return { ok: false, reason: "customer_segment_rules_invalid" };
  }

  return {
    ok: true,
    businessId,
    productId: product.id,
    offerId: offer.id,
    stripePriceId,
    stripeProductId,
    approvedPriceAmount,
    currency,
    requestedDiscountPercent: discount,
    maxDiscountPercent,
  };
}

export function validateStripePriceAgainstOffer(input: {
  price: any;
  stripeProductId: string | null | undefined;
  approvedPriceAmount: number;
  currency: string;
  recurrence?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const { price, stripeProductId, approvedPriceAmount, currency, recurrence } = input;
  if (!price || price.active !== true || !stripeProductId) return { ok: false, reason: "stripe_price_not_approved" };
  const priceProductId = typeof price.product === "string" ? price.product : price.product?.id;
  if (priceProductId !== stripeProductId) return { ok: false, reason: "stripe_product_mismatch" };
  if (String(price.currency ?? "").toUpperCase() !== currency) return { ok: false, reason: "stripe_currency_mismatch" };
  if (!Number.isInteger(price.unit_amount) || price.unit_amount <= 0) return { ok: false, reason: "stripe_price_amount_invalid" };
  let digits: number;
  try { digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits; }
  catch { return { ok: false, reason: "stripe_currency_invalid" }; }
  if (price.unit_amount !== Math.round(approvedPriceAmount * (10 ** digits))) return { ok: false, reason: "stripe_price_amount_mismatch" };
  if (recurrence ? (!price.recurring || price.recurring.interval !== recurrence) : !!price.recurring) {
    return { ok: false, reason: "stripe_price_recurrence_mismatch" };
  }
  return { ok: true };
}

export function approvedCheckoutAmount(input: {
  approvedAmount: number;
  currency: string;
  discountPercent: number;
}): { ok: true; amount: number; minorUnits: number } | { ok: false; reason: string } {
  const { approvedAmount, currency, discountPercent } = input;
  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0 || !/^[A-Z]{3}$/.test(currency) ||
      !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) {
    return { ok: false, reason: "invalid_approved_checkout_amount" };
  }
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    const minorUnits = Math.round(approvedAmount * (10 ** digits) * (1 - discountPercent / 100));
    if (minorUnits <= 0) return { ok: false, reason: "checkout_amount_must_be_positive" };
    return { ok: true, amount: minorUnits / (10 ** digits), minorUnits };
  } catch {
    return { ok: false, reason: "invalid_approved_currency" };
  }
}

export function stripeMinorUnitsToMajor(amount: unknown, currency: string): number | null {
  const minorUnits = Number(amount);
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) return null;
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() })
      .resolvedOptions().maximumFractionDigits;
    return minorUnits / (10 ** digits);
  } catch {
    return null;
  }
}

export function validatePaidCheckoutSnapshot(input: {
  intent: any;
  session: any;
  eventLivemode: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const { intent, session, eventLivemode } = input;
  if (!intent?.id || !session?.id || !session.metadata?.customer_sales_checkout_id) {
    return { ok: false, reason: "checkout_context_missing" };
  }
  if (eventLivemode || intent.test_mode !== true || session.livemode === true) {
    return { ok: false, reason: "live_payment_not_enabled" };
  }
  if (session.metadata.customer_sales_checkout_id !== intent.id ||
      session.metadata.business_id !== intent.business_id ||
      session.metadata.contact_id !== intent.contact_id ||
      session.metadata.business_contact_relationship_id !== intent.business_contact_relationship_id ||
      session.metadata.product_id !== intent.product_id ||
      session.metadata.offer_id !== intent.offer_id) {
    return { ok: false, reason: "checkout_metadata_mismatch" };
  }
  if ((intent.stripe_checkout_session_id && intent.stripe_checkout_session_id !== session.id) || session.payment_status !== "paid") {
    return { ok: false, reason: "payment_not_confirmed" };
  }
  if (String(session.currency ?? "").toUpperCase() !== String(intent.currency ?? "").toUpperCase() ||
      Number(session.amount_total) !== Number(intent.checkout_amount_minor_units)) {
    return { ok: false, reason: "payment_amount_or_currency_mismatch" };
  }
  const sessionCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (intent.stripe_customer_id && sessionCustomerId !== intent.stripe_customer_id) {
    return { ok: false, reason: "stripe_customer_mismatch" };
  }
  return { ok: true };
}

export type CustomerSuccessDecision =
  | { mode: "standard_auto"; approvalRequired: false; reason: null }
  | { mode: "escalate"; approvalRequired: true; reason: string };

const ESCALATION_FLAGS = new Set([
  "complaint", "dispute", "legal_issue", "compliance_issue", "custom_contract",
  "safety_risk", "strategic_exception", "low_ai_confidence", "unusual_refund",
]);

function canonicalRiskFlag(flag: unknown): string | null {
  const value = String(flag ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["complaint", "customer_complaint", "complaint_signal"].includes(value)) return "complaint";
  if (["dispute", "chargeback", "payment_dispute"].includes(value)) return "dispute";
  if (["legal_issue", "legal_review", "legal_review_required", "legal_risk", "contract_negotiation", "legal_financial_compliance_question"].includes(value)) return "legal_issue";
  if (["compliance_issue", "compliance_review", "compliance_review_required", "compliance_risk", "privacy_issue"].includes(value)) return "compliance_issue";
  if (["custom_contract", "custom_terms", "contract_terms_change"].includes(value)) return "custom_contract";
  if (["safety_risk", "urgent_risk", "high_severity_support", "founder_review_required", "human_review_required", "escalation_required"].includes(value)) return "safety_risk";
  if (["strategic_exception", "high_value_strategic_exception"].includes(value)) return "strategic_exception";
  if (["low_ai_confidence", "low_confidence"].includes(value)) return "low_ai_confidence";
  if (value === "unusual_refund") return "unusual_refund";
  return null;
}

export function customerRiskFlagsFromSignals(input: {
  existing?: unknown[];
  complaints?: any[];
  disputes?: any[];
  supportReviews?: any[];
  supportIntakes?: any[];
  triageReviews?: any[];
  supportEscalations?: any[];
}): string[] {
  const asList = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
  const isActive = (status: unknown) => !["resolved", "closed", "dismissed", "complete", "completed"].includes(String(status ?? "open").toLowerCase());
  const flags = new Set<string>();
  for (const flag of asList(input.existing)) {
    const canonical = canonicalRiskFlag(flag);
    if (canonical) flags.add(canonical);
  }
  for (const complaint of input.complaints ?? []) {
    const status = String(complaint.complaint_status ?? complaint.status ?? "open").toLowerCase();
    if (!(["resolved", "closed", "dismissed"].includes(status))) flags.add("complaint");
    if (complaint.compliance_review_required === true) flags.add("compliance_issue");
    if (complaint.legal_review_recommended === true) flags.add("legal_issue");
    for (const flag of asList(complaint.risk_flags)) {
      const canonical = canonicalRiskFlag(flag);
      if (canonical) flags.add(canonical);
    }
  }
  for (const dispute of input.disputes ?? []) {
    const status = String(dispute.dispute_status ?? dispute.status ?? "open").toLowerCase();
    if (!(["resolved", "closed", "dismissed"].includes(status))) flags.add("dispute");
    if (dispute.compliance_review_required === true) flags.add("compliance_issue");
    if (dispute.legal_review_recommended === true) flags.add("legal_issue");
  }
  for (const review of input.supportReviews ?? []) {
    const active = isActive(review.status);
    if (review.escalation_required === true || review.founder_review_required === true ||
        ["high", "urgent", "critical"].includes(String(review.urgency ?? "").toLowerCase())) {
      if (active) flags.add("safety_risk");
    }
  }
  for (const intake of input.supportIntakes ?? []) {
    if (!isActive(intake.question_status)) continue;
    const classification = `${intake.detected_intent ?? ""} ${intake.detected_category ?? ""}`.toLowerCase();
    if (/complaint/.test(classification)) flags.add("complaint");
    if (/dispute|chargeback/.test(classification)) flags.add("dispute");
    if (/legal|contract|terms|regulat/.test(classification)) flags.add("legal_issue");
    if (/compliance|privacy|tax|regulat/.test(classification)) flags.add("compliance_issue");
    if (["high", "urgent", "critical"].includes(String(intake.urgency ?? "").toLowerCase()) ||
        ["high", "critical"].includes(String(intake.risk_level ?? "").toLowerCase()) ||
        intake.founder_review_required === true) flags.add("safety_risk");
  }
  for (const review of input.triageReviews ?? []) {
    if (!isActive(review.triage_status)) continue;
    if (review.compliance_review_required === true) flags.add("compliance_issue");
    if (review.legal_review_required === true) flags.add("legal_issue");
    if (["high", "critical"].includes(String(review.risk_level ?? "").toLowerCase()) ||
        review.founder_review_required === true) flags.add("safety_risk");
  }
  for (const escalation of input.supportEscalations ?? []) {
    if (!isActive(escalation.escalation_status)) continue;
    const canonical = canonicalRiskFlag(escalation.escalation_type);
    if (canonical) flags.add(canonical);
    if (escalation.founder_review_required === true) flags.add("safety_risk");
  }
  return [...flags];
}

export function evaluateCustomerSuccessAction(input: {
  actionType: CustomerSuccessActionType | string;
  policy: any;
  riskFlags?: string[];
  confidence?: number | null;
  amount?: number | null;
  currency?: string | null;
  approvedContent?: boolean;
  approvedOffer?: boolean;
  paymentVerified?: boolean;
}): CustomerSuccessDecision {
  if (!STANDARD_CUSTOMER_SUCCESS_ACTIONS.includes(input.actionType as CustomerSuccessActionType)) {
    return { mode: "escalate", approvalRequired: true, reason: "unsupported_customer_success_action" };
  }
  if (input.policy?.enabled !== true) return { mode: "escalate", approvalRequired: true, reason: "business_customer_success_policy_disabled" };
  if (input.actionType === "product_account_activation" && input.paymentVerified !== true) {
    return { mode: "escalate", approvalRequired: true, reason: "verified_payment_required" };
  }
  const confidence = input.confidence == null ? null : Number(input.confidence);
  const minimumConfidence = Number(input.policy.minimum_ai_confidence ?? 0.85);
  if (!Number.isFinite(minimumConfidence) || minimumConfidence < 0 || minimumConfidence > 1) {
    return { mode: "escalate", approvalRequired: true, reason: "business_customer_success_policy_invalid" };
  }
  const risks = (input.riskFlags ?? []).map(canonicalRiskFlag).filter((flag): flag is string => !!flag);
  const escalationFlag = risks.find((flag) => ESCALATION_FLAGS.has(flag));
  if (escalationFlag) return { mode: "escalate", approvalRequired: true, reason: escalationFlag };
  if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1 || confidence < minimumConfidence)) {
    return { mode: "escalate", approvalRequired: true, reason: "low_ai_confidence" };
  }
  if (input.actionType === "refund" && Number(input.amount ?? 0) > Number(input.policy.maximum_standard_refund_amount ?? 0)) {
    return { mode: "escalate", approvalRequired: true, reason: "unusual_refund" };
  }
  if (input.actionType === "refund" && (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0 ||
      !/^[A-Z]{3}$/.test(String(input.currency ?? "").toUpperCase()))) {
    return { mode: "escalate", approvalRequired: true, reason: "refund_amount_or_currency_invalid" };
  }
  if (["approved_support_response", "approved_survey"].includes(input.actionType) && input.approvedContent !== true) {
    return { mode: "escalate", approvalRequired: true, reason: "approved_content_required" };
  }
  if (input.actionType === "approved_upsell_cross_sell" && input.approvedOffer !== true) {
    return { mode: "escalate", approvalRequired: true, reason: "approved_offer_required" };
  }
  if (["approved_upsell_cross_sell", "refund"].includes(input.actionType) &&
      (input.amount == null || !Number.isFinite(input.amount) || !input.currency)) {
    return { mode: "escalate", approvalRequired: true, reason: "amount_and_currency_required" };
  }
  if (input.amount != null && input.currency && String(input.policy.policy_currency ?? "").toUpperCase() !== input.currency.toUpperCase()) {
    return { mode: "escalate", approvalRequired: true, reason: "policy_currency_mismatch" };
  }
  const policyKey: Record<string, string> = {
    product_account_activation: "allow_customer_product_activation",
    ordinary_checkin: "allow_standard_checkins",
    approved_support_response: "allow_approved_support_responses",
    approved_survey: "allow_approved_surveys",
    renewal_workflow: "allow_standard_renewals",
    approved_upsell_cross_sell: "allow_approved_upsell_cross_sell",
    retention: "allow_standard_retention",
    winback: "allow_standard_winback",
    refund: "allow_standard_refunds",
  };
  const policyField = policyKey[input.actionType];
  if (policyField && input.policy[policyField] !== true) {
    return { mode: "escalate", approvalRequired: true, reason: "action_not_enabled_by_business_policy" };
  }
  if (input.amount != null && input.actionType === "approved_upsell_cross_sell" &&
      (input.amount > Number(input.policy.maximum_standard_upsell_amount ?? 0) ||
       input.amount > Number(input.policy.strategic_value_threshold ?? Number.POSITIVE_INFINITY))) {
    return { mode: "escalate", approvalRequired: true, reason: "high_value_strategic_exception" };
  }
  return { mode: "standard_auto", approvalRequired: false, reason: null };
}

export const CUSTOMER_PRODUCT_ROLE = "product_customer" as const;
export const LIFTOR_PLATFORM_ROLES = new Set(["founder", "admin", "operator"]);

export function customerProductProvisioningRole(_requestedRole?: unknown): typeof CUSTOMER_PRODUCT_ROLE {
  return CUSTOMER_PRODUCT_ROLE;
}

export function paymentActivationIdempotencyKeys(checkoutId: string) {
  return {
    payment: `checkout:${checkoutId}:payment`,
    deal: `checkout:${checkoutId}:deal`,
    revenue: `checkout:${checkoutId}:revenue`,
    customer: `checkout:${checkoutId}:customer_state`,
    onboarding: `checkout:${checkoutId}:onboarding`,
    welcome: `checkout:${checkoutId}:welcome`,
    productAccount: `checkout:${checkoutId}:product_account`,
    audit: `checkout:${checkoutId}:payment_succeeded`,
  };
}

export function planCustomerSuccessActivation(input: { checkoutId: string; requiresCustomerAccount: boolean; recurring: boolean }) {
  const keys = paymentActivationIdempotencyKeys(input.checkoutId);
  return [
    { actionType: "onboarding_welcome", idempotencyKey: `${keys.welcome}:journey`, executionStatus: "queued", scheduledInDays: 0, executionMode: "standard_auto", approvalRequired: false },
    { actionType: "onboarding_start", idempotencyKey: `${keys.onboarding}:start`, executionStatus: "queued", scheduledInDays: 0, executionMode: "standard_auto", approvalRequired: false },
    ...(input.requiresCustomerAccount ? [{ actionType: "product_account_activation", idempotencyKey: `${keys.productAccount}:activate`, executionStatus: "queued", scheduledInDays: 0, executionMode: "standard_auto", approvalRequired: false }] : []),
    { actionType: "ordinary_checkin", idempotencyKey: `${keys.onboarding}:first_checkin`, executionStatus: "scheduled", scheduledInDays: 14, executionMode: "standard_auto", approvalRequired: false },
    { actionType: "approved_survey", idempotencyKey: `${keys.onboarding}:survey`, executionStatus: "scheduled", scheduledInDays: 30, executionMode: "standard_auto", approvalRequired: false },
    ...(input.recurring ? [{ actionType: "renewal_workflow", idempotencyKey: `${keys.onboarding}:renewal`, executionStatus: "scheduled", scheduledInDays: 30, executionMode: "standard_auto", approvalRequired: false }] : []),
    { actionType: "retention", idempotencyKey: `${keys.customer}:retention_monitor`, executionStatus: "scheduled", scheduledInDays: 30, executionMode: "standard_auto", approvalRequired: false },
  ];
}
