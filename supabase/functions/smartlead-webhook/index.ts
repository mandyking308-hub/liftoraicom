import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-smartlead-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Smartlead webhook receiver — SCAFFOLD ONLY.
 *
 * Modes:
 *  - log_only (default)        — record event in outbound_provider_events; no operational mutation.
 *  - disabled_for_operational  — same as log_only but explicitly flagged.
 *
 * NEVER mutates contacts, email_queue, compliance, campaigns or system_settings here.
 * Smartlead webhook is NOT registered inside Smartlead by this function.
 */

const SUPPORTED_EVENTS = new Set([
  "email_sent",
  "email_opened",
  "link_clicked",
  "reply_received",
  "email_bounced",
  "lead_unsubscribed",
  "campaign_completed",
  "lead_status_changed",
  "account_error",
]);

function normalizeEventType(raw: string | undefined | null): string {
  if (!raw) return "unknown";
  const k = String(raw).toLowerCase().trim();
  // common Smartlead variants
  const map: Record<string, string> = {
    sent: "email_sent",
    open: "email_opened",
    opened: "email_opened",
    click: "link_clicked",
    clicked: "link_clicked",
    reply: "reply_received",
    replied: "reply_received",
    bounce: "email_bounced",
    bounced: "email_bounced",
    unsubscribe: "lead_unsubscribed",
    unsubscribed: "lead_unsubscribed",
    completed: "campaign_completed",
    status_change: "lead_status_changed",
  };
  return map[k] ?? (SUPPORTED_EVENTS.has(k) ? k : k);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;

  // Verify shared secret if configured (headers only — never accept secret in URL). Never echo it.
  const provided =
    req.headers.get("x-smartlead-signature") ??
    req.headers.get("x-webhook-secret") ??
    null;

  if (SECRET && SECRET.length > 0) {
    if (!provided || provided !== SECRET) {
      return json({ ok: false, error: "invalid_or_missing_secret" }, 401);
    }
  } else {
    // No secret configured → safe disabled response. Do not process.
    return json({
      ok: false,
      mode: "disabled",
      reason: "SMARTLEAD_WEBHOOK_SECRET not configured. Webhook receiver is disabled.",
      operational_mutation_applied: false,
    });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const rawType =
    payload?.event ?? payload?.event_type ?? payload?.type ?? payload?.action ?? null;
  const eventType = normalizeEventType(rawType);

  const providerCampaignId = payload?.campaign_id ?? payload?.campaign?.id ?? null;
  const providerLeadId = payload?.lead_id ?? payload?.lead?.id ?? null;
  const providerEventId = payload?.event_id ?? payload?.id ?? null;

  const normalized = {
    event_type: eventType,
    normalized_event_type: eventType,
    raw_event_type: rawType ? String(rawType) : null,
    supported: SUPPORTED_EVENTS.has(eventType),
    provider_campaign_id: providerCampaignId ? String(providerCampaignId) : null,
    provider_lead_id: providerLeadId ? String(providerLeadId) : null,
    provider_event_id: providerEventId ? String(providerEventId) : null,
    provider_message_id:
      payload?.message_id ?? payload?.email_id ?? payload?.stats_id ?? null,
    email: payload?.lead?.email ?? payload?.email ?? null,
    event_timestamp:
      payload?.event_timestamp ??
      payload?.timestamp ??
      payload?.time_stamp ??
      payload?.sent_time ??
      null,
    received_at: new Date().toISOString(),
  };

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  const { error: insErr } = await admin.from("outbound_provider_events").insert({
    provider_type: "smartlead",
    provider_id: provider?.id ?? null,
    provider_event_type: eventType,
    provider_event_id: normalized.provider_event_id,
    provider_campaign_id: normalized.provider_campaign_id,
    provider_lead_id: normalized.provider_lead_id,
    raw_payload: payload,
    normalized_payload: normalized,
    // Capture-only spine. Mapping to operational tables is a separate, not-yet-built step.
    processing_status: "received",
    operational_mutation_applied: false,
    error: null,
  });

  if (insErr) {
    return json({ ok: false, error: "event_log_failed", detail: insErr.message }, 500);
  }

  return json({
    ok: true,
    mode: "log_only",
    event_type: eventType,
    supported: SUPPORTED_EVENTS.has(eventType),
    operational_mutation_applied: false,
    notes:
      "Scaffold only — event logged to outbound_provider_events. No contact/queue/compliance/campaign/system_settings mutation. Smartlead webhook not registered by this function.",
  });
});