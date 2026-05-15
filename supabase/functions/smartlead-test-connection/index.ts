import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Smartlead read-only connection test.
 *
 * Safety contract:
 *  - Founder/admin only.
 *  - Calls a single read-only Smartlead endpoint (campaign list).
 *  - Does NOT create campaigns, push leads, or send emails.
 *  - Updates outbound_providers row metadata only (status / health /
 *    last_test_at / last_error / credentials_present). No queue, contact,
 *    compliance, system_settings or cron mutation.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

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
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // Find the Smartlead provider row.
  const { data: provider, error: pErr } = await admin
    .from("outbound_providers")
    .select("*")
    .eq("provider_type", "smartlead")
    .maybeSingle();
  if (pErr) return json({ ok: false, error: "provider_lookup_failed", detail: pErr.message }, 500);
  if (!provider) return json({ ok: false, error: "smartlead_provider_row_missing" }, 404);

  const credentialsPresent = !!SMARTLEAD_API_KEY && SMARTLEAD_API_KEY.length > 8;

  // No secret → don't call Smartlead. Mark not_configured.
  if (!credentialsPresent) {
    await admin
      .from("outbound_providers")
      .update({
        status: "not_configured",
        provider_health: "unknown",
        credentials_present: false,
        last_test_at: new Date().toISOString(),
        last_error: "credentials_missing: SMARTLEAD_API_KEY not set",
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    return json({
      ok: false,
      tested: false,
      reason: "credentials_missing",
      credentials_present: false,
      provider_id: provider.id,
      blockers: ["SMARTLEAD_API_KEY secret not configured"],
    });
  }

  // Read-only Smartlead call: list campaigns.
  // Endpoint: GET https://server.smartlead.ai/api/v1/campaigns?api_key=...
  let testOk = false;
  let httpStatus: number | null = null;
  let httpBodyExcerpt: string | null = null;
  let lastError: string | null = null;
  let campaignCount: number | null = null;

  try {
    const url = `https://server.smartlead.ai/api/v1/campaigns?api_key=${encodeURIComponent(
      SMARTLEAD_API_KEY!,
    )}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    clearTimeout(t);
    httpStatus = res.status;
    const text = await res.text();
    httpBodyExcerpt = text.slice(0, 500);
    if (res.ok) {
      testOk = true;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) campaignCount = parsed.length;
        else if (Array.isArray(parsed?.data)) campaignCount = parsed.data.length;
      } catch {
        /* ignore parse errors — treat as ok if HTTP 200 */
      }
    } else {
      lastError = `smartlead_http_${res.status}`;
    }
  } catch (e: any) {
    lastError = `smartlead_fetch_error: ${e?.message ?? String(e)}`;
  }

  await admin
    .from("outbound_providers")
    .update({
      status: testOk ? "connected" : "error",
      provider_health: testOk ? "ok" : "error",
      credentials_present: true,
      last_test_at: new Date().toISOString(),
      last_error: testOk ? null : lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", provider.id);

  return json({
    ok: testOk,
    tested: true,
    provider_id: provider.id,
    credentials_present: true,
    http_status: httpStatus,
    campaign_count: campaignCount,
    error: lastError,
    response_excerpt: testOk ? null : httpBodyExcerpt,
    notes:
      "Read-only campaigns list. No campaign created, no leads pushed, no emails sent.",
  });
});
