// Customer Sales -> Quote-to-Cash checkout. A buyer or the sales client may
// start checkout only for a server-approved offer. Stripe price, amount,
// currency, mode, and redirect URLs are resolved on the server.
// Stripe remains test-mode-only until a separate live-readiness change.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";
import { z } from "npm:zod@3.23.8";
import {
  approvedCheckoutAmount,
  resolveApprovedCommercialOffer,
  validateStripePriceAgainstOffer,
} from "../_shared/customerCommercialLifecycle.ts";

const Body = z.object({
  business_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  customer_email: z.string().email().max(320),
  customer_name: z.string().trim().max(200).optional(),
  requested_discount_percent: z.number().finite().min(0).max(100).default(0),
  idempotency_key: z.string().trim().min(12).max(100),
}).strict();

type CheckoutScope = {
  businessId: string;
  businessName: string;
  contactId: string;
  contact: any;
  relationship: any;
  product: any;
  offer: any;
};

class CheckoutFailure extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: string, status: number): never { throw new CheckoutFailure(code, status); }

async function validateCallerJwt(req: Request, url: string, anonKey: string) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) fail("caller_jwt_required", 401);
  const token = auth.slice("Bearer ".length).trim();
  if (!token) fail("caller_jwt_required", 401);

  // The project anon JWT is the public buyer execution identity. Supabase's
  // Edge gateway verifies it (verify_jwt remains enabled); user JWTs are also
  // checked against Auth here before privileged work is created.
  if (token === anonKey) return { kind: "public_buyer" as const, userId: null };
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) fail("caller_jwt_invalid", 401);
  return { kind: "authenticated_buyer" as const, userId: data.user.id };
}

function normalizedEmail(email: string) { return email.trim().toLowerCase(); }

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hasRestrictedSegmentRules(offer: any): boolean {
  const rules = offer?.customer_segment_rules ?? {};
  return ["allowed_qualifications", "allowed_relevance_levels", "required_categories", "allowed_categories", "excluded_qualifications"]
    .some((key) => Array.isArray(rules[key]) && rules[key].length > 0) ||
    (rules.minimum_relevance_score !== undefined && Number(rules.minimum_relevance_score) > 0);
}

async function resolveGlobalContact(admin: any, email: string, name?: string): Promise<{ contact: any; existed: boolean }> {
  // Worker 1 owns upsert_contact. This path only calls it after the global
  // identity RPC returns no person, and never passes a business assignment.
  const { data: matchedId, error: matchError } = await admin
    .rpc("customer_sales_link_contact_by_email", { p_email: email });
  if (matchError) {
    if (String(matchError.message ?? "").includes("ambiguous_contact_email")) {
      fail("ambiguous_contact_email_review_required", 409);
    }
    fail("global_contact_identity_unavailable", 503);
  }

  let contactId = typeof matchedId === "string" ? matchedId : matchedId?.id ?? null;
  const existed = !!contactId;
  if (!contactId) {
    const { data: created, error: upsertError } = await admin.rpc("upsert_contact", {
      _email: email,
      _name: name ?? null,
      _company: null,
      _role: null,
      _source: "customer_sales_checkout",
      _assigned_business: null,
      _assigned_inbox_id: null,
    });
    if (upsertError) fail("global_contact_create_failed", 503);
    const row = Array.isArray(created) ? created[0] : created;
    contactId = row?.id ?? null;
  }
  if (!contactId) fail("global_contact_identity_unavailable", 503);

  const { data: contact, error } = await admin
    .from("contacts")
    .select("id,name,email,company")
    .eq("id", contactId)
    .maybeSingle();
  if (error || !contact) fail("global_contact_identity_unavailable", 503);
  return { contact, existed };
}

