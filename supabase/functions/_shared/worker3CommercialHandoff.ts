/**
 * Worker 3 commercial routing boundary.
 *
 * Worker 2 remains authoritative for final offer eligibility, price, discount,
 * contract terms and checkout. This module only confirms that a selected
 * Worker 2 offer/product pair is same-business and marked for standard
 * approved checkout, then prepares the exact Worker 2 request shape. It never
 * invokes checkout, creates a payment session, sends a message or books a demo.
 */

export const WORKER3_LOW_CONFIDENCE_THRESHOLD = 0.72;
export const WORKER2_CHECKOUT_FUNCTION = "create-stripe-checkout-session";

export type Worker2OfferCandidate = {
  id: string;
  business_id: string;
  product_id: string | null;
  active: boolean;
  offer_stage: string;
  approval_status: string;
  standard_checkout_enabled: boolean;
  requires_founder_approval: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approved_price_amount: number | string | null;
  approved_currency: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
};

export type Worker2ProductCandidate = {
  id: string;
  business_id: string;
  active: boolean;
};

export type Worker2OfferResolution =
  | { ok: true; offerId: string; productId: string }
  | {
      ok: false;
      reason:
        | "approved_offer_selection_required"
        | "approved_offer_missing"
        | "approved_offer_ambiguous"
        | "offer_business_mismatch"
        | "product_unbound_or_inactive"
        | "offer_not_approved_for_standard_checkout"
        | "approved_commercial_envelope_incomplete";
    };

/**
 * Preflight the selected offer using Worker 2's current standard-checkout
 * envelope. No commercial amount, discount, claim, promise or term is returned.
 * Worker 2 revalidates its full policy (including customer segment rules) when
 * its checkout function is eventually invoked.
 */
export function resolveWorker2ApprovedOffer(input: {
  businessId: string;
  selectedOfferId: string | null | undefined;
  offers: readonly Worker2OfferCandidate[];
  products: readonly Worker2ProductCandidate[];
}): Worker2OfferResolution {
  if (!input.selectedOfferId) return { ok: false, reason: "approved_offer_selection_required" };
  const matches = input.offers.filter((offer) => offer.id === input.selectedOfferId);
  if (matches.length === 0) return { ok: false, reason: "approved_offer_missing" };
  if (matches.length !== 1) return { ok: false, reason: "approved_offer_ambiguous" };

  const offer = matches[0];
  if (offer.business_id !== input.businessId) return { ok: false, reason: "offer_business_mismatch" };
  if (!offer.product_id) return { ok: false, reason: "product_unbound_or_inactive" };
  const products = input.products.filter((product) => product.id === offer.product_id);
  if (products.length !== 1 || products[0].business_id !== input.businessId || products[0].active !== true) {
    return { ok: false, reason: "product_unbound_or_inactive" };
  }
  if (offer.active !== true || offer.offer_stage !== "approved" || offer.approval_status !== "approved" ||
      offer.standard_checkout_enabled !== true || offer.requires_founder_approval !== false ||
      !offer.approved_at || !offer.approved_by) {
    return { ok: false, reason: "offer_not_approved_for_standard_checkout" };
  }
  const approvedAmount = Number(offer.approved_price_amount);
  const currency = String(offer.approved_currency ?? "").trim().toUpperCase();
  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0 || !/^[A-Z]{3}$/.test(currency) ||
      !String(offer.stripe_price_id ?? "").trim() || !String(offer.stripe_product_id ?? "").trim()) {
    return { ok: false, reason: "approved_commercial_envelope_incomplete" };
  }

  return { ok: true, offerId: offer.id, productId: offer.product_id };
}

export type Worker3EscalationReason =
  | "complaint"
  | "dispute"
  | "legal_compliance"
  | "custom_enterprise_terms"
  | "high_value_exception"
  | "unsupported_claim"
  | "explicit_human_request"
  | "low_confidence";

export type Worker3EscalationSignals = {
  complaint?: boolean;
  dispute?: boolean;
  legalOrCompliance?: boolean;
  customOrEnterpriseTerms?: boolean;
  highValueException?: boolean;
  unsupportedClaim?: boolean;
  explicitHumanRequest?: boolean;
};

