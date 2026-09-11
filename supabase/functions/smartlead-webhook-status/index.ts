import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Founder-safe webhook readiness status. Never returns the webhook secret.
 * It reports only whether the server secret exists, the persisted provider flag,
 * the webhook endpoint and event evidence already observed by Liftor.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const secretConfigured = Boolean((Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? "").trim());

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("status, provider_health, credentials_present, webhook_configured, last_test_at")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  const { count: eventCount } = await admin
    .from("outbound_provider_events")
    .select("id", { count: "exact", head: true })
    .eq("provider_type", "smartlead");

  const endpoint = `${SUPABASE_URL}/functions/v1/smartlead-webhook`;
  const providerFlag = provider?.webhook_configured === true;
  const eventsObserved = (eventCount ?? 0) > 0;

  return json({
    ok: true,
    webhook_endpoint: endpoint,
    webhook_secret_configured: secretConfigured,
    provider_webhook_configured: providerFlag,
    provider_status: provider?.status ?? null,
    provider_health: provider?.provider_health ?? null,
    credentials_present: provider?.credentials_present === true,
    provider_events_observed: eventCount ?? 0,
    verified_event_return: providerFlag && secretConfigured && eventsObserved,
    ready_for_event_return: secretConfigured,
    message: secretConfigured
      ? "The server webhook secret exists. Provider configuration/event evidence remains a separate check."
      : "SMARTLEAD_WEBHOOK_SECRET is not configured on the server. The receiver remains fail-closed.",
    checked_at: new Date().toISOString(),
  });
});
