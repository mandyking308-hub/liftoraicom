// Stripe webhook receiver (TEST MODE).
// - Verifies signature with STRIPE_WEBHOOK_SECRET.
// - Idempotent via stripe_webhook_events (unique stripe_event_id).
// - Updates qtc_payments / qtc_invoices.
// - Writes verified qtc_revenue_confirmations only when business_id is present and event is verified.
// - Preserves sale_ready trigger (it runs on qtc_payments updates).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, service);

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 500, headers: corsHeaders });
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

  const charge = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
  const feeCents = (charge as any)?.balance_transaction?.fee ?? 0;

  await admin.from("qtc_payments").update({
    payment_status: "succeeded",
    stripe_payment_intent_id: pi.id,
    stripe_event_id: event.id,
    gross_amount: (pi.amount ?? 0) / 100,
    stripe_fee_amount: feeCents / 100,
    currency: (pi.currency ?? "usd").toUpperCase(),
    received_at: new Date().toISOString(),
    webhook_confirmation_source: "stripe.payment_intent.succeeded",
  }).eq("id", payment.id);

  const { data: refreshed } = await admin.from("qtc_payments").select("*").eq("id", payment.id).maybeSingle();
  await ensureRevenueConfirmation({
    payment: refreshed ?? payment,
    event,
    revenueAmount: refreshed?.net_amount ?? (pi.amount ?? 0) / 100,
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
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!piId) return;
  const payment = await findPayment({ payment_intent_id: piId });
  if (!payment) return;
  const refunded = (charge.amount_refunded ?? 0) / 100;
  await admin.from("qtc_payments").update({
    payment_status: "refunded",
    refund_amount: refunded,
    refunded_at: new Date().toISOString(),
    stripe_event_id: event.id,
    webhook_confirmation_source: "stripe.charge.refunded",
  }).eq("id", payment.id);

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