const ESCALATION_PATTERNS: ReadonlyArray<{ reason: Worker3EscalationReason; pattern: RegExp }> = [
  { reason: "dispute", pattern: /\b(dispute|chargeback|fraud|unauthori[sz]ed charge)\b/i },
  { reason: "complaint", pattern: /\b(complaint|complain|refund|unhappy|dissatisfied|disappointed|poor service|bad experience)\b/i },
  { reason: "legal_compliance", pattern: /\b(lawyer|attorney|lawsuit|legal|regulator|compliance|compliant|gdpr|hipaa|privacy request|data deletion|liability|guarantee|warranty|certification)\b/i },
  { reason: "custom_enterprise_terms", pattern: /\b(enterprise|custom|bespoke|procurement|sla|service level|nda|contract|terms|discount|special price|payment terms)\b/i },
  { reason: "high_value_exception", pattern: /\b(high[- ]value(?: account| opportunity| exception)?|large budget|six figures|seven figures|strategic partnership|investment|acquisition)\b/i },
  { reason: "unsupported_claim", pattern: /\b(can you|does (?:it|this|your)|do you|will you|is it|are you able to|are you capable)\b.{0,120}\b(support|integrate|guarantee|promise|certif(?:y|ied|ication)|comply|compliant|deliver|include|compatible)\b/i },
  { reason: "explicit_human_request", pattern: /\b(speak to|talk to|connect me with|real person|human|founder|manager|representative)\b/i },
];

/** Deterministic escalation precedes any demo, offer, or checkout decision. */
export function resolveWorker3Escalation(input: {
  messageText: string;
  confidence: unknown;
  signals?: Worker3EscalationSignals;
}): { escalate: false } | { escalate: true; reason: Worker3EscalationReason } {
  const signals = input.signals ?? {};
  const explicitReasons: Array<[boolean | undefined, Worker3EscalationReason]> = [
    [signals.dispute, "dispute"],
    [signals.complaint, "complaint"],
    [signals.legalOrCompliance, "legal_compliance"],
    [signals.customOrEnterpriseTerms, "custom_enterprise_terms"],
    [signals.highValueException, "high_value_exception"],
    [signals.unsupportedClaim, "unsupported_claim"],
    [signals.explicitHumanRequest, "explicit_human_request"],
  ];
  for (const [active, reason] of explicitReasons) {
    if (active) return { escalate: true, reason };
  }
  for (const candidate of ESCALATION_PATTERNS) {
    if (candidate.pattern.test(input.messageText)) return { escalate: true, reason: candidate.reason };
  }
  const confidence = typeof input.confidence === "number"
    ? input.confidence
    : typeof input.confidence === "string" && input.confidence.trim() !== ""
      ? Number(input.confidence)
      : Number.NaN;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1 || confidence < WORKER3_LOW_CONFIDENCE_THRESHOLD) {
    return { escalate: true, reason: "low_confidence" };
  }
  return { escalate: false };
}

export type Worker2CheckoutHandoffBody = {
  business_id: string;
  offer_id: string;
  customer_email: string;
  customer_name?: string;
  idempotency_key: string;
};

export type Worker3CommercialRoute =
  | { status: "no_commercial_intent"; external_send_allowed: false; payment_execution_allowed: false }
  | { status: "escalate"; reason: Worker3EscalationReason; external_send_allowed: false; payment_execution_allowed: false }
  | { status: "blocked"; reason: string; external_send_allowed: false; payment_execution_allowed: false }
  | { status: "demo_required" | "awaiting_demo"; external_send_allowed: false; payment_execution_allowed: false }
  | { status: "approved_offer_ready"; offer_id: string; external_send_allowed: false; payment_execution_allowed: false }
  | {
      status: "worker2_checkout_handoff_prepared";
      target_function: typeof WORKER2_CHECKOUT_FUNCTION;
      request: Worker2CheckoutHandoffBody;
      dispatch_allowed: false;
      external_send_allowed: false;
      payment_execution_allowed: false;
    };

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildCheckoutIdempotencyKey(conversationId: string, offerId: string): string | null {
  if (!validUuid(conversationId) || !validUuid(offerId)) return null;
  // Worker 2 accepts 12–100 characters. Conversation + offer IDs make retries
  // of the same purchase handoff converge on one checkout intent.
  return `worker3:checkout:${conversationId}:${offerId}`;
}

