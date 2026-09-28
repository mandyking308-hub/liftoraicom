import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  approvedCheckoutAmount,
  authorizeConversationBusiness,
  customerProductProvisioningRole,
  customerContextMatches,
  customerRiskFlagsFromSignals,
  evaluateCustomerSuccessAction,
  LIFTOR_PLATFORM_ROLES,
  paymentActivationIdempotencyKeys,
  planCustomerSuccessActivation,
  resolveApprovedCommercialOffer,
  resolveBusinessRelationshipMatches,
  resolveEmailIdentityMatches,
  validatePaidCheckoutSnapshot,
  validateStripePriceAgainstOffer,
} from "../../supabase/functions/_shared/customerCommercialLifecycle";

describe("sales conversation business authorization", () => {
  it("rejects cross-business conversation UUID access for an authorized founder", () => {
    expect(authorizeConversationBusiness({
      callerAuthorized: true,
      requestedBusinessId: "business-a",
      conversationBusinessId: "business-b",
    })).toEqual({ ok: false, reason: "business_context_mismatch" });
  });

  it("requires founder or admin and an explicit business", () => {
    expect(authorizeConversationBusiness({ callerAuthorized: false, requestedBusinessId: "business-a", conversationBusinessId: "business-a" }))
      .toEqual({ ok: false, reason: "forbidden" });
    expect(authorizeConversationBusiness({ callerAuthorized: true, requestedBusinessId: null, conversationBusinessId: "business-a" }))
      .toEqual({ ok: false, reason: "business_context_required" });
  });

  it("validates caller authorization and business context before loading the conversation UUID", () => {
    const source = readFileSync("supabase/functions/sales-conversation-brain/index.ts", "utf8");
    const authorization = source.indexOf("authorizeFounderOrAdmin(req,");
    const explicitBusiness = source.indexOf("requireCustomerSalesBusinessId(requestedBusinessId)");
    const serviceClient = source.indexOf("authorization.createAdminClient()");
    const businessLookup = source.indexOf('from("businesses")');
    const conversationLookup = source.indexOf('from("customer_sales_conversations")');
    expect(authorization).toBeGreaterThanOrEqual(0);
    expect(authorization).toBeLessThan(explicitBusiness);
    expect(explicitBusiness).toBeLessThan(serviceClient);
    expect(serviceClient).toBeLessThan(businessLookup);
    expect(businessLookup).toBeLessThan(conversationLookup);
    expect(source).toContain("authorizeConversationBusiness");
    expect(source).toContain("customer_contact_identity_context_required");
  });
});

describe("canonical global identity and business relationship", () => {
  it("fails closed on ambiguous global email identity", () => {
    expect(resolveEmailIdentityMatches([{ id: "contact-a" }, { id: "contact-b" }])).toEqual({ status: "ambiguous" });
    const migration = readFileSync("supabase/migrations/20260923152000_worker2_customer_sales_identity_context.sql", "utf8");
    expect(migration).toContain("RAISE EXCEPTION 'ambiguous_contact_email'");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO authenticated, service_role");
    expect(migration).toContain("founder_admin_or_service_role_required");
    const identityHelper = readFileSync("src/lib/businessContactRelationship.ts", "utf8");
    expect(identityHelper).toContain('rpc("customer_sales_link_contact_by_email"');
    expect(identityHelper).toContain("ambiguous_contact_email");
  });

  it("fails closed on ambiguous business contact relationships", () => {
    expect(resolveBusinessRelationshipMatches([{ id: "bcr-a" }, { id: "bcr-b" }])).toEqual({ status: "ambiguous" });
  });

  it("rejects linked customer context from another business, person or relationship", () => {
    const row = { business_id: "business-a", crm_contact_id: "contact-a", business_contact_relationship_id: "bcr-a" };
    expect(customerContextMatches(row, { businessId: "business-a", contactId: "contact-a", relationshipId: "bcr-a" })).toBe(true);
    expect(customerContextMatches(row, { businessId: "business-b", contactId: "contact-a", relationshipId: "bcr-a" })).toBe(false);
    expect(customerContextMatches(row, { businessId: "business-a", contactId: "contact-b", relationshipId: "bcr-a" })).toBe(false);
    expect(customerContextMatches(row, { businessId: "business-a", contactId: "contact-a", relationshipId: "bcr-b" })).toBe(false);
  });

  it("keeps new contacts global and resolves business state through a scoped BCR", () => {
    const checkout = readFileSync("supabase/functions/create-stripe-checkout-session/index.ts", "utf8");
    const contactUi = readFileSync("src/pages/founder/CRMContacts.tsx", "utf8");
    expect(checkout).toContain("_assigned_business: null");
    expect(checkout).toContain("business_contact_relationships");
    expect(checkout).not.toMatch(/contact\.assigned_business/);
    expect(contactUi).toContain("ensureBusinessContactRelationship");
    expect(contactUi).toContain("legacy assigned_business is not used for business scope");
  });
});