async function resolveBusinessRelationship(admin: any, input: {
  contactId: string;
  businessId: string;
  businessName: string;
}): Promise<any> {
  const { contactId, businessId, businessName } = input;
  const byId = await admin.from("business_contact_relationships")
    .select("*").eq("contact_id", contactId).eq("business_id", businessId).limit(2);
  if (byId.error) fail("business_relationship_lookup_failed", 503);
  if ((byId.data ?? []).length > 1) fail("ambiguous_business_relationship_review_required", 409);
  if (byId.data?.[0]) return byId.data[0];

  // Legacy BCR uniqueness is (contact_id, business_name). Resolve only a
  // matching name that is unclaimed or already points at this exact business.
  const byName = await admin.from("business_contact_relationships")
    .select("*").eq("contact_id", contactId).eq("business_name", businessName).limit(2);
  if (byName.error) fail("business_relationship_lookup_failed", 503);
  if ((byName.data ?? []).length > 1) fail("ambiguous_business_relationship_review_required", 409);
  const named = byName.data?.[0];
  if (named) {
    if (named.business_id && named.business_id !== businessId) {
      fail("business_relationship_name_collision_review_required", 409);
    }
    const { data: linked, error } = await admin.from("business_contact_relationships")
      .update({ business_id: businessId })
      .eq("id", named.id)
      .is("business_id", null)
      .select("*")
      .maybeSingle();
    if (error) fail("business_relationship_link_failed", 503);
    if (linked) return linked;
    const retry = await admin.from("business_contact_relationships")
      .select("*").eq("id", named.id).maybeSingle();
    if (retry.error || retry.data?.business_id !== businessId) {
      fail("business_relationship_name_collision_review_required", 409);
    }
    return retry.data;
  }

  const { data: inserted, error: insertError } = await admin.from("business_contact_relationships")
    .insert({
      contact_id: contactId,
      business_id: businessId,
      business_name: businessName,
      qualification: "needs_review",
      qualification_reason: "Customer-initiated checkout; no outreach qualification inferred.",
      campaign_eligible: false,
      do_not_contact: false,
      current_stage: "ready_to_stage",
      notes: "Created from business-scoped customer sales checkout.",
    })
    .select("*")
    .maybeSingle();
  if (!insertError && inserted) return inserted;

  // A concurrent checkout may have created the same BCR. Re-resolve by exact
  // person/business scope and fail closed if the relationship is still unclear.
  const raced = await admin.from("business_contact_relationships")
    .select("*").eq("contact_id", contactId).eq("business_id", businessId).limit(2);
  if (raced.error || (raced.data ?? []).length !== 1) fail("business_relationship_create_failed", 503);
  return raced.data[0];
}

