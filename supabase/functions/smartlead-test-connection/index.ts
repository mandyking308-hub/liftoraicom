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

/**
 * Fixed, non-leaking diagnostic string for a Smartlead call.
 * Never contains provider response text, URLs (which carry api_key) or the key.
 */
function statusDiagnostic(status: number, kind: "http" | "network" | "timeout"): string {
  if (kind === "timeout") return "request_timeout";
  if (kind === "network") return "network_error";
  if (status === 401) return "http_401_unauthorized";
  if (status === 403) return "http_403_forbidden";
  if (status === 404) return "http_404_not_found";
  if (status === 429) return "http_429_rate_limited";
  if (status >= 500) return `http_${status}_provider_error`;
  return `http_${status}_unexpected`;
}

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
      /* body intentionally discarded — never surfaced */
    }
    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
      diagnostic: res.ok ? null : statusDiagnostic(res.status, "http"),
    };
  } catch (e: any) {
    // Exception messages can embed the request URL (which carries api_key).
    // Only a fixed classification is ever returned.
    const aborted = e?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      body: null,
      diagnostic: statusDiagnostic(0, aborted ? "timeout" : "network"),
    };
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

  // Read-only Smartlead calls only (documented endpoints):
  //   GET /campaigns/?include_tags=true
  //   GET /email-accounts/?offset=0&limit=100
  //   GET /analytics/overall-stats-v2?start_date=&end_date=&timezone=
  //   GET /campaigns/{campaign_id}/webhooks   (per discovered campaign, bounded)
  // No mutations. Spaced lightly to respect 10 req / 2s rate limit.
  const ACCOUNT_PAGE_LIMIT = 100;
  const WEBHOOK_CAMPAIGN_SCAN_CAP = 10;

  const campaignsRes = await smartleadGet("/campaigns/?include_tags=true", SMARTLEAD_API_KEY!);
  await new Promise((r) => setTimeout(r, 250));
  const accountsRes = await smartleadGet(
    `/email-accounts/?offset=0&limit=${ACCOUNT_PAGE_LIMIT}`,
    SMARTLEAD_API_KEY!,
  );
  await new Promise((r) => setTimeout(r, 250));

  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startDate = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const endDate = iso(now);
  const analyticsPath =
    `/analytics/overall-stats-v2?start_date=${startDate}&end_date=${endDate}` +
    `&timezone=${encodeURIComponent("Europe/London")}`;
  const overviewRes = await smartleadGet(analyticsPath, SMARTLEAD_API_KEY!);

  const asArray = (b: any): any[] =>
    Array.isArray(b) ? b : Array.isArray(b?.data) ? b.data : Array.isArray(b?.results) ? b.results : [];

  const campaigns = asArray(campaignsRes.body);
  const accounts = asArray(accountsRes.body);

  const campaignCount = campaignsRes.ok ? campaigns.length : null;
  const activeCampaignCount = campaignsRes.ok
    ? campaigns.filter((c) => String(c?.status ?? "").toUpperCase() === "ACTIVE").length
    : null;
  const draftedCampaignCount = campaignsRes.ok
    ? campaigns.filter((c) => String(c?.status ?? "").toUpperCase() === "DRAFTED").length
    : null;
  const campaignSummaries = campaignsRes.ok
    ? campaigns.slice(0, 50).map((c: any) => ({
        id: c?.id ?? c?.campaign_id ?? null,
        name: c?.name ?? c?.campaign_name ?? null,
        status: c?.status ?? null,
      }))
    : [];

  const emailAccountCount = accountsRes.ok ? accounts.length : null;
  const emailAccountCountTruncated = accountsRes.ok
    ? accounts.length >= ACCOUNT_PAGE_LIMIT
    : null;

  // Whitelisted account fields ONLY. Raw provider objects, passwords, tokens
  // and keys are never returned or logged.
  const accountSummaries = accountsRes.ok
    ? accounts.slice(0, ACCOUNT_PAGE_LIMIT).map((a: any) => ({
        id: a?.id ?? null,
        from_email: a?.from_email ?? a?.email ?? null,
        from_name: a?.from_name ?? null,
        is_smtp_success: typeof a?.is_smtp_success === "boolean" ? a.is_smtp_success : null,
        is_imap_success: typeof a?.is_imap_success === "boolean" ? a.is_imap_success : null,
        warmup_status: a?.warmup_details?.status ?? null,
        message_per_day: a?.message_per_day ?? null,
      }))
    : [];

  const warmupAccountCount = accountsRes.ok
    ? accountSummaries.filter((a) => String(a.warmup_status ?? "").toUpperCase() === "ACTIVE").length
    : null;
  const smtpVerifiedAccountCount = accountsRes.ok
    ? accountSummaries.filter((a) => a.is_smtp_success === true).length
    : null;
  const imapVerifiedAccountCount = accountsRes.ok
    ? accountSummaries.filter((a) => a.is_imap_success === true).length
    : null;
  const sendingAccountsPresent = (emailAccountCount ?? 0) > 0;

  // Per-campaign webhook discovery (documented route). Global GET /webhooks is
  // not a confirmed route and is no longer called.
  const warnings: string[] = [];
  let webhookCheckStatus:
    | "not_applicable_no_campaigns"
    | "verified"
    | "incomplete_capped"
    | "unverified_request_failed"
    | "unverified_campaigns_unreadable" = "unverified_campaigns_unreadable";
  let webhookCount: number | null = null;
  let liftorWebhookCount: number | null = null;
  let webhookCampaignsChecked = 0;
  const webhookStatuses: Array<{ campaign_id: unknown; http_status: number }> = [];

  // A webhook only proves Liftor is wired when it targets THIS project's
  // receiver: <SUPABASE_URL origin>/functions/v1/smartlead-webhook.
  // Query params are ignored for matching and URLs are never returned.
  const expectedOrigin = (() => {
    try {
      return new URL(SUPABASE_URL).origin.toLowerCase();
    } catch {
      return null;
    }
  })();
  const EXPECTED_RECEIVER_PATH = "/functions/v1/smartlead-webhook";
  const matchesLiftorReceiver = (raw: unknown): boolean => {
    if (typeof raw !== "string" || !raw || !expectedOrigin) return false;
    try {
      const u = new URL(raw);
      return (
        u.origin.toLowerCase() === expectedOrigin &&
        u.pathname.replace(/\/+$/, "").toLowerCase() === EXPECTED_RECEIVER_PATH
      );
    } catch {
      return false;
    }
  };

  if (!campaignsRes.ok) {
    webhookCheckStatus = "unverified_campaigns_unreadable";
  } else if (campaigns.length === 0) {
    webhookCheckStatus = "not_applicable_no_campaigns";
    webhookCount = null;
    liftorWebhookCount = null;
  } else {
    const scan = campaignSummaries.filter((c) => c.id != null).slice(0, WEBHOOK_CAMPAIGN_SCAN_CAP);
    let total = 0;
    let liftorTotal = 0;
    let anyFailed = false;
    for (const c of scan) {
      await new Promise((r) => setTimeout(r, 250));
      const res = await smartleadGet(
        `/campaigns/${encodeURIComponent(String(c.id))}/webhooks`,
        SMARTLEAD_API_KEY!,
      );
      webhookCampaignsChecked += 1;
      webhookStatuses.push({ campaign_id: c.id, http_status: res.status });
      if (res.ok) {
        const hooks = asArray(res.body);
        total += hooks.length;
        liftorTotal += hooks.filter((h: any) =>
          matchesLiftorReceiver(h?.webhook_url ?? h?.url ?? h?.target_url),
        ).length;
      } else anyFailed = true;
    }
    webhookCount = total;
    liftorWebhookCount = liftorTotal;
    if (anyFailed) {
      webhookCheckStatus = "unverified_request_failed";
      warnings.push("campaign_webhook_read_failed");
    } else if (campaigns.length > scan.length) {
      webhookCheckStatus = "incomplete_capped";
      warnings.push(`campaign_webhook_scan_capped_at_${WEBHOOK_CAMPAIGN_SCAN_CAP}`);
    } else {
      webhookCheckStatus = "verified";
    }
  }

  const webhookCheckConclusive = webhookCheckStatus === "verified";
  if (webhookCheckConclusive && !expectedOrigin) warnings.push("receiver_origin_unresolvable");
  // Compatibility field for the existing UI. Only true when a conclusive scan
  // found a webhook pointing at THIS project's Liftor receiver; never overwrite
  // known config from an inapplicable/unverified check.
  const webhookConfigured = webhookCheckConclusive
    ? (liftorWebhookCount ?? 0) > 0
    : !!provider.webhook_configured;

  // API authentication health is judged on campaigns + email-accounts only.
  const testOk = campaignsRes.ok && accountsRes.ok;
  const blockers: string[] = [];
  if (!campaignsRes.ok) blockers.push(`campaigns_endpoint_http_${campaignsRes.status}`);
  if (!accountsRes.ok) blockers.push(`email_accounts_endpoint_http_${accountsRes.status}`);
  if (testOk && !sendingAccountsPresent) blockers.push("no_sending_accounts_in_smartlead");
  if (testOk && (campaignCount ?? 0) === 0) blockers.push("no_campaigns_in_smartlead");
  if (testOk && webhookCheckStatus === "not_applicable_no_campaigns") {
    blockers.push("webhook_check_not_applicable_no_campaigns");
  }
  if (testOk && webhookCheckConclusive && (webhookCount ?? 0) === 0) {
    blockers.push("no_smartlead_webhook_configured");
  }
  if (testOk && !overviewRes.ok) warnings.push(`analytics_overall_stats_v2_http_${overviewRes.status}`);
  if (testOk && accountsRes.ok && smtpVerifiedAccountCount === 0 && sendingAccountsPresent) {
    blockers.push("no_mailbox_with_verified_smtp");
  }

  const lastError = testOk
    ? null
    : `campaigns_http_${campaignsRes.status} accounts_http_${accountsRes.status}`;

  const providerUpdate: Record<string, unknown> = {
    status: testOk ? "connected" : "error",
    provider_health: testOk ? "ok" : "error",
    credentials_present: true,
    last_test_at: new Date().toISOString(),
    last_error: testOk ? null : lastError,
    updated_at: new Date().toISOString(),
  };
  if (webhookCheckConclusive) providerUpdate.webhook_configured = (webhookCount ?? 0) > 0;

  await admin.from("outbound_providers").update(providerUpdate).eq("id", provider.id);

  const analyticsBody: any = overviewRes.ok ? (overviewRes.body ?? {}) : {};
  const analyticsSource = analyticsBody?.data ?? analyticsBody;
  const num = (v: unknown) => (typeof v === "number" ? v : null);

  return json({
    ok: testOk,
    tested: true,
    tested_at: new Date().toISOString(),
    provider_id: provider.id,
    base_url: SMARTLEAD_BASE_URL,
    auth_method: "api_key_query_param",
    credentials_present: true,
    http_status: {
      campaigns: campaignsRes.status,
      email_accounts: accountsRes.status,
      campaign_webhooks: webhookStatuses,
      analytics_overall_stats_v2: overviewRes.status,
      // Legacy key kept for the existing UI.
      analytics_overview: overviewRes.status,
    },
    campaign_count: campaignCount,
    active_campaign_count: activeCampaignCount,
    drafted_campaign_count: draftedCampaignCount,
    campaigns: campaignSummaries,
    email_account_count: emailAccountCount,
    email_account_count_truncated: emailAccountCountTruncated,
    email_account_page_limit: ACCOUNT_PAGE_LIMIT,
    email_accounts: accountSummaries,
    smtp_verified_account_count: smtpVerifiedAccountCount,
    imap_verified_account_count: imapVerifiedAccountCount,
    warmup_account_count: warmupAccountCount,
    sending_accounts_present: sendingAccountsPresent,
    webhook_check_status: webhookCheckStatus,
    webhook_campaigns_checked: webhookCampaignsChecked,
    webhook_count: webhookCount,
    webhook_configured: webhookConfigured,
    analytics_window: { start_date: startDate, end_date: endDate, timezone: "Europe/London" },
    analytics_overview_ok: overviewRes.ok,
    analytics_totals: overviewRes.ok
      ? {
          sent_count: num(analyticsSource?.sent_count),
          open_count: num(analyticsSource?.open_count),
          click_count: num(analyticsSource?.click_count),
          reply_count: num(analyticsSource?.reply_count),
          bounce_count: num(analyticsSource?.bounce_count),
          unsubscribed_count: num(analyticsSource?.unsubscribed_count),
          total_count: num(analyticsSource?.total_count),
        }
      : null,
    warnings,
    blockers,
    error: lastError,
    response_excerpts: testOk
      ? null
      : {
          campaigns: campaignsRes.raw_excerpt,
          email_accounts: accountsRes.raw_excerpt,
        },
    notes:
      "Read-only: campaigns + email-accounts (whitelisted fields) + analytics/overall-stats-v2 + per-campaign webhooks. Mailbox authentication is reported from is_smtp_success/is_imap_success only, never inferred from HTTP 200. No campaign created, no leads pushed, no email-accounts added, no warmup enabled, no webhook created, no emails sent.",
  });
});