describe("approved commercial offer envelope", () => {
  const input = (overrides: Record<string, any> = {}) => ({
    businessId: "business-a",
    offer: {
      id: "offer-a", business_id: "business-a", product_id: "product-a", active: true,
      offer_stage: "approved", approval_status: "approved", standard_checkout_enabled: true, requires_founder_approval: false,
      approved_at: "2026-09-20T00:00:00Z", approved_by: "founder-user", approved_price_amount: 120, approved_currency: "GBP",
      stripe_price_id: "price-approved", stripe_product_id: "stripe-product-a", max_discount_percent: 10, discount_allowed: true,
      customer_segment_rules: { allowed_qualifications: ["qualified"] },
    },
    product: { id: "product-a", business_id: "business-a", active: true, requires_customer_account: true },
    relationship: { id: "bcr-a", contact_id: "contact-a", business_id: "business-a", qualification: "qualified", business_relevance_level: "high", business_relevance_score: 80, business_relevance_categories: ["buyer"] },
    ...overrides,
  });

  it("resolves the server-approved price and enforces the discount ceiling", () => {
    expect(resolveApprovedCommercialOffer(input({ contactId: "contact-a", requestedDiscountPercent: 5 }))).toMatchObject({
      ok: true, stripePriceId: "price-approved", approvedPriceAmount: 120, currency: "GBP", requestedDiscountPercent: 5,
    });
    expect(resolveApprovedCommercialOffer(input({ requestedDiscountPercent: 11 })))
      .toMatchObject({ ok: false, reason: "discount_exceeds_approved_ceiling" });
  });

  it("fails closed on foreign business, unapproved offers, segment mismatch, and contact mismatch", () => {
    expect(resolveApprovedCommercialOffer(input({ product: { id: "product-a", business_id: "business-b", active: true } })))
      .toMatchObject({ ok: false, reason: "business_context_mismatch" });
    expect(resolveApprovedCommercialOffer(input({ offer: { ...input().offer, approval_status: "draft" } })))
      .toMatchObject({ ok: false, reason: "offer_not_approved_for_standard_checkout" });
    expect(resolveApprovedCommercialOffer(input({ relationship: { ...input().relationship, qualification: "needs_review" } })))
      .toMatchObject({ ok: false, reason: "customer_segment_not_eligible" });
    expect(resolveApprovedCommercialOffer(input({ contactId: "other-contact" })))
      .toMatchObject({ ok: false, reason: "contact_relationship_mismatch" });
    expect(resolveApprovedCommercialOffer(input({ offer: { ...input().offer, customer_segment_rules: { minimum_relevance_score: 90 } } })))
      .toMatchObject({ ok: false, reason: "customer_segment_not_eligible" });
    expect(resolveApprovedCommercialOffer(input({ offer: { ...input().offer, customer_segment_rules: { allowed_qualifications: "qualified" } } })))
      .toMatchObject({ ok: false, reason: "customer_segment_rules_invalid" });
    expect(resolveApprovedCommercialOffer(input({ offer: { ...input().offer, customer_segment_rules: { customer_tier: "gold" } } })))
      .toMatchObject({ ok: false, reason: "customer_segment_rules_invalid" });
  });

  it("checks Stripe product, active status, amount, currency, and recurrence against the approved offer", () => {
    const price = { active: true, product: "stripe-product-a", currency: "gbp", unit_amount: 12000 };
    expect(validateStripePriceAgainstOffer({ price, stripeProductId: "stripe-product-a", approvedPriceAmount: 120, currency: "GBP" }))
      .toEqual({ ok: true });
    expect(validateStripePriceAgainstOffer({ price: { ...price, unit_amount: 12001 }, stripeProductId: "stripe-product-a", approvedPriceAmount: 120, currency: "GBP" }))
      .toMatchObject({ ok: false, reason: "stripe_price_amount_mismatch" });
  });

  it("computes discount amount in currency minor units and rejects a free checkout", () => {
    expect(approvedCheckoutAmount({ approvedAmount: 120, currency: "GBP", discountPercent: 10 }))
      .toEqual({ ok: true, amount: 108, minorUnits: 10800 });
    expect(approvedCheckoutAmount({ approvedAmount: 120, currency: "GBP", discountPercent: 100 }))
      .toMatchObject({ ok: false, reason: "invalid_approved_checkout_amount" });
  });
});

