// Create a Stripe Billing Portal session for a verified customer.
// Founder/admin only in this phase. Test mode only.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  stripe_customer_id: z.string().min(3).optional(),
  qtc_payment_id: z.string().uuid().optional(),
  return_url: z.string().url(),
}).refine((d) => d.stripe_customer_id || d.qtc_payment_id, { message: "Provide stripe_customer_id or qtc_payment_id" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    return json({ error: "Refusing to run outside Stripe test mode" }, 400);
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, service);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
  const roleSet = new Set((roles || []).map((r: any) => r.role));
  if (!roleSet.has("admin") && !roleSet.has("founder")) return json({ error: "Forbidden — founder/admin only" }, 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return json({ error: "Invalid request", details: (e as Error).message }, 400);
  }

  let customerId = body.stripe_customer_id ?? null;
  if (!customerId && body.qtc_payment_id) {
    const { data: pay } = await admin
      .from("qtc_payments")
      .select("stripe_customer_id")
      .eq("id", body.qtc_payment_id)
      .maybeSingle();
    customerId = pay?.stripe_customer_id ?? null;
  }
  if (!customerId) return json({ error: "No Stripe customer found" }, 404);

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: body.return_url,
  });

  return json({ portal_url: session.url, test_mode: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}