/**
 * Route a commercial turn through demo, approved offer, then Worker 2. The
 * returned checkout request is a parked handoff only; this module has no
 * dispatch implementation and sets every execution flag to false.
 */
export function routeWorker3CommercialIntent(input: {
  businessId: string;
  conversation: { id: string; business_id: string; contact_id: string | null; business_contact_relationship_id: string | null };
  relationship: { id: string; business_id: string | null; contact_id: string } | null;
  contact: { id: string; email: string | null; name?: string | null } | null;
  commercialIntent: boolean;
  purchaseIntent: boolean;
  demoStatus: "not_requested" | "requested" | "completed";
  selectedOfferId?: string | null;
  messageText: string;
  confidence: unknown;
  escalationSignals?: Worker3EscalationSignals;
  offers: readonly Worker2OfferCandidate[];
  products: readonly Worker2ProductCandidate[];
}): Worker3CommercialRoute {
  const escalation = resolveWorker3Escalation({
    messageText: input.messageText,
    confidence: input.confidence,
    signals: input.escalationSignals,
  });
  if (escalation.escalate) {
    return { status: "escalate", reason: escalation.reason, external_send_allowed: false, payment_execution_allowed: false };
  }
  if (!input.commercialIntent && !input.purchaseIntent) {
    return { status: "no_commercial_intent", external_send_allowed: false, payment_execution_allowed: false };
  }
  if (!input.businessId || input.conversation.business_id !== input.businessId) {
    return { status: "blocked", reason: "conversation_business_mismatch", external_send_allowed: false, payment_execution_allowed: false };
  }
  if (input.demoStatus !== "completed") {
    return {
      status: input.demoStatus === "requested" ? "awaiting_demo" : "demo_required",
      external_send_allowed: false,
      payment_execution_allowed: false,
    };
  }

  const offer = resolveWorker2ApprovedOffer({
    businessId: input.businessId,
    selectedOfferId: input.selectedOfferId,
    offers: input.offers,
    products: input.products,
  });
  if (offer.ok === false) {
    return { status: "blocked", reason: offer.reason, external_send_allowed: false, payment_execution_allowed: false };
  }
  if (!input.purchaseIntent) {
    return { status: "approved_offer_ready", offer_id: offer.offerId, external_send_allowed: false, payment_execution_allowed: false };
  }

  const { conversation, relationship, contact } = input;
  const customerEmail = contact?.email?.trim().toLowerCase() ?? "";
  if (!validUuid(conversation.id) || !validUuid(conversation.contact_id) || !validUuid(conversation.business_contact_relationship_id) ||
      !relationship || relationship.id !== conversation.business_contact_relationship_id ||
      relationship.business_id !== input.businessId || relationship.contact_id !== conversation.contact_id ||
      !contact || contact.id !== conversation.contact_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { status: "blocked", reason: "canonical_contact_business_relationship_required", external_send_allowed: false, payment_execution_allowed: false };
  }
  const idempotencyKey = buildCheckoutIdempotencyKey(conversation.id, offer.offerId);
  if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 100) {
    return { status: "blocked", reason: "checkout_idempotency_context_invalid", external_send_allowed: false, payment_execution_allowed: false };
  }

  const request: Worker2CheckoutHandoffBody = {
    business_id: input.businessId,
    offer_id: offer.offerId,
    customer_email: customerEmail,
    ...(contact.name?.trim() ? { customer_name: contact.name.trim().slice(0, 200) } : {}),
    idempotency_key: idempotencyKey,
  };
  return {
    status: "worker2_checkout_handoff_prepared",
    target_function: WORKER2_CHECKOUT_FUNCTION,
    request,
    dispatch_allowed: false,
    external_send_allowed: false,
    payment_execution_allowed: false,
  };
}