describe("standard Customer Success policy", () => {
  const policy = {
    enabled: true,
    policy_currency: "GBP",
    minimum_ai_confidence: 0.85,
    allow_customer_product_activation: true,
    allow_standard_checkins: true,
    allow_approved_support_responses: true,
    allow_approved_surveys: true,
    allow_standard_renewals: true,
    allow_approved_upsell_cross_sell: true,
    allow_standard_retention: true,
    allow_standard_winback: true,
    allow_standard_refunds: true,
    maximum_standard_refund_amount: 50,
    maximum_standard_upsell_amount: 500,
    strategic_value_threshold: 5000,
  };

  it("allows ordinary check-ins and approved support content without per-transaction approval", () => {
    expect(evaluateCustomerSuccessAction({ actionType: "ordinary_checkin", policy }))
      .toEqual({ mode: "standard_auto", approvalRequired: false, reason: null });
    expect(evaluateCustomerSuccessAction({ actionType: "approved_support_response", policy, approvedContent: true }))
      .toEqual({ mode: "standard_auto", approvalRequired: false, reason: null });
  });

  it("allows a bounded policy refund and escalates an unusual amount", () => {
    expect(evaluateCustomerSuccessAction({ actionType: "refund", policy, amount: 25, currency: "GBP" }))
      .toEqual({ mode: "standard_auto", approvalRequired: false, reason: null });
    expect(evaluateCustomerSuccessAction({ actionType: "refund", policy, amount: 51, currency: "GBP" }))
      .toMatchObject({ mode: "escalate", reason: "unusual_refund" });
    expect(evaluateCustomerSuccessAction({ actionType: "refund", policy, amount: 0, currency: "GBP" }))
      .toMatchObject({ mode: "escalate", reason: "refund_amount_or_currency_invalid" });
  });

  it("escalates complaints, unapproved content, low confidence, currency mismatch, and strategic value", () => {
    expect(evaluateCustomerSuccessAction({ actionType: "ordinary_checkin", policy, riskFlags: ["complaint"] }))
      .toMatchObject({ mode: "escalate", approvalRequired: true, reason: "complaint" });
    expect(evaluateCustomerSuccessAction({ actionType: "approved_support_response", policy, approvedContent: false }))
      .toMatchObject({ mode: "escalate", reason: "approved_content_required" });
    expect(evaluateCustomerSuccessAction({ actionType: "ordinary_checkin", policy, confidence: 0.6 }))
      .toMatchObject({ mode: "escalate", reason: "low_ai_confidence" });
    expect(evaluateCustomerSuccessAction({ actionType: "ordinary_checkin", policy, confidence: Number.NaN }))
      .toMatchObject({ mode: "escalate", reason: "low_ai_confidence" });
    expect(evaluateCustomerSuccessAction({ actionType: "approved_upsell_cross_sell", policy, approvedOffer: true, amount: 501, currency: "GBP" }))
      .toMatchObject({ mode: "escalate", reason: "high_value_strategic_exception" });
    expect(evaluateCustomerSuccessAction({ actionType: "approved_upsell_cross_sell", policy, approvedOffer: true, amount: 100, currency: "USD" }))
      .toMatchObject({ mode: "escalate", reason: "policy_currency_mismatch" });
  });

  it("maps real CRM complaints, disputes, support escalations and legal/compliance markers to human review", () => {
    expect(customerRiskFlagsFromSignals({
      complaints: [{ complaint_status: "open", legal_review_recommended: true }],
      disputes: [{ dispute_status: "open", compliance_review_required: true }],
      supportReviews: [{ urgency: "urgent", escalation_required: true, status: "open" }],
      supportIntakes: [{ question_status: "captured", detected_intent: "contract_negotiation", risk_level: "high", founder_review_required: false }],
      triageReviews: [{ triage_status: "open", legal_review_required: true, founder_review_required: false }],
      supportEscalations: [{ escalation_type: "compliance_review", escalation_status: "open", founder_review_required: false }],
    })).toEqual(expect.arrayContaining(["complaint", "dispute", "legal_issue", "compliance_issue", "safety_risk"]));
    expect(customerRiskFlagsFromSignals({
      complaints: [{ complaint_status: "resolved" }],
      disputes: [{ dispute_status: "closed" }],
      supportReviews: [{ urgency: "normal", escalation_required: false, founder_review_required: false, status: "closed" }],
    })).toEqual([]);
  });
});

