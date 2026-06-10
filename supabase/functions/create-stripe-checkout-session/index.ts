// Create a Stripe Checkout session in TEST MODE for the Liftor Quote-to-Cash engine.
// - Founder/admin only.
// - Writes a pending qtc_payments row before returning the URL.
// - All Stripe metadata is preserved (business_id, legal_entity, saleable_asset_group, etc.).
// - No live charging: relies on a Stripe test-mode secret key.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  business_id: z.string().uuid(),
  stripe_price_id: z.string().min(3),
  customer_email: z.string().email(),
  customer_name: z.string().max(200).optional(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  offer_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  customer_country: z.string().max(80).optional(),
  customer_state_region: z.string().max(120).optional(),
  saleable_asset_group: z.string().max(120).optional(),
  legal_entity: z.string().max(80).optional(),
  temporary_payout_account_used: z.boolean().optional(),
  temporary_payout_reason: z.string().max(400).optional(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata_json: z.record(z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    return json({ error: "Refusing to run: STRIPE_SECRET_KEY is not a test-mode key (must start sk_test_)" }, 400);
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
  const uid = userRes.user.id;

  const admin = createClient(supabaseUrl, service);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
  const roleSet = new Set((roles || []).map((r: any) => r.role));
  if (!roleSet.has("admin") && !roleSet.has("founder")) return json({ error: "Forbidden — founder/admin only" }, 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return json({ error: "Invalid request", details: (e as Error).message }, 400);
  }

  // Validate business
  const { data: biz, error: bizErr } = await admin.from("businesses").select("id,name").eq("id", body.business_id).maybeSingle();
  if (bizErr || !biz) return json({ error: "Unknown business_id" }, 400);

  // Look up offer/product for snapshot fields (best-effort)
  let brand_name: string | null = null;
  let website_url: string | null = null;

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  // Detect price recurring vs one-off
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(body.stripe_price_id);
  } catch (e) {
    return json({ error: "Stripe price lookup failed", details: (e as Error).message }, 400);
  }
  const inferredMode: "payment" | "subscription" = price.recurring ? "subscription" : "payment";
  const checkoutMode = body.mode ?? inferredMode;

  const legal_entity = body.legal_entity ?? "GSM_LLC";

  const metadata: Record<string, string> = {
    business_id: body.business_id,
    business_name_snapshot: biz.name ?? "",
    legal_entity,
    revenue_owner_entity: legal_entity,
    saleable_asset_group: body.saleable_asset_group ?? "",
    offer_id: body.offer_id ?? "",
    product_id: body.product_id ?? "",
    customer_country: body.customer_country ?? "",
    customer_state_region: body.customer_state_region ?? "",
    temporary_payout_account_used: String(body.temporary_payout_account_used ?? false),
    liftor_source: "qtc_test_mode",
    ...(body.metadata_json ?? {}),
  };

  // Create or reuse customer
  const existing = await stripe.customers.list({ email: body.customer_email, limit: 1 });
  const customer = existing.data[0]
    ? existing.data[0]
    : await stripe.customers.create({
        email: body.customer_email,
        name: body.customer_name,
        metadata,
      });

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: checkoutMode,
    customer: customer.id,
    line_items: [{ price: body.stripe_price_id, quantity: 1 }],
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    automatic_tax: { enabled: false }, // enable manually in Stripe once configured
    metadata,
    ...(checkoutMode === "subscription" ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
  });

  // Insert pending qtc_payments row (trigger normalises + sale_ready stays false until succeeded)
  const grossCents = price.unit_amount ?? 0;
  const currency = (price.currency ?? "usd").toUpperCase();
  const { data: pay, error: payErr } = await admin
    .from("qtc_payments")
    .insert({
      business_id: body.business_id,
      business_name_snapshot: biz.name,
      brand_name,
      website_url,
      product_id: body.product_id ?? null,
      offer_id: body.offer_id ?? null,
      saleable_asset_group: body.saleable_asset_group ?? null,
      legal_entity,
      revenue_owner_entity: legal_entity,
      payment_status: "pending",
      amount: grossCents / 100,
      gross_amount: grossCents / 100,
      currency,
      provider_name: "stripe",
      payment_method: "card",
      stripe_customer_id: customer.id,
      stripe_price_id: body.stripe_price_id,
      stripe_checkout_session_id: session.id,
      customer_country: body.customer_country ?? null,
      customer_state_region: body.customer_state_region ?? null,
      temporary_payout_account_used: body.temporary_payout_account_used ?? false,
      temporary_payout_reason: body.temporary_payout_reason ?? null,
      transfer_required_to_primary_account: body.temporary_payout_account_used === true,
      is_test_data: true,
      stripe_test_mode: true,
      founder_approval_required: false,
      founder_approved_at: new Date().toISOString(),
      webhook_confirmation_source: null,
      metadata_json: body.metadata_json ?? {},
      audit_metadata: { created_by: uid, source: "create-stripe-checkout-session" },
    })
    .select("id")
    .single();

  if (payErr) {
    return json({ error: "Failed to record pending payment", details: payErr.message }, 500);
  }

  return json({
    checkout_url: session.url,
    stripe_session_id: session.id,
    stripe_customer_id: customer.id,
    qtc_payment_id: pay?.id,
    mode: checkoutMode,
    test_mode: true,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}