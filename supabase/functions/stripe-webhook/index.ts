// Stripe webhook receiver (TEST MODE).
// - Verifies signature with STRIPE_WEBHOOK_SECRET.
// - Idempotent via stripe_webhook_events (unique stripe_event_id).
// - Updates qtc_payments / qtc_invoices.
// - Writes verified qtc_revenue_confirmations only when business_id is present and event is verified.
// - Preserves sale_ready trigger (it runs on qtc_payments updates).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";
import {
  customerProductProvisioningRole,
  evaluateCustomerSuccessAction,
  paymentActivationIdempotencyKeys,
  planCustomerSuccessActivation,
  stripeMinorUnitsToMajor,
  validatePaidCheckoutSnapshot,
} from "../_shared/customerCommercialLifecycle.ts";
import {
  provisionPaidCustomerProductAccount,
  resolveOrInviteCustomerIdentity,
} from "../_shared/customerAuthProvisioning.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, service);

// deno-lint-ignore no-explicit-any
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any }) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 500, headers: corsHeaders });
  }
  if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    return new Response("Stripe webhook is test-mode-only", { status: 503, headers: corsHeaders });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Signature verification failed: ${(e as Error).message}`, { status: 400, headers: corsHeaders });
  }

  // Idempotency: skip if event already stored
  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("id, processing_status")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing && existing.processing_status === "processed") {
    return ok({ duplicate: true, event_id: event.id });
  }

  // Persist the event (let the unique constraint enforce idempotency on race)
  const { error: logErr } = await admin.from("stripe_webhook_events").upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      api_version: event.api_version,
      payload: event as unknown as Record<string, unknown>,
      processing_status: "received",
    },
    { onConflict: "stripe_event_id" },
  );
  if (logErr) console.error("webhook log error", logErr);

  try {
    if (event.livemode) {
      await admin.from("stripe_webhook_events").update({
        processing_status: "rejected",
        processing_error: "live_mode_not_enabled",
      }).eq("stripe_event_id", event.id);
      return new Response("Live Stripe events are not enabled", { status: 400, headers: corsHeaders });
    }
    await handleEvent(event);
    await admin
      .from("stripe_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
    return ok({ received: true });
  } catch (e) {
    await admin
      .from("stripe_webhook_events")
      .update({ processing_status: "error", processing_error: (e as Error).message })
      .eq("stripe_event_id", event.id);
    return new Response(`Handler error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event);
    case "checkout.session.async_payment_succeeded":
      return activatePaidCustomerSalesCheckout(event.data.object as Stripe.Checkout.Session, event);
    case "payment_intent.succeeded":
      return handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event);
    case "invoice.paid":
      return handleInvoicePaid(event.data.object as Stripe.Invoice, event);
    case "invoice.payment_failed":
      return handleInvoiceFailed(event.data.object as Stripe.Invoice, event);
    case "charge.refunded":
      return handleChargeRefunded(event.data.object as Stripe.Charge, event);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionChange(event.data.object as Stripe.Subscription, event);
    default:
      return; // event logged for audit, no action
  }
}

type Meta = Record<string, string | undefined>;
function readMeta(m?: Stripe.Metadata | null): Meta {
  return (m ?? {}) as Meta;
}

