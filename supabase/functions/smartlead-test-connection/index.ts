import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";

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

async function smartleadGet(path: string, apiKey: string, timeoutMs = 12_000) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${SMARTLEAD_BASE_URL}${path}${sep}api_key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep raw */
    }
    return { ok: res.ok, status: res.status, body: parsed, raw_excerpt: text.slice(0, 400) };
  } catch (e: any) {
    return { ok: false, status: 0, body: null, raw_excerpt: `fetch_error: ${e?.message ?? String(e)}` };
  } finally {
    clearTimeout(t);
  }
}

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
      base_url: SMARTLEAD_BASE_URL,
    });
  }

  // Read-only Smartlead calls only:
  //   GET /campaigns/?include_tags=true
  //   GET /email-accounts/?offset=0&limit=100
  //   GET /webhooks
  //   GET /analytics/overview
  // No mutations. Spaced lightly to respect 10 req / 2s rate limit.
  const campaignsRes = await smartleadGet("/campaigns/?include_tags=true", SMARTLEAD_API_KEY!);
  await new Promise((r) => setTimeout(r, 250));
  const accountsRes = await smartleadGet(
    "/email-accounts/?offset=0&limit=100",
    SMARTLEAD_API_KEY!,
  );
  await new Promise((r) => setTimeout(r, 250));
  const webhooksRes = await smartleadGet("/webhooks", SMARTLEAD_API_KEY!);
  await new Promise((r) => setTimeout(r, 250));
  const overviewRes = await smartleadGet("/analytics/overview", SMARTLEAD_API_KEY!);

  const asArray = (b: any): any[] =>
    Array.isArray(b) ? b : Array.isArray(b?.data) ? b.data : Array.isArray(b?.results) ? b.results : [];

  const campaigns = asArray(campaignsRes.body);
  const accounts = asArray(accountsRes.body);
  const webhooks = asArray(webhooksRes.body);

  const campaignCount = campaignsRes.ok ? campaigns.length : null;
  const activeCampaignCount = campaignsRes.ok
    ? campaigns.filter((c) => String(c?.status ?? "").toUpperCase() === "ACTIVE").length
    : null;
  const draftedCampaignCount = campaignsRes.ok
    ? campaigns.filter((c) => String(c?.status ?? "").toUpperCase() === "DRAFTED").length
    : null;
  const emailAccountCount = accountsRes.ok ? accounts.length : null;
  const warmupAccountCount = accountsRes.ok
    ? accounts.filter(
        (a) =>
          a?.warmup_details?.status === "ACTIVE" ||
          a?.warmup_status === "ACTIVE" ||
          a?.warmup_enabled === true,
      ).length
    : null;
  const sendingAccountsPresent = (emailAccountCount ?? 0) > 0;
  const webhookCount = webhooksRes.ok ? webhooks.length : null;
  const webhookConfigured = (webhookCount ?? 0) > 0;

  const testOk = campaignsRes.ok && accountsRes.ok;
  const blockers: string[] = [];
  if (!campaignsRes.ok) blockers.push(`campaigns_endpoint_http_${campaignsRes.status}`);
  if (!accountsRes.ok) blockers.push(`email_accounts_endpoint_http_${accountsRes.status}`);
  if (testOk && !sendingAccountsPresent) blockers.push("no_sending_accounts_in_smartlead");
  if (testOk && (campaignCount ?? 0) === 0) blockers.push("no_campaigns_in_smartlead");
  if (testOk && !webhookConfigured) blockers.push("no_smartlead_webhook_configured");

  const lastError = testOk
    ? null
    : `campaigns_http_${campaignsRes.status} accounts_http_${accountsRes.status}`;

  await admin
    .from("outbound_providers")
    .update({
      status: testOk ? "connected" : "error",
      provider_health: testOk ? "ok" : "error",
      credentials_present: true,
      webhook_configured: webhookConfigured,
      last_test_at: new Date().toISOString(),
      last_error: testOk ? null : lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", provider.id);

  return json({
    ok: testOk,
    tested: true,
    provider_id: provider.id,
    base_url: SMARTLEAD_BASE_URL,
    auth_method: "api_key_query_param",
    credentials_present: true,
    http_status: {
      campaigns: campaignsRes.status,
      email_accounts: accountsRes.status,
      webhooks: webhooksRes.status,
      analytics_overview: overviewRes.status,
    },
    campaign_count: campaignCount,
    active_campaign_count: activeCampaignCount,
    drafted_campaign_count: draftedCampaignCount,
    email_account_count: emailAccountCount,
    warmup_account_count: warmupAccountCount,
    sending_accounts_present: sendingAccountsPresent,
    webhook_count: webhookCount,
    webhook_configured: webhookConfigured,
    analytics_overview_ok: overviewRes.ok,
    blockers,
    error: lastError,
    response_excerpts: testOk
      ? null
      : {
          campaigns: campaignsRes.raw_excerpt,
          email_accounts: accountsRes.raw_excerpt,
        },
    notes:
      "Read-only: campaigns + email-accounts + webhooks + analytics/overview. No campaign created, no leads pushed, no email-accounts added, no webhook created, no emails sent.",
  });
});
