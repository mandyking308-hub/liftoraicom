import { describe, expect, it } from "vitest";
import {
  resolveWorker3Escalation,
  resolveWorker2ApprovedOffer,
  routeWorker3CommercialIntent,
  type Worker2OfferCandidate,
  type Worker2ProductCandidate,
} from "../../../supabase/functions/_shared/worker3CommercialHandoff";

const BUSINESS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUSINESS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONVERSATION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const BCR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PRODUCT = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const OFFER = "99999999-9999-4999-8999-999999999999";

const approvedOffer = (overrides: Partial<Worker2OfferCandidate> = {}): Worker2OfferCandidate => ({
  id: OFFER,
  business_id: BUSINESS_A,
  product_id: PRODUCT,
  active: true,
  offer_stage: "approved",
  approval_status: "approved",
  standard_checkout_enabled: true,
  requires_founder_approval: false,
  approved_at: "2026-09-01T12:00:00.000Z",
  approved_by: CONTACT,
  approved_price_amount: 125,
  approved_currency: "GBP",
  stripe_price_id: "price_approved",
  stripe_product_id: "prod_approved",
  ...overrides,
});

const product: Worker2ProductCandidate = { id: PRODUCT, business_id: BUSINESS_A, active: true };

const routeInput = (overrides: Partial<Parameters<typeof routeWorker3CommercialIntent>[0]> = {}) => ({
  businessId: BUSINESS_A,
  conversation: { id: CONVERSATION, business_id: BUSINESS_A, contact_id: CONTACT, business_contact_relationship_id: BCR },
  relationship: { id: BCR, business_id: BUSINESS_A, contact_id: CONTACT },
  contact: { id: CONTACT, email: "Buyer@Example.com", name: "Buyer" },
  commercialIntent: true,
  purchaseIntent: false,
  demoStatus: "completed" as const,
  selectedOfferId: OFFER,
  messageText: "I am interested in moving forward.",
  confidence: 0.93,
  offers: [approvedOffer()],
  products: [product],
  ...overrides,
});