async function auditCommercialTransition(input: {
  key: string;
  type: string;
  intent: any;
  dealId?: string | null;
  paymentId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const { intent } = input;
  const { error } = await admin.from("customer_commercial_audit_events").upsert({
    idempotency_key: input.key,
    event_type: input.type,
    business_id: intent.business_id,
    contact_id: intent.contact_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    checkout_id: intent.id,
    deal_id: input.dealId ?? null,
    payment_id: input.paymentId ?? null,
    event_payload: input.payload ?? {},
  }, { onConflict: "idempotency_key" });
  if (error) throw new Error(`commercial audit write failed: ${error.message}`);
}

async function activationRiskFlags(intent: any): Promise<string[]> {
  const flags: string[] = [];
  const [complaints, disputes, support] = await Promise.all([
    admin.from("customer_complaints").select("id,status").eq("business_id", intent.business_id).eq("contact_id", intent.contact_id).limit(50),
    admin.from("customer_disputes").select("id,status").eq("business_id", intent.business_id).eq("contact_id", intent.contact_id).limit(50),
    admin.from("support_interaction_reviews").select("severity").eq("business_id", intent.business_id).eq("contact_id", intent.contact_id).limit(50),
  ]);
  if (complaints.error) flags.push("low_ai_confidence");
  else if ((complaints.data ?? []).some((row: any) => !["resolved", "closed"].includes(String(row.status).toLowerCase()))) flags.push("complaint");
  if (disputes.error) flags.push("low_ai_confidence");
  else if ((disputes.data ?? []).some((row: any) => !["resolved", "closed"].includes(String(row.status).toLowerCase()))) flags.push("dispute");
  if (support.error) flags.push("low_ai_confidence");
  else if ((support.data ?? []).some((row: any) => String(row.severity).toLowerCase() === "high")) flags.push("safety_risk");
  return flags;
}

async function findApprovedOnboardingSurveyTemplate(businessId: string) {
  const businessTemplate = await admin.from("customer_survey_templates").select("id,template_key,survey_type,questions")
    .eq("business_id", businessId).eq("survey_type", "post_interaction_csat")
    .eq("active", true).eq("auto_send_allowed", true).eq("founder_approval_required", false).limit(2);
  if (businessTemplate.error) return null;
  if ((businessTemplate.data ?? []).length > 1) return null;
  if (businessTemplate.data?.[0]) return businessTemplate.data[0];
  const globalTemplate = await admin.from("customer_survey_templates").select("id,template_key,survey_type,questions")
    .is("business_id", null).eq("survey_type", "post_interaction_csat")
    .eq("active", true).eq("auto_send_allowed", true).eq("founder_approval_required", false).limit(2);
  if (globalTemplate.error || (globalTemplate.data ?? []).length !== 1) return null;
  return globalTemplate.data[0];
}

async function activatePaidCustomerSalesCheckout(session: Stripe.Checkout.Session, event: Stripe.Event) {
  const meta = readMeta(session.metadata);
  const checkoutId = meta.customer_sales_checkout_id;
  if (!checkoutId) return false;

  const { data: intent, error: intentError } = await admin.from("customer_sales_checkout_intents")
    .select("*").eq("id", checkoutId).maybeSingle();
  if (intentError) throw new Error(`checkout intent lookup failed: ${intentError.message}`);
  if (!intent) throw new Error("standard checkout intent not found");

  const snapshot = validatePaidCheckoutSnapshot({ intent, session, eventLivemode: event.livemode });
  if (!snapshot.ok) {
    const now = new Date().toISOString();
    await admin.from("customer_sales_checkout_intents")
      .update({ status: "payment_discrepancy", failure_reason: snapshot.reason })
      .eq("id", intent.id);
    await auditCommercialTransition({
      key: `checkout:${intent.id}:payment_discrepancy`,
      type: "payment_discrepancy",
      intent,
      payload: { reason: snapshot.reason, stripe_event_id: event.id, detected_at: now },
    });
    return true;
  }

  const { data: business, error: businessError } = await admin.from("businesses")
    .select("id,name").eq("id", intent.business_id).maybeSingle();
  const { data: product, error: productError } = await admin.from("customer_sales_products")
    .select("id,business_id,product_name,requires_customer_account")
    .eq("id", intent.product_id).eq("business_id", intent.business_id).maybeSingle();
  const { data: offer, error: offerError } = await admin.from("customer_sales_offers")
    .select("id,business_id,offer_name,stripe_product_id").eq("id", intent.offer_id).eq("business_id", intent.business_id).maybeSingle();
  if (businessError || !business || productError || !product || offerError || !offer) {
    throw new Error("paid checkout business/product/offer context is unavailable");
  }

  const bcrCheck = await admin.from("business_contact_relationships")
    .select("id,contact_id,business_id").eq("id", intent.business_contact_relationship_id).maybeSingle();
  if (bcrCheck.error || !bcrCheck.data || bcrCheck.data.contact_id !== intent.contact_id || bcrCheck.data.business_id !== intent.business_id) {
    throw new Error("paid checkout relationship context mismatch");
  }
  const canonicalContact = await admin.from("contacts").select("id,email")
    .eq("id", intent.contact_id).maybeSingle();
  const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
  if (canonicalContact.error || !canonicalContact.data || !normalizeEmail(canonicalContact.data.email) ||
      normalizeEmail(canonicalContact.data.email) !== normalizeEmail(intent.customer_email)) {
    throw new Error("paid checkout canonical contact identity mismatch");
  }

  const now = new Date().toISOString();
  const currency = String(session.currency ?? intent.currency).toUpperCase();
  const amount = stripeMinorUnitsToMajor(session.amount_total, currency);
  if (amount === null || Math.abs(amount - Number(intent.checkout_amount)) > 1e-8) {
    throw new Error("paid_checkout_amount_conversion_mismatch");
  }
  const sessionCustomer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const dealName = `${product.product_name} — ${offer.offer_name}`;

  const { data: deal, error: dealError } = await admin.from("deals").upsert({
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    business_name: business.name,
    contact_id: intent.contact_id,
    product_id: intent.product_id,
    offer_id: intent.offer_id,
    customer_sales_checkout_id: intent.id,
    deal_name: dealName,
    estimated_value_min: amount,
    estimated_value_max: amount,
    probability: 100,
    status: "WON",
    currency,
    notes: `Stripe checkout ${session.id}; approved offer ${offer.id}; test mode.`,
    won_at: now,
  }, { onConflict: "customer_sales_checkout_id" }).select("id").maybeSingle();
  if (dealError || !deal) throw new Error(`paid deal upsert failed: ${dealError?.message ?? "missing row"}`);

  const { data: payment, error: paymentError } = await admin.from("qtc_payments").upsert({
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    business_name_snapshot: business.name,
    contact_id: intent.contact_id,
    deal_id: deal.id,
    product_id: intent.product_id,
    offer_id: intent.offer_id,
    payment_status: "succeeded",
    amount,
    gross_amount: amount,
    // Until Stripe's balance transaction reports its fee, recognize the
    // verified checkout amount as the provisional net and reconcile below.
    net_amount: amount,
    currency,
    provider_name: "stripe",
    payment_method: "card",
    stripe_customer_id: sessionCustomer,
    stripe_price_id: intent.stripe_price_id,
    stripe_product_id: offer.stripe_product_id,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntent,
    stripe_subscription_id: subscriptionId,
    stripe_event_id: event.id,
    customer_sales_checkout_id: intent.id,
    received_at: now,
    webhook_confirmation_source: event.type,
    legal_entity: "GSM_LLC",
    revenue_owner_entity: "GSM_LLC",
    is_test_data: true,
    stripe_test_mode: true,
    founder_approval_required: false,
    founder_approved_at: null,
    audit_metadata: { source: "verified_stripe_checkout", stripe_event_id: event.id, test_mode: true },
  }, { onConflict: "customer_sales_checkout_id" }).select("id,net_amount").maybeSingle();
  if (paymentError || !payment) throw new Error(`paid payment upsert failed: ${paymentError?.message ?? "missing row"}`);

  const { error: revenueError } = await admin.from("qtc_revenue_confirmations").upsert({
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    business_name_snapshot: business.name,
    contact_id: intent.contact_id,
    deal_id: deal.id,
    payment_id: payment.id,
    customer_sales_checkout_id: intent.id,
    revenue_amount: payment.net_amount ?? amount,
    currency,
    revenue_type: subscriptionId ? "subscription" : "one_time",
    confirmation_source: "payment_provider",
    legal_entity: "GSM_LLC",
    revenue_owner_entity: "GSM_LLC",
    sale_ready: false,
    is_test_data: true,
    stripe_event_id: event.id,
    stripe_verified: true,
    metadata_json: { stripe_event_type: event.type, stripe_checkout_session_id: session.id, original_revenue_amount: payment.net_amount ?? amount, test_mode: true },
    audit_metadata: { customer_sales_checkout_id: intent.id, idempotency_key: paymentActivationIdempotencyKeys(intent.id).revenue },
  }, { onConflict: "customer_sales_checkout_id" });
  if (revenueError) throw new Error(`revenue confirmation upsert failed: ${revenueError.message}`);

  const { error: intentUpdateError } = await admin.from("customer_sales_checkout_intents").update({
    status: "paid", paid_at: now, qtc_payment_id: payment.id,
    stripe_customer_id: sessionCustomer, stripe_checkout_session_id: session.id, failure_reason: null,
  }).eq("id", intent.id);
  if (intentUpdateError) throw new Error(`checkout paid transition failed: ${intentUpdateError.message}`);

  const { data: clientRelationship, error: relationshipError } = await admin.from("business_contact_relationships")
    .update({
      current_stage: "client",
      qualification: "qualified",
      qualification_reason: "Verified successful payment for an approved business offer.",
      campaign_eligible: false,
    })
    .eq("id", intent.business_contact_relationship_id)
    .eq("contact_id", intent.contact_id)
    .eq("business_id", intent.business_id)
    .select("id")
    .maybeSingle();
  if (relationshipError || !clientRelationship) throw new Error(`customer relationship activation failed: ${relationshipError?.message ?? "missing row"}`);

  let productAccountId: string | null = null;
  let productAccountAccessStatus: string | null = null;
  let customerAuthUserId: string | null = null;
  if (product.requires_customer_account === true) {
    let identityCreated = false;
    let provisioningStage = "customer_auth_identity";
    try {
      const identity = await resolveOrInviteCustomerIdentity(admin.auth.admin, canonicalContact.data.email);
      customerAuthUserId = identity.user.id;
      identityCreated = identity.created;
      provisioningStage = "customer_product_account";
      const productAccount = await provisionPaidCustomerProductAccount({
        businessId: intent.business_id,
        contactId: intent.contact_id,
        relationshipId: intent.business_contact_relationship_id,
        productId: intent.product_id,
        offerId: intent.offer_id,
        paymentId: payment.id,
        checkoutId: intent.id,
        authUser: identity.user,
      }, {
        upsert: async (row) => await admin.from("customer_product_accounts").upsert(row, {
          onConflict: "checkout_id,product_id", ignoreDuplicates: true,
        }),
        find: async (checkoutId, productId) => await admin.from("customer_product_accounts")
            .select("id,business_id,contact_id,business_contact_relationship_id,product_id,offer_id,payment_id,checkout_id,auth_user_id,account_scope,account_role,access_status")
            .eq("checkout_id", checkoutId).eq("product_id", productId).maybeSingle(),
        attachIdentity: async (accountId, authUserId) => await admin.from("customer_product_accounts")
            .update({ auth_user_id: authUserId }).eq("id", accountId).is("auth_user_id", null),
      });
      productAccountId = productAccount.id;
      productAccountAccessStatus = productAccount.access_status;
      await auditCommercialTransition({
        key: `checkout:${intent.id}:customer_identity_linked`,
        type: "customer_auth_identity_linked",
        intent,
        dealId: deal.id,
        paymentId: payment.id,
        payload: {
          auth_user_id: identity.user.id,
          created_by_invite: identity.created,
          product_account_id: productAccount.id,
          account_role: productAccount.account_role,
          access_status: productAccount.access_status,
        },
      });
    } catch (error) {
      await auditCommercialTransition({
        key: `checkout:${intent.id}:customer_identity_provisioning_failed`,
        type: "customer_identity_provisioning_failed",
        intent,
        dealId: deal.id,
        paymentId: payment.id,
        payload: { stage: provisioningStage, retryable: true },
      });
      throw error;
    }
  }

  const profileData = {
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    customer_sales_checkout_id: intent.id,
    crm_contact_id: intent.contact_id,
    customer_email: intent.customer_email,
    customer_name: intent.customer_name,
    account_name: null,
    customer_type: "customer",
    lifecycle_stage: "onboarding",
    success_status: "active",
    purchased_offer: offer.offer_name,
    start_date: now.slice(0, 10),
    subscription_status: subscriptionId ? "active" : "one_time_paid",
    is_test_data: true,
    metadata: {
      checkout_id: intent.id,
      deal_id: deal.id,
      payment_id: payment.id,
      contact_id: intent.contact_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      product_id: intent.product_id,
      offer_id: intent.offer_id,
    },
  };
  const { error: profileUpsertError } = await admin.from("customer_success_profiles")
    .upsert(profileData, { onConflict: "customer_sales_checkout_id", ignoreDuplicates: true });
  const { data: profile, error: profileReadError } = await admin.from("customer_success_profiles")
    .select("id").eq("customer_sales_checkout_id", intent.id).maybeSingle();
  if (profileUpsertError || profileReadError || !profile) throw new Error(`customer state upsert failed: ${profileUpsertError?.message ?? profileReadError?.message ?? "missing row"}`);

  const customerActions = [
    { key: "confirm-contact", title: "Confirm the primary customer contact", due: 2 },
    { key: "share-access", title: "Share access to required tools and accounts", due: 5 },
    { key: "confirm-success-criteria", title: "Confirm first 30-day success criteria", due: 7 },
  ];
  const companyActions = [
    { key: "welcome-pack", title: "Prepare customer welcome pack", due: 1 },
    { key: "kickoff", title: "Schedule onboarding kick-off", due: 3 },
    { key: "configure", title: "Configure the customer environment", due: 7 },
    { key: "first-checkin", title: "Complete first customer check-in", due: 14 },
  ];
  const schedule = [
    { type: "kick_off", day: 3 }, { type: "first_check_in", day: 14 },
    { type: "bedding_in_review", day: 30 }, { type: "quarterly_review", day: 90 },
  ];
  const plan = {
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    customer_sales_checkout_id: intent.id,
    contact_id: intent.contact_id,
    crm_contact_id: intent.contact_id,
    deal_id: deal.id,
    success_profile_id: profile.id,
    onboarding_status: "active",
    onboarding_type: "paid_customer_onboarding",
    plan_name: `${product.product_name} onboarding`,
    customer_goal: `Achieve the approved outcome for ${product.product_name}.`,
    success_definition: "Customer confirms first value and first check-in by day 30.",
    welcome_summary: `Welcome to ${business.name}. Your ${product.product_name} onboarding journey has started.`,
    customer_facing_instructions: `Your onboarding journey for ${product.product_name} has started. The account team will guide the first setup and check-in steps.`,
    required_customer_actions: customerActions.map(({ title, due }) => ({ title, due_in_days: due })),
    required_company_actions: companyActions.map(({ title, due }) => ({ title, due_in_days: due })),
    check_in_schedule: schedule,
    timeline: [{ phase: "Welcome", start_day: 0, end_day: 3 }, { phase: "Setup", start_day: 3, end_day: 14 }, { phase: "Bedding-in", start_day: 14, end_day: 30 }],
    milestones: [{ name: "Kick-off complete", day: 3 }, { name: "First value delivered", day: 14 }, { name: "Bedding-in review", day: 30 }],
    owner_agent_key: "customer_success_agent",
    founder_review_required: false,
    approval_status: "approved",
    approved_at: now,
    customer_share_allowed: false,
    external_share_allowed: false,
    is_test_data: true,
    metadata: { activation_source: "verified_stripe_payment", test_mode: true, checkout_id: intent.id },
  };
  const { error: planUpsertError } = await admin.from("customer_onboarding_plans")
    .upsert(plan, { onConflict: "customer_sales_checkout_id", ignoreDuplicates: true });
  const { data: onboardingPlan, error: planReadError } = await admin.from("customer_onboarding_plans")
    .select("id").eq("customer_sales_checkout_id", intent.id).maybeSingle();
  if (planUpsertError || planReadError || !onboardingPlan) throw new Error(`onboarding plan upsert failed: ${planUpsertError?.message ?? planReadError?.message ?? "missing row"}`);

  const taskRows = [
    ...customerActions.map((action) => ({
      idempotency_key: `checkout:${intent.id}:task:${action.key}`,
      customer_sales_checkout_id: intent.id,
      business_id: intent.business_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      contact_id: intent.contact_id,
      onboarding_plan_id: onboardingPlan.id,
      task_owner: "customer",
      task_title: action.title,
      due_at: new Date(Date.now() + action.due * 86400000).toISOString(),
      customer_visible: true,
      founder_review_required: false,
      task_status: "pending",
    })),
    ...companyActions.map((action) => ({
      idempotency_key: `checkout:${intent.id}:task:${action.key}`,
      customer_sales_checkout_id: intent.id,
      business_id: intent.business_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      contact_id: intent.contact_id,
      onboarding_plan_id: onboardingPlan.id,
      task_owner: "company",
      owner_agent_key: "customer_success_agent",
      task_title: action.title,
      due_at: new Date(Date.now() + action.due * 86400000).toISOString(),
      customer_visible: false,
      founder_review_required: false,
      task_status: "pending",
    })),
  ];
  const { error: taskError } = await admin.from("customer_onboarding_tasks").upsert(taskRows, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (taskError) throw new Error(`onboarding task upsert failed: ${taskError.message}`);

  const emailDraftRows = [
    {
      idempotency_key: `checkout:${intent.id}:draft:welcome`,
      customer_sales_checkout_id: intent.id,
      business_id: intent.business_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      contact_id: intent.contact_id,
      onboarding_plan_id: onboardingPlan.id,
      draft_type: "welcome_email",
      draft_subject: `Welcome to ${business.name}`,
      draft_body: plan.customer_facing_instructions,
      customer_facing: true,
      approval_status: "approved",
      send_allowed: false,
      founder_review_required: false,
      metadata: { standard_template: "customer_welcome_v1", checkout_id: intent.id, provider_gate_required: true },
    },
    {
      idempotency_key: `checkout:${intent.id}:draft:first_checkin`,
      customer_sales_checkout_id: intent.id,
      business_id: intent.business_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      contact_id: intent.contact_id,
      onboarding_plan_id: onboardingPlan.id,
      draft_type: "bedding_in_email",
      draft_subject: "Your first 30 days",
      draft_body: `Your first check-in is planned for day 14. Reply to this message if you need support before then.`,
      customer_facing: true,
      approval_status: "approved",
      send_allowed: false,
      founder_review_required: false,
      metadata: { standard_template: "customer_checkin_v1", checkout_id: intent.id, provider_gate_required: true },
    },
  ];
  const { error: emailDraftError } = await admin.from("onboarding_email_drafts").upsert(emailDraftRows, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (emailDraftError) throw new Error(`onboarding welcome draft upsert failed: ${emailDraftError.message}`);

  const welcomePackRow = {
    business_id: intent.business_id,
    business_contact_relationship_id: intent.business_contact_relationship_id,
    customer_sales_checkout_id: intent.id,
    contact_id: intent.contact_id,
    success_profile_id: profile.id,
    onboarding_plan_id: onboardingPlan.id,
    pack_name: `${business.name} customer welcome`,
    pack_type: "product_onboarding",
    pack_status: "ready",
    welcome_copy: plan.customer_facing_instructions,
    getting_started_steps: [{ day: 0, action: "Read welcome instructions" }, ...schedule.map((entry) => ({ day: entry.day, action: entry.type }))],
    approval_status: "approved",
    external_share_allowed: false,
    is_test_data: true,
    metadata: { checkout_id: intent.id, provider_gate_required: true },
  };
  const { error: welcomeUpsertError } = await admin.from("customer_welcome_packs").upsert(welcomePackRow, {
    onConflict: "customer_sales_checkout_id", ignoreDuplicates: true,
  });
  const { data: welcomePack, error: welcomeReadError } = await admin.from("customer_welcome_packs")
    .select("id").eq("customer_sales_checkout_id", intent.id).maybeSingle();
  if (welcomeUpsertError || welcomeReadError || !welcomePack) throw new Error(`welcome pack upsert failed: ${welcomeUpsertError?.message ?? welcomeReadError?.message ?? "missing row"}`);

  const policyResult = await admin.from("customer_success_execution_policies").select("*")
    .eq("business_id", intent.business_id).maybeSingle();
  const policy = policyResult.error ? null : policyResult.data;
  const riskFlags = await activationRiskFlags(intent);
  const surveyTemplate = await findApprovedOnboardingSurveyTemplate(intent.business_id);
  const plannedActions = planCustomerSuccessActivation({
    checkoutId: intent.id,
    requiresCustomerAccount: product.requires_customer_account === true,
    recurring: !!subscriptionId,
  }).filter((row) => row.actionType !== "approved_survey" || !!surveyTemplate);
  const queueRows = plannedActions.map((row: any) => {
    const isSurvey = row.actionType === "approved_survey";
    const decision = evaluateCustomerSuccessAction({
      actionType: row.actionType,
      policy,
      riskFlags,
      confidence: 1,
      approvedContent: row.actionType === "onboarding_welcome" || (isSurvey && !!surveyTemplate),
      paymentVerified: row.actionType === "product_account_activation",
    });
    const executionStatus = decision.mode === "escalate" ? "escalated" : row.executionStatus;
    return {
      idempotency_key: row.idempotencyKey,
      business_id: intent.business_id,
      contact_id: intent.contact_id,
      business_contact_relationship_id: intent.business_contact_relationship_id,
      success_profile_id: profile.id,
      onboarding_plan_id: onboardingPlan.id,
      checkout_id: intent.id,
      action_type: row.actionType,
      execution_status: executionStatus,
      execution_mode: decision.mode,
      approval_required: decision.approvalRequired,
      escalation_reason: decision.reason,
      confidence_score: 1,
      risk_flags: riskFlags,
      scheduled_at: row.scheduledInDays === 0 ? null : new Date(Date.now() + Number(row.scheduledInDays ?? 0) * 86400000).toISOString(),
      action_payload: {
        test_mode: true,
        provider_gate_required: ["onboarding_welcome", "ordinary_checkin", "approved_survey"].includes(row.actionType),
        survey_template_id: isSurvey ? surveyTemplate?.id ?? null : null,
        product_account_id: row.actionType === "onboarding_start" ? productAccountId : null,
      },
    };
  });
  const { error: queueError } = await admin.from("customer_success_automation_queue")
    .upsert(queueRows, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (queueError) throw new Error(`customer success queue upsert failed: ${queueError.message}`);

  const activationKeys = paymentActivationIdempotencyKeys(intent.id);
  const transitions: Array<[string, string, Record<string, unknown>]> = [
    [activationKeys.deal, "deal_won", { deal_id: deal.id, deal_name: dealName, amount, currency }],
    [activationKeys.payment, "payment_succeeded", { payment_id: payment.id, session_id: session.id, test_mode: true }],
    [activationKeys.revenue, "revenue_confirmed", { amount: payment.net_amount ?? amount, currency, revenue_type: subscriptionId ? "subscription" : "one_time" }],
    [activationKeys.customer, "customer_activated", { profile_id: profile.id, relationship_id: intent.business_contact_relationship_id }],
    [activationKeys.onboarding, "onboarding_started", { onboarding_plan_id: onboardingPlan.id, task_count: taskRows.length }],
    [activationKeys.welcome, "customer_welcome_prepared", { welcome_pack_id: welcomePack.id, external_send: false }],
  ];
  if (productAccountId) transitions.push([activationKeys.productAccount, "customer_product_account_provisioned", {
    product_account_id: productAccountId,
    auth_user_id: customerAuthUserId,
    access_status: productAccountAccessStatus,
    role: customerProductProvisioningRole(),
  }]);
  for (const row of plannedActions) {
    const queued = queueRows.find((candidate: any) => candidate.idempotency_key === row.idempotencyKey);
    transitions.push([
      row.idempotencyKey,
      queued?.execution_status === "escalated" ? "customer_success_action_escalated" : "customer_success_action_queued",
      {
        action_type: row.actionType,
        execution_status: queued?.execution_status ?? row.executionStatus,
        approval_required: queued?.approval_required ?? row.approvalRequired,
        escalation_reason: queued?.escalation_reason ?? null,
      },
    ]);
  }
  for (const [key, type, payload] of transitions) {
    await auditCommercialTransition({ key, type, intent, dealId: deal.id, paymentId: payment.id, payload });
  }
  await dispatchCustomerSuccessRunner(intent);
  return true;
}

async function dispatchCustomerSuccessRunner(intent: any) {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  if (!cronSecret) {
    await auditCommercialTransition({
      key: `checkout:${intent.id}:customer_success_runner_dispatch`,
      type: "customer_success_runner_dispatch_unavailable",
      intent,
      payload: { reason: "CRON_SECRET_not_configured", queue_remains_retryable: true },
    });
    return;
  }
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/customer-success-standard-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret },
      body: JSON.stringify({ business_id: intent.business_id, limit: 25 }),
    });
    if (!response.ok) throw new Error(`runner returned ${response.status}`);
    await auditCommercialTransition({
      key: `checkout:${intent.id}:customer_success_runner_dispatch`,
      type: "customer_success_runner_dispatched",
      intent,
      payload: { http_status: response.status, queue_remains_retryable: true },
    });
  } catch (error) {
    await auditCommercialTransition({
      key: `checkout:${intent.id}:customer_success_runner_dispatch`,
      type: "customer_success_runner_dispatch_failed",
      intent,
      payload: { reason: String(error instanceof Error ? error.message : error).slice(0, 300), queue_remains_retryable: true },
    });
  }
}

