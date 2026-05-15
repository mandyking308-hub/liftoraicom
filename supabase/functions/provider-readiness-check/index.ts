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

// READ-ONLY readiness summary for the Outbound Provider Engine.
// Reports proof + scale provider state without sending or mutating anything.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth — founder/admin only
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

  const [{ data: providers }, { data: settings }] = await Promise.all([
    admin.from("outbound_providers").select("*").order("mode"),
    admin.from("system_settings").select("key,value"),
  ]);

  const settingVal = (k: string) =>
    (settings ?? []).find((s: any) => s.key === k)?.value;

  const list = (providers ?? []) as any[];
  const proof = list.find((p) => p.mode === "proof") ?? null;
  const scale = list.find((p) => p.mode === "scale") ?? null;
  const smartlead = list.find((p) => p.provider_type === "smartlead") ?? scale;

  const proofConfigured =
    !!proof && proof.status !== "not_configured" && !!proof.credentials_present;
  const scaleConfigured =
    !!scale && scale.status !== "not_configured" && !!scale.credentials_present;

  const autoSend = settingVal("auto_send_enabled");
  const autoSendOn = autoSend === true || autoSend === "true";

  const blockers: string[] = [];
  if (!proofConfigured) blockers.push("Proof provider not fully configured.");
  if (!scaleConfigured) blockers.push("Scale provider not yet configured.");
  if (scale && !scale.webhook_configured) blockers.push("Scale provider webhook not connected.");
  if (scale && !scale.sending_domain) blockers.push("Scale sending domain not verified.");
  if (smartlead && !smartlead.credentials_present)
    blockers.push("Smartlead API key (SMARTLEAD_API_KEY) not configured.");
  if (smartlead && smartlead.credentials_present && !smartlead.last_test_at)
    blockers.push("Smartlead connection not tested yet.");

  const summarise = (p: any) =>
    p && {
      id: p.id,
      provider_name: p.provider_name,
      provider_type: p.provider_type,
      mode: p.mode,
      status: p.status,
      from_email: p.from_email,
      from_name: p.from_name,
      sending_domain: p.sending_domain,
      reply_to: p.reply_to,
      daily_send_cap: p.daily_send_cap,
      hourly_send_cap: p.hourly_send_cap,
      mailbox_send_cap: p.mailbox_send_cap,
      warmup_status: p.warmup_status,
      provider_health: p.provider_health,
      credentials_present: p.credentials_present,
      webhook_configured: p.webhook_configured,
      last_test_at: p.last_test_at,
      last_error: p.last_error,
      notes: p.notes,
    };

  return json({
    ok: true,
    read_only: true,
    auto_send_enabled: autoSendOn,
    proof_provider: summarise(proof),
    scale_provider: summarise(scale),
    readiness: {
      proof_provider_configured: proofConfigured,
      scale_provider_configured: scaleConfigured,
      can_send_proof: proofConfigured,
      can_send_scale: scaleConfigured && !!scale?.webhook_configured && !!scale?.sending_domain,
      provider_credentials_present: !!(proof?.credentials_present || scale?.credentials_present),
      provider_health_ok:
        (!proof || proof.provider_health === "ok") &&
        (!scale || scale.provider_health === "ok" || scale.provider_health === "unknown"),
      webhook_configured: !!scale?.webhook_configured,
      sending_domain_ready: !!(proof?.sending_domain || scale?.sending_domain),
      unsubscribe_footer_supported: true,
      tracking_supported: !!scale?.webhook_configured,
      bounce_handling_supported: !!scale?.webhook_configured,
      reply_handling_supported: true,
    },
    blockers,
    bulk_engine_stages: [
      { id: 1, label: "Provider configured (Smartlead row exists)", done: !!smartlead },
      { id: 2, label: "Smartlead credentials stored", done: !!smartlead?.credentials_present },
      {
        id: 3,
        label: "Smartlead connection tested",
        done: !!(smartlead?.last_test_at && smartlead?.provider_health === "ok"),
      },
      { id: 4, label: "Sending accounts connected", done: false },
      { id: 5, label: "Campaign mapping ready", done: false },
      { id: 6, label: "Lead push preview ready", done: false },
      { id: 7, label: "Webhooks connected", done: !!smartlead?.webhook_configured },
      { id: 8, label: "Bulk send preview ready", done: false },
      { id: 9, label: "Manual batch apply ready", done: false },
      { id: 10, label: "Auto-send disabled", done: !autoSendOn },
      { id: 11, label: "Scale sending enabled", done: false },
    ],
    smartlead_provider: summarise(smartlead),
    smartlead_summary: {
      smartlead_provider_exists: !!smartlead,
      base_url: "https://server.smartlead.ai/api/v1",
      auth_method: "api_key_query_param",
      secret_name: "SMARTLEAD_API_KEY",
      credentials_present: !!smartlead?.credentials_present,
      connection_test_available: true,
      connection_test_result:
        smartlead?.last_test_at
          ? smartlead?.provider_health === "ok"
            ? "ok"
            : "error"
          : "not_run",
      last_test_at: smartlead?.last_test_at ?? null,
      last_error: smartlead?.last_error ?? null,
      webhook_configured: !!smartlead?.webhook_configured,
      warmup_status: smartlead?.warmup_status ?? "unknown",
      can_send_scale: false,
      can_preview_scale:
        !!smartlead?.credentials_present && smartlead?.provider_health === "ok",
      // Live counts (campaign_count / email_account_count / active / drafted /
      // sending_accounts_present) are returned by `smartlead-test-connection`
      // and merged into the UI from there — not cached server-side in v1.
      campaign_count: null,
      active_campaign_count: null,
      drafted_campaign_count: null,
      email_account_count: null,
      sending_accounts_present: null,
    },
    smartlead_webhook_blueprint: {
      configured: !!smartlead?.webhook_configured,
      events: [
        "email_reply_received",
        "email_bounced",
        "lead_unsubscribed",
        "campaign_completed",
        "lead_status_changed",
        "email_opened",
        "link_clicked",
        "account_error",
      ],
      note: "Blueprint only — no live webhook endpoint created in v1.",
    },
    proof_provider_status_label: proofConfigured ? "configured" : "not_configured",
    scale_provider_status_label: scaleConfigured ? "configured" : "not_configured",
    provider_mode_summary: scaleConfigured ? "scale ready" : proofConfigured ? "proof only" : "disabled",
  });
});