async function writeAudit(admin: any, event: {
  idempotencyKey: string;
  eventType: string;
  businessId: string;
  contactId?: string | null;
  relationshipId?: string | null;
  checkoutId?: string | null;
  dealId?: string | null;
  paymentId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const { error } = await admin.from("customer_commercial_audit_events").upsert({
    idempotency_key: event.idempotencyKey,
    event_type: event.eventType,
    business_id: event.businessId,
    contact_id: event.contactId ?? null,
    business_contact_relationship_id: event.relationshipId ?? null,
    checkout_id: event.checkoutId ?? null,
    deal_id: event.dealId ?? null,
    payment_id: event.paymentId ?? null,
    event_payload: event.payload ?? {},
  }, { onConflict: "idempotency_key" });
  if (error) fail("commercial_audit_write_failed", 503);
}

async function resolveCheckoutScope(admin: any, body: z.infer<typeof Body>): Promise<CheckoutScope> {
  const { data: business, error: businessError } = await admin.from("businesses")
    .select("id,name").eq("id", body.business_id).maybeSingle();
  if (businessError || !business) fail("business_context_invalid", 409);

  const { data: offer, error: offerError } = await admin.from("customer_sales_offers")
    .select("*").eq("id", body.offer_id).eq("business_id", body.business_id).maybeSingle();
  if (offerError) fail("commercial_offer_lookup_failed", 503);
  if (!offer) fail("commercial_offer_not_owned_by_business", 409);
  if (!offer.product_id) fail("commercial_offer_product_required", 409);

  const { data: product, error: productError } = await admin.from("customer_sales_products")
    .select("*").eq("id", offer.product_id).eq("business_id", body.business_id).maybeSingle();
  if (productError) fail("commercial_product_lookup_failed", 503);
  if (!product) fail("commercial_product_not_owned_by_business", 409);

  const email = normalizedEmail(body.customer_email);
  const identity = await resolveGlobalContact(admin, email, body.customer_name);
  if (!identity.existed && hasRestrictedSegmentRules(offer)) fail("customer_segment_review_required", 409);
  const contact = identity.contact;
  const relationship = await resolveBusinessRelationship(admin, {
    contactId: contact.id,
    businessId: business.id,
    businessName: business.name,
  });
  return {
    businessId: business.id,
    businessName: business.name,
    contactId: contact.id,
    contact,
    relationship,
    product,
    offer,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let admin: any = null;
  let body: z.infer<typeof Body> | null = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) fail("supabase_server_configuration_missing", 500);

    const caller = await validateCallerJwt(req, supabaseUrl, anonKey);
    try { body = Body.parse(await req.json()); }
    catch { fail("invalid_checkout_request", 400); }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeSecretKey.startsWith("sk_test_")) fail("stripe_test_mode_key_required", 503);
    const successUrl = Deno.env.get("CUSTOMER_CHECKOUT_SUCCESS_URL");
    const cancelUrl = Deno.env.get("CUSTOMER_CHECKOUT_CANCEL_URL");
    if (!successUrl || !cancelUrl) fail("trusted_checkout_return_urls_required", 503);
    for (const candidate of [successUrl, cancelUrl]) {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.hostname !== "localhost") fail("invalid_trusted_checkout_return_url", 500);
    }

    // JWT validity is checked before creating or using the service-role client.
    // Public buyers are authorized only for active offers explicitly enabled
    // for standard checkout; authenticated callers use the same envelope.
    admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const scope = await resolveCheckoutScope(admin, body);
    const resolution = resolveApprovedCommercialOffer({
      businessId: scope.businessId,
      contactId: scope.contactId,
      offer: scope.offer,
      product: scope.product,
      relationship: scope.relationship,
      requestedDiscountPercent: body.requested_discount_percent,
    });
    if (!resolution.ok) fail(resolution.reason, 409);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
    let price: Stripe.Price;
    try { price = await stripe.prices.retrieve(resolution.stripePriceId); }
    catch { fail("approved_stripe_price_unavailable", 409); }
    const stripePriceCheck = validateStripePriceAgainstOffer({
      price,
      stripeProductId: scope.offer.stripe_product_id,
      approvedPriceAmount: resolution.approvedPriceAmount,
      currency: resolution.currency,
      recurrence: scope.offer.stripe_price_recurrence ?? null,
    });
    if (!stripePriceCheck.ok) fail(stripePriceCheck.reason, 409);

    const amount = approvedCheckoutAmount({
      approvedAmount: resolution.approvedPriceAmount,
      currency: resolution.currency,
      discountPercent: resolution.requestedDiscountPercent,
    });
    if (!amount.ok) fail(amount.reason, 409);

    const email = normalizedEmail(body.customer_email);
    const requestFingerprint = {
      business_id: scope.businessId,
      offer_id: scope.offer.id,
      customer_email: email,
      customer_name: body.customer_name?.trim() ?? "",
      requested_discount_percent: resolution.requestedDiscountPercent,
    };

    const { data: existingIntent, error: existingError } = await admin.from("customer_sales_checkout_intents")
      .select("*").eq("idempotency_key", body.idempotency_key).maybeSingle();
    if (existingError) fail("checkout_intent_lookup_failed", 503);
    if (existingIntent && stableJson(existingIntent.request_fingerprint) !== stableJson(requestFingerprint)) {
      fail("idempotency_key_reused_with_different_checkout", 409);
    }
    let intent = existingIntent;
    if (!intent) {
      const { data: created, error } = await admin.from("customer_sales_checkout_intents").insert({
        idempotency_key: body.idempotency_key,
        business_id: scope.businessId,
        contact_id: scope.contactId,
        business_contact_relationship_id: scope.relationship.id,
        product_id: scope.product.id,
        offer_id: scope.offer.id,
        customer_email: email,
        customer_name: body.customer_name?.trim() || scope.contact.name || null,
        discount_percent: resolution.requestedDiscountPercent,
        approved_price_amount: resolution.approvedPriceAmount,
        checkout_amount: amount.amount,
        checkout_amount_minor_units: amount.minorUnits,
        currency: resolution.currency,
        stripe_price_id: resolution.stripePriceId,
        status: "creating",
        test_mode: true,
        request_fingerprint: requestFingerprint,
      }).select("*").maybeSingle();
      if (!error && created) intent = created;
      else {
        const raced = await admin.from("customer_sales_checkout_intents")
          .select("*").eq("idempotency_key", body.idempotency_key).maybeSingle();
        if (raced.error || !raced.data) fail("checkout_intent_create_failed", 503);
        if (stableJson(raced.data.request_fingerprint) !== stableJson(requestFingerprint)) {
          fail("idempotency_key_reused_with_different_checkout", 409);
        }
        intent = raced.data;
      }
    }

    if (intent.status === "paid") {
      return json({ ok: true, paid: true, checkout_id: intent.id, test_mode: true });
    }
    if (intent.stripe_checkout_session_id) {
      const existingSession = await stripe.checkout.sessions.retrieve(intent.stripe_checkout_session_id);
      if (existingSession.status === "open" && existingSession.url) {
        await writeAudit(admin, {
          idempotencyKey: `checkout:${intent.id}:session_created`,
          eventType: "checkout_session_created",
          businessId: scope.businessId,
          contactId: scope.contactId,
          relationshipId: scope.relationship.id,
          checkoutId: intent.id,
          paymentId: intent.qtc_payment_id,
          payload: { stripe_session_id: existingSession.id, retry: true, test_mode: true },
        });
        return json({
          ok: true,
          checkout_url: existingSession.url,
          stripe_session_id: existingSession.id,
          checkout_id: intent.id,
          test_mode: true,
        });
      }
      if (existingSession.status === "complete") {
        return json({ ok: true, paid: existingSession.payment_status === "paid", checkout_id: intent.id, test_mode: true });
      }
      fail("checkout_session_expired_create_new_request", 409);
    }

    await writeAudit(admin, {
      idempotencyKey: `checkout:${intent.id}:intent_created`,
      eventType: "checkout_intent_created",
      businessId: scope.businessId,
      contactId: scope.contactId,
      relationshipId: scope.relationship.id,
      checkoutId: intent.id,
      payload: {
        product_id: scope.product.id,
        offer_id: scope.offer.id,
        approved_price_amount: resolution.approvedPriceAmount,
        currency: resolution.currency,
        discount_percent: resolution.requestedDiscountPercent,
        test_mode: true,
      },
    });

    let billingCustomer = await admin.from("customer_sales_billing_customers")
      .select("stripe_customer_id").eq("business_id", scope.businessId).eq("contact_id", scope.contactId).maybeSingle();
    if (billingCustomer.error) fail("billing_customer_lookup_failed", 503);
    let customerId = billingCustomer.data?.stripe_customer_id ?? null;
    if (!customerId) {
      const createdCustomer = await stripe.customers.create({
        email,
        name: body.customer_name?.trim() || scope.contact.name || undefined,
        metadata: {
          liftor_business_id: scope.businessId,
          liftor_contact_id: scope.contactId,
          liftor_bcr_id: scope.relationship.id,
        },
      }, { idempotencyKey: `customer-sales-billing-${scope.businessId}-${scope.contactId}` });
      const { data: savedBilling, error } = await admin.from("customer_sales_billing_customers").upsert({
        business_id: scope.businessId,
        contact_id: scope.contactId,
        stripe_customer_id: createdCustomer.id,
      }, { onConflict: "business_id,contact_id" }).select("stripe_customer_id").maybeSingle();
      if (error || !savedBilling) fail("billing_customer_record_failed", 503);
      customerId = savedBilling.stripe_customer_id;
    }

    let couponId: string | null = null;
    if (resolution.requestedDiscountPercent > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: resolution.requestedDiscountPercent,
        duration: "once",
        name: `Approved offer ${scope.offer.id}`,
        metadata: { customer_sales_checkout_id: intent.id, business_id: scope.businessId, offer_id: scope.offer.id },
      }, { idempotencyKey: `customer-sales-coupon-${intent.id}` });
      couponId = coupon.id;
    }

    const sessionMetadata = {
      customer_sales_checkout_id: intent.id,
      business_id: scope.businessId,
      contact_id: scope.contactId,
      business_contact_relationship_id: scope.relationship.id,
      product_id: scope.product.id,
      offer_id: scope.offer.id,
      approved_price_amount: String(resolution.approvedPriceAmount),
      approved_currency: resolution.currency,
      discount_percent: String(resolution.requestedDiscountPercent),
      stripe_price_id: resolution.stripePriceId,
      idempotency_key: body.idempotency_key,
    };
    const mode: Stripe.Checkout.SessionCreateParams.Mode = price.recurring ? "subscription" : "payment";
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      customer: customerId,
      client_reference_id: intent.id,
      line_items: [{ price: resolution.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      metadata: sessionMetadata,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      ...(mode === "subscription"
        ? { subscription_data: { metadata: sessionMetadata } }
        : { payment_intent_data: { metadata: sessionMetadata } }),
    };
    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: `customer-sales-session-${intent.id}`,
    });
    if (!session.id || !session.url) fail("stripe_checkout_session_not_created", 502);

    const { data: payment, error: paymentError } = await admin.from("qtc_payments").upsert({
      business_id: scope.businessId,
      business_contact_relationship_id: scope.relationship.id,
      business_name_snapshot: scope.businessName,
      contact_id: scope.contactId,
      product_id: scope.product.id,
      offer_id: scope.offer.id,
      payment_status: "pending",
      amount: amount.amount,
      gross_amount: amount.amount,
      currency: resolution.currency,
      provider_name: "stripe",
      payment_method: "card",
      stripe_customer_id: customerId,
      stripe_price_id: resolution.stripePriceId,
      stripe_product_id: scope.offer.stripe_product_id,
      stripe_checkout_session_id: session.id,
      customer_sales_checkout_id: intent.id,
      legal_entity: "GSM_LLC",
      revenue_owner_entity: "GSM_LLC",
      is_test_data: true,
      stripe_test_mode: true,
      founder_approval_required: false,
      founder_approved_at: null,
      audit_metadata: {
        source: "approved_customer_sales_offer",
        offer_id: scope.offer.id,
        approved_at: scope.offer.approved_at,
        approved_by: scope.offer.approved_by,
        requested_discount_percent: resolution.requestedDiscountPercent,
        checkout_amount_minor_units: amount.minorUnits,
        caller_kind: caller.kind,
      },
    }, { onConflict: "customer_sales_checkout_id" }).select("id").maybeSingle();
    if (paymentError || !payment) fail("qtc_payment_create_failed", 503);

    const { error: updateError } = await admin.from("customer_sales_checkout_intents").update({
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      qtc_payment_id: payment.id,
      status: "pending",
      failure_reason: null,
    }).eq("id", intent.id);
    if (updateError) fail("checkout_intent_update_failed", 503);

    await writeAudit(admin, {
      idempotencyKey: `checkout:${intent.id}:session_created`,
      eventType: "checkout_session_created",
      businessId: scope.businessId,
      contactId: scope.contactId,
      relationshipId: scope.relationship.id,
      checkoutId: intent.id,
      paymentId: payment.id,
      payload: {
        product_id: scope.product.id,
        offer_id: scope.offer.id,
        approved_amount: resolution.approvedPriceAmount,
        checkout_amount: amount.amount,
        currency: resolution.currency,
        discount_percent: resolution.requestedDiscountPercent,
        stripe_price_id: resolution.stripePriceId,
        test_mode: true,
      },
    });

    return json({
      ok: true,
      checkout_url: session.url,
      stripe_session_id: session.id,
      checkout_id: intent.id,
      qtc_payment_id: payment.id,
      mode,
      test_mode: true,
    });
  } catch (error) {
    if (error instanceof CheckoutFailure) return json({ ok: false, error: error.code }, error.status);
    console.error("customer checkout failed", error);
    return json({ ok: false, error: "checkout_failed" }, 500);
  }
});
