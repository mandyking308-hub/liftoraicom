// Reports whether Stripe secrets are configured (test/live) WITHOUT exposing values.
// Founder/admin only.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, service);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
  const roleSet = new Set((roles || []).map((r: any) => r.role));
  if (!roleSet.has("admin") && !roleSet.has("founder")) return json({ error: "Forbidden" }, 403);

  const sk = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const wh = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const isTest = sk.startsWith("sk_test_");
  const isLive = sk.startsWith("sk_live_");

  return json({
    secret_key_configured: sk.length > 0,
    webhook_secret_configured: wh.length > 0,
    mode: isTest ? "test" : isLive ? "live" : "unknown",
    live_charging_locked: true,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}