async function findPayment(opts: {
  session_id?: string | null;
  payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
}) {
  let q = admin.from("qtc_payments").select("*").limit(1);
  if (opts.session_id) {
    const { data } = await admin.from("qtc_payments").select("*").eq("stripe_checkout_session_id", opts.session_id).limit(1).maybeSingle();
    if (data) return data;
  }
  if (opts.payment_intent_id) {
    const { data } = await admin.from("qtc_payments").select("*").eq("stripe_payment_intent_id", opts.payment_intent_id).limit(1).maybeSingle();
    if (data) return data;
  }
  if (opts.stripe_invoice_id) {
    const { data } = await admin.from("qtc_payments").select("*").eq("stripe_invoice_id", opts.stripe_invoice_id).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function ensureRevenueConfirmation(opts: {
  payment: any;
  event: Stripe.Event;
  revenueAmount: number;
  revenueType: string;
}) {
  const { payment, event, revenueAmount, revenueType } = opts;
  if (!payment?.business_id) {
    console.warn(`[stripe-webhook] Skipping revenue confirmation: missing business_id for event ${event.id}`);
    return;
  }
  // Standard Customer Sales checkouts create their single revenue link in the
  // paid activation transaction. This prevents checkout.session.completed,
  // payment_intent.succeeded, and invoice.paid from double-counting it.
  if (payment.customer_sales_checkout_id) return;
  // Idempotency: one confirmation per (payment_id, stripe_event_id)
  const { data: existing } = await admin
    .from("qtc_revenue_confirmations")
    .select("id")
    .eq("payment_id", payment.id)
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) return;

  await admin.from("qtc_revenue_confirmations").insert({
    business_id: payment.business_id,
    contact_id: payment.contact_id,
    deal_id: payment.deal_id,
    invoice_id: payment.invoice_id,
    payment_id: payment.id,
    revenue_amount: revenueAmount,
    currency: payment.currency,
    revenue_type: revenueType,
    confirmation_source: "payment_provider",
    business_name_snapshot: payment.business_name_snapshot,
    brand_name: payment.brand_name,
    saleable_asset_group: payment.saleable_asset_group,
    legal_entity: payment.legal_entity,
    revenue_owner_entity: payment.revenue_owner_entity,
    sale_ready: !!payment.sale_ready,
    is_test_data: !!payment.is_test_data,
    stripe_event_id: event.id,
    stripe_verified: true,
    metadata_json: { stripe_event_type: event.type },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, event: Stripe.Event) {
  const meta = readMeta(session.metadata);
  if (meta.customer_sales_checkout_id) {
    if (session.payment_status === "paid") await activatePaidCustomerSalesCheckout(session, event);
    return;
  }
  const grossCents = session.amount_total ?? 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  const currency = (session.currency ?? "usd").toUpperCase();

  const payment = await findPayment({ session_id: session.id });
  const update: Record<string, unknown> = {
    payment_status: session.payment_status === "paid" ? "succeeded" : "pending",
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : payment?.stripe_customer_id ?? null,
    stripe_event_id: event.id,
    gross_amount: grossCents / 100,
    tax_amount: taxCents / 100,
    currency,
    received_at: new Date().toISOString(),
    webhook_confirmation_source: "stripe.checkout.session.completed",
    is_test_data: !event.livemode,
    stripe_test_mode: !event.livemode,
  };

  if (payment) {
    await admin.from("qtc_payments").update(update).eq("id", payment.id);
  } else {
    // Defensive: webhook arrived without our pre-created row (shouldn't happen in our flow)
    if (!meta.business_id) return; // never confirm revenue without a business
    await admin.from("qtc_payments").insert({
      business_id: meta.business_id,
      business_name_snapshot: meta.business_name_snapshot ?? null,
      brand_name: meta.brand_name ?? null,
      saleable_asset_group: meta.saleable_asset_group ?? null,
      legal_entity: meta.legal_entity ?? "GSM_LLC",
      revenue_owner_entity: meta.revenue_owner_entity ?? meta.legal_entity ?? "GSM_LLC",
      payment_status: update.payment_status,
      amount: grossCents / 100,
      provider_name: "stripe",
      stripe_checkout_session_id: session.id,
      customer_country: meta.customer_country ?? null,
      customer_state_region: meta.customer_state_region ?? null,
      temporary_payout_account_used: meta.temporary_payout_account_used === "true",
      transfer_required_to_primary_account: meta.temporary_payout_account_used === "true",
      ...update,
      audit_metadata: { source: "stripe-webhook", event_id: event.id },
    });
  }
  // Revenue confirmation runs on payment_intent.succeeded / invoice.paid (one source of truth).
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent, event: Stripe.Event) {
  const payment = await findPayment({ payment_intent_id: pi.id });
  if (!payment) return;

  let charge: Stripe.Charge | null = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
  if (!charge && typeof pi.latest_charge === "string" && stripe) {
    try { charge = await stripe.charges.retrieve(pi.latest_charge, { expand: ["balance_transaction"] }); }
    catch { charge = null; }
  }
  const balanceTransaction = charge?.balance_transaction;
  const feeCents = balanceTransaction && typeof balanceTransaction !== "string" ? balanceTransaction.fee : 0;
  const grossAmount = (pi.amount ?? 0) / 100;
  const netAmount = Math.max(0, grossAmount - feeCents / 100);

  await admin.from("qtc_payments").update({
    payment_status: "succeeded",
    stripe_payment_intent_id: pi.id,
    stripe_event_id: event.id,
    gross_amount: grossAmount,
    stripe_fee_amount: feeCents / 100,
    net_amount: netAmount,
    currency: (pi.currency ?? "usd").toUpperCase(),
    received_at: new Date().toISOString(),
    webhook_confirmation_source: "stripe.payment_intent.succeeded",
  }).eq("id", payment.id);

  const { data: refreshed } = await admin.from("qtc_payments").select("*").eq("id", payment.id).maybeSingle();
  await ensureRevenueConfirmation({
    payment: refreshed ?? payment,
    event,
    revenueAmount: refreshed?.net_amount ?? netAmount,
    revenueType: "one_time",
  });
}

async function handleInvoicePaid(inv: Stripe.Invoice, event: Stripe.Event) {
  const piId = typeof inv.payment_intent === "string" ? inv.payment_intent : null;
  const payment = await findPayment({ stripe_invoice_id: inv.id, payment_intent_id: piId });
  if (!payment) return;

  await admin.from("qtc_payments").update({
    payment_status: "succeeded",
    stripe_invoice_id: inv.id,
    stripe_subscription_id: typeof inv.subscription === "string" ? inv.subscription : payment.stripe_subscription_id,
    stripe_event_id: event.id,
    gross_amount: (inv.amount_paid ?? inv.total ?? 0) / 100,
    tax_amount: (inv.tax ?? 0) / 100,
    currency: (inv.currency ?? "usd").toUpperCase(),
    received_at: new Date().toISOString(),
    webhook_confirmation_source: "stripe.invoice.paid",
  }).eq("id", payment.id);

  const { data: refreshed } = await admin.from("qtc_payments").select("*").eq("id", payment.id).maybeSingle();
  await ensureRevenueConfirmation({
    payment: refreshed ?? payment,
    event,
    revenueAmount: refreshed?.net_amount ?? (inv.amount_paid ?? 0) / 100,
    revenueType: inv.subscription ? "subscription" : "one_time",
  });
}

async function handleInvoiceFailed(inv: Stripe.Invoice, event: Stripe.Event) {
  const payment = await findPayment({ stripe_invoice_id: inv.id });
  if (!payment) return;
  await admin.from("qtc_payments").update({
    payment_status: "failed",
    stripe_invoice_id: inv.id,
    stripe_event_id: event.id,
    webhook_confirmation_source: "stripe.invoice.payment_failed",
  }).eq("id", payment.id);
}

async function handleChargeRefunded(charge: Stripe.Charge, event: Stripe.Event) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  if (!piId) return;
  const payment = await findPayment({ payment_intent_id: piId });
  if (!payment) return;
  const currentCharge = stripe ? await stripe.charges.retrieve(charge.id) : charge;
  const refundCurrency = String(currentCharge.currency ?? payment.currency ?? "USD").toUpperCase();
  const refundExponent = new Intl.NumberFormat("en", { style: "currency", currency: refundCurrency }).resolvedOptions().maximumFractionDigits ?? 2;
  const refunded = (currentCharge.amount_refunded ?? 0) / (10 ** refundExponent);
  const fullyRefunded = (currentCharge.amount_refunded ?? 0) >= (currentCharge.amount ?? Number.POSITIVE_INFINITY);
  await admin.from("qtc_payments").update({
    payment_status: fullyRefunded ? "refunded" : "succeeded",
    refund_amount: refunded,
    refunded_at: fullyRefunded ? new Date().toISOString() : null,
    stripe_event_id: event.id,
    webhook_confirmation_source: "stripe.charge.refunded",
  }).eq("id", payment.id);

  if (payment.customer_sales_checkout_id) {
    const revenue = await admin.from("qtc_revenue_confirmations").select("id,revenue_amount,revenue_type,metadata_json")
      .eq("customer_sales_checkout_id", payment.customer_sales_checkout_id).maybeSingle();
    if (revenue.error || !revenue.data) throw new Error("standard checkout revenue linkage missing for refund event");
    const originalRevenue = Number(revenue.data.metadata_json?.original_revenue_amount ?? revenue.data.revenue_amount ?? 0);
    const { error: revenueUpdateError } = await admin.from("qtc_revenue_confirmations").update({
      revenue_amount: Math.max(0, originalRevenue - refunded),
      revenue_type: fullyRefunded ? "refund" : revenue.data.revenue_type,
      stripe_event_id: event.id,
      metadata_json: { ...(revenue.data.metadata_json ?? {}), original_revenue_amount: originalRevenue, total_refunded: refunded, stripe_refund_event_id: event.id, test_mode: true },
    }).eq("id", revenue.data.id);
    if (revenueUpdateError) throw new Error(`standard checkout revenue refund linkage failed: ${revenueUpdateError.message}`);
    const { data: intent } = await admin.from("customer_sales_checkout_intents").select("*")
      .eq("id", payment.customer_sales_checkout_id).maybeSingle();
    if (intent) await auditCommercialTransition({
      key: `checkout:${intent.id}:stripe_refund_event:${event.id}`,
      type: "payment_refunded",
      intent,
      paymentId: payment.id,
      payload: { stripe_event_id: event.id, amount_refunded: refunded, currency: refundCurrency, fully_refunded: fullyRefunded },
    });
    return;
  }

  if (payment.business_id) {
    await admin.from("qtc_revenue_confirmations").insert({
      business_id: payment.business_id,
      payment_id: payment.id,
      revenue_amount: -refunded,
      currency: payment.currency,
      revenue_type: "refund",
      confirmation_source: "payment_provider",
      business_name_snapshot: payment.business_name_snapshot,
      brand_name: payment.brand_name,
      saleable_asset_group: payment.saleable_asset_group,
      legal_entity: payment.legal_entity,
      sale_ready: false,
      is_test_data: !!payment.is_test_data,
      stripe_event_id: event.id,
      stripe_verified: true,
      metadata_json: { stripe_event_type: event.type },
    });
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription, event: Stripe.Event) {
  // Update any payment row tied to this subscription
  const { data: rows } = await admin.from("qtc_payments").select("id").eq("stripe_subscription_id", sub.id);
  if (!rows || rows.length === 0) return;
  await admin.from("qtc_payments").update({
    stripe_event_id: event.id,
    metadata_json: { subscription_status: sub.status },
    webhook_confirmation_source: `stripe.${event.type}`,
  }).eq("stripe_subscription_id", sub.id);
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