describe("Worker 3 commercial handoff and escalation", () => {
  it.each([
    ["complaint", "I want to make a complaint about the service."],
    ["complaint", "I need a refund."],
    ["dispute", "I dispute this charge."],
    ["legal_compliance", "Our lawyer has a GDPR compliance question."],
    ["custom_enterprise_terms", "We need enterprise terms and an SLA."],
    ["high_value_exception", "This is a seven figures strategic partnership."],
    ["unsupported_claim", "Does your product integrate with Salesforce?"],
    ["explicit_human_request", "Please connect me with a real person."],
  ] as const)("escalates %s before demo, offer, or checkout", (reason, messageText) => {
    expect(resolveWorker3Escalation({ messageText, confidence: 0.99 })).toEqual({ escalate: true, reason });
    expect(routeWorker3CommercialIntent(routeInput({ messageText, purchaseIntent: true }))).toMatchObject({
      status: "escalate",
      reason,
      external_send_allowed: false,
      payment_execution_allowed: false,
    });
  });

  it("escalates low or invalid confidence", () => {
    expect(resolveWorker3Escalation({ messageText: "I am interested.", confidence: 0.71 }))
      .toEqual({ escalate: true, reason: "low_confidence" });
    expect(resolveWorker3Escalation({ messageText: "I am interested.", confidence: "unknown" }))
      .toEqual({ escalate: true, reason: "low_confidence" });
  });

  it("requires the demo step before offering or checkout", () => {
    expect(routeWorker3CommercialIntent(routeInput({ demoStatus: "not_requested" })))
      .toMatchObject({ status: "demo_required", external_send_allowed: false, payment_execution_allowed: false });
    expect(routeWorker3CommercialIntent(routeInput({ demoStatus: "requested" })))
      .toMatchObject({ status: "awaiting_demo", external_send_allowed: false, payment_execution_allowed: false });
    expect(routeWorker3CommercialIntent(routeInput({ demoStatus: "completed", selectedOfferId: null })))
      .toMatchObject({ status: "blocked", reason: "approved_offer_selection_required" });
  });

  it("requires a Worker 2 approved offer bound to an active same-business product", () => {
    expect(resolveWorker2ApprovedOffer({
      businessId: BUSINESS_A,
      selectedOfferId: OFFER,
      offers: [approvedOffer({ business_id: BUSINESS_B })],
      products: [product],
    })).toEqual({ ok: false, reason: "offer_business_mismatch" });

    expect(resolveWorker2ApprovedOffer({
      businessId: BUSINESS_A,
      selectedOfferId: OFFER,
      offers: [approvedOffer()],
      products: [{ ...product, business_id: BUSINESS_B }],
    })).toEqual({ ok: false, reason: "product_unbound_or_inactive" });

    expect(resolveWorker2ApprovedOffer({
      businessId: BUSINESS_A,
      selectedOfferId: OFFER,
      offers: [approvedOffer({ standard_checkout_enabled: false })],
      products: [product],
    })).toEqual({ ok: false, reason: "offer_not_approved_for_standard_checkout" });
  });

  it("prepares an idempotent Worker 2 checkout request without commercial terms or dispatch", () => {
    const first = routeWorker3CommercialIntent(routeInput({ purchaseIntent: true }));
    const retry = routeWorker3CommercialIntent(routeInput({ purchaseIntent: true }));
    expect(first).toEqual(retry);
    expect(first).toMatchObject({
      status: "worker2_checkout_handoff_prepared",
      target_function: "create-stripe-checkout-session",
      dispatch_allowed: false,
      external_send_allowed: false,
      payment_execution_allowed: false,
      request: {
        business_id: BUSINESS_A,
        offer_id: OFFER,
        customer_email: "buyer@example.com",
        customer_name: "Buyer",
      },
    });
    if (first.status !== "worker2_checkout_handoff_prepared") throw new Error("expected parked Worker 2 handoff");
    expect(first.request.idempotency_key).toHaveLength(90);
    expect(first.request.idempotency_key).toContain(CONVERSATION);
    expect(first.request.idempotency_key).toContain(OFFER);
    expect(first.request).not.toHaveProperty("requested_discount_percent");
    expect(first.request).not.toHaveProperty("price");
    expect(first.request).not.toHaveProperty("amount");
  });

  it("blocks cross-business conversations and incomplete canonical identity", () => {
    expect(routeWorker3CommercialIntent(routeInput({
      conversation: { id: CONVERSATION, business_id: BUSINESS_B, contact_id: CONTACT, business_contact_relationship_id: BCR },
    }))).toMatchObject({ status: "blocked", reason: "conversation_business_mismatch" });

    expect(routeWorker3CommercialIntent(routeInput({ relationship: { id: BCR, business_id: BUSINESS_B, contact_id: CONTACT }, purchaseIntent: true })))
      .toMatchObject({ status: "blocked", reason: "canonical_contact_business_relationship_required" });

    expect(routeWorker3CommercialIntent(routeInput({ offers: [approvedOffer({ business_id: BUSINESS_B })], purchaseIntent: true })))
      .toMatchObject({ status: "blocked", reason: "offer_business_mismatch" });
  });

  it("does not hand off without explicit purchase intent or commercial intent", () => {
    expect(routeWorker3CommercialIntent(routeInput({ purchaseIntent: false })))
      .toMatchObject({ status: "approved_offer_ready", offer_id: OFFER, payment_execution_allowed: false });
    expect(routeWorker3CommercialIntent(routeInput({ commercialIntent: false })))
      .toMatchObject({ status: "no_commercial_intent", external_send_allowed: false });
    expect(routeWorker3CommercialIntent(routeInput({ commercialIntent: false, purchaseIntent: true, demoStatus: "not_requested" })))
      .toMatchObject({ status: "demo_required", payment_execution_allowed: false });
  });
});