describe("payment retry and product role separation", () => {
  it("uses stable idempotency keys and creates the same activation plan on payment retries", () => {
    const one = planCustomerSuccessActivation({ checkoutId: "checkout-a", requiresCustomerAccount: true, recurring: true });
    const retry = planCustomerSuccessActivation({ checkoutId: "checkout-a", requiresCustomerAccount: true, recurring: true });
    expect(one).toEqual(retry);
    expect(new Set(one.map((row) => row.idempotencyKey)).size).toBe(one.length);
    expect(one.some((row) => row.actionType === "product_account_activation")).toBe(true);
    expect(paymentActivationIdempotencyKeys("checkout-a")).toEqual(paymentActivationIdempotencyKeys("checkout-a"));
  });

  it("accepts a verified paid session when the intent session write raced and rejects amount mismatches", () => {
    const intent = {
      id: "checkout-a", business_id: "business-a", contact_id: "contact-a", business_contact_relationship_id: "bcr-a",
      product_id: "product-a", offer_id: "offer-a", stripe_checkout_session_id: null,
      stripe_customer_id: "cus-a", currency: "GBP", checkout_amount_minor_units: 10800, test_mode: true,
    };
    const session = {
      id: "cs_test_a", payment_status: "paid", livemode: false, currency: "gbp", amount_total: 10800, customer: "cus-a",
      metadata: {
        customer_sales_checkout_id: "checkout-a", business_id: "business-a", contact_id: "contact-a",
        business_contact_relationship_id: "bcr-a", product_id: "product-a", offer_id: "offer-a",
      },
    };
    expect(validatePaidCheckoutSnapshot({ intent, session, eventLivemode: false })).toEqual({ ok: true });
    expect(validatePaidCheckoutSnapshot({ intent, session: { ...session, amount_total: 10801 }, eventLivemode: false }))
      .toMatchObject({ ok: false, reason: "payment_amount_or_currency_mismatch" });
  });

  it("provisions only product-customer access and never a Liftor platform role", () => {
    const role = customerProductProvisioningRole("admin");
    expect(role).toBe("product_customer");
    expect(LIFTOR_PLATFORM_ROLES.has(role)).toBe(false);
  });

  it("links verified payment to customer, BCR, deal, revenue and idempotent onboarding", () => {
    const webhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(webhook).toContain('.eq("id", intent.business_contact_relationship_id)');
    expect(webhook).toContain("business_contact_relationship_id: intent.business_contact_relationship_id");
    expect(webhook).toContain("onConflict: \"customer_sales_checkout_id\"");
    expect(webhook).toContain("ignoreDuplicates: true");
    expect(webhook).toContain("paymentActivationIdempotencyKeys(intent.id)");
    expect(webhook).toContain("customer_success_runner_dispatched");
    expect(webhook).toContain("net_amount: amount");
    expect(webhook).toContain("stripe_fee_amount: feeCents / 100");
    expect(webhook).toContain("revenueAmount: refreshed?.net_amount ?? netAmount");
    expect(webhook).toContain('queued?.execution_status === "escalated" ? "customer_success_action_escalated" : "customer_success_action_queued"');
  });

  it("audits offer-envelope and Customer Success policy transitions", () => {
    const migration = readFileSync("supabase/migrations/20260923180000_worker2_customer_revenue_activation.sql", "utf8");
    expect(migration).toContain("worker2_crm_internal.audit_customer_sales_offer_transition");
    expect(migration).toContain("customer_sales_offers_commercial_audit");
    expect(migration).toContain("commercial_offer_updated");
    expect(migration).toContain("worker2_crm_internal.audit_customer_success_policy_transition");
    expect(migration).toContain("customer_success_policies_commercial_audit");
    expect(migration).toContain("customer_success_policy_updated");
    expect(migration).toContain("REVOKE ALL ON FUNCTION worker2_crm_internal.audit_customer_sales_offer_transition() FROM PUBLIC, anon, authenticated, service_role");
  });

  it("never elevates claimed product accounts to platform roles", () => {
    const claim = readFileSync("supabase/functions/customer-product-account-claim/index.ts", "utf8");
    expect(claim).toContain('account.account_role !== "product_customer"');
    expect(claim).toContain('account.account_scope !== "customer_product"');
    expect(claim).not.toMatch(/from\(["']user_roles["']\).*insert/s);
    expect(claim).toContain("This function only links customer_product_accounts. It never writes user_roles.");
  });

  it("keeps the CS queue business and relationship scoped with stale-claim retry recovery", () => {
    const runner = readFileSync("supabase/functions/customer-success-standard-run/index.ts", "utf8");
    expect(runner).toContain("requireFounderOrCron(req");
    expect(runner).toContain('.eq("id", row.business_contact_relationship_id).eq("contact_id", row.contact_id).eq("business_id", row.business_id)');
    expect(runner).toContain("reclaimed_stale_processing_job");
    expect(runner).toContain("onConflict: \"idempotency_key\", ignoreDuplicates: true");
    expect(runner).toContain("customer_success_action_escalated");
    expect(runner).toContain("complaint_status,compliance_review_required,legal_review_recommended,risk_flags");
    expect(runner).toContain("urgency,escalation_required,founder_review_required,status");
    expect(runner).toContain("support_question_intake");
    expect(runner).toContain("support_triage_reviews");
    expect(runner).toContain("support_escalations");
    expect(runner).not.toContain('select("severity").eq("business_id", row.business_id)');
    expect(runner).toContain("stripe.refunds.create");
    expect(runner).toContain('secret.startsWith("sk_test_")');
  });

  it("authorizes and scopes standard Customer Success enqueue before writing retry-safe actions", () => {
    const enqueue = readFileSync("supabase/functions/customer-success-standard-enqueue/index.ts", "utf8");
    expect(enqueue.indexOf("await requireFounderOrCron(req")).toBeLessThan(enqueue.indexOf('from("businesses")'));
    expect(enqueue).toContain('.eq("id", action.business_contact_relationship_id).eq("business_id", body.business_id).eq("contact_id", action.contact_id)');
    expect(enqueue).toContain("evaluateCustomerSuccessAction");
    expect(enqueue).toContain("onConflict: \"idempotency_key\", ignoreDuplicates: true");
    expect(enqueue.indexOf("scheduled_at_invalid")).toBeLessThan(enqueue.indexOf("new Date(action.scheduled_at).toISOString()"));
    expect(enqueue).toContain("approved_upsell_cross_sell");
    expect(enqueue).toContain("approved_support_response");
    expect(enqueue).toContain("business_contact_relationship_id: row.business_contact_relationship_id");
  });
});
