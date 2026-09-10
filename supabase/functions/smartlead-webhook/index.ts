import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildIdempotencyKey,
  deriveContactMutation,
  deriveMailboxMutation,
  EVENT_NORMALIZER_VERSION,
  extractEvent,
} from "../_shared/smartleadEventNormalizer.ts";

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
 * Smartlead webhook receiver — RETURN LOOP (inbound only).
 *
 * Security: unchanged shared-secret header pattern. The secret is never read
 * from the URL, never echoed, and the receiver stays disabled while unset.
 *
 * Safety:
 *  - Every event is stored with raw payload + provenance + idempotency key.
 *  - Duplicate deliveries collapse to one row and cause NO second transition.
 *  - Reply / hard bounce / unsubscribe only ever ESCALATE canonical CRM
 *    suppression so no further inappropriate sending can happen.
 *  - Unknown events are stored and acknowledged with no state change.
 *  - This function never calls Smartlead and never sends email.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;

  const provided =
    req.headers.get("x-smartlead-signature") ??
    req.headers.get("x-webhook-secret") ??
    null;

  if (SECRET && SECRET.length > 0) {
    if (!provided || provided !== SECRET) {
      return json({ ok: false, error: "invalid_or_missing_secret" }, 401);
    }
  } else {
    return json({
      ok: false,
      mode: "disabled",
      reason: "SMARTLEAD_WEBHOOK_SECRET not configured. Webhook receiver is disabled.",
      operational_mutation_applied: false,
    });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const event = extractEvent(payload);
  const idempotencyKey = buildIdempotencyKey(event);

  // --- Idempotency: a duplicate delivery is acknowledged, never re-applied ---
  const { data: existing } = await admin
    .from("outbound_provider_events")
    .select("id, processing_status, operational_mutation_applied")
    .eq("provider_type", "smartlead")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return json({
      ok: true,
      duplicate: true,
      event_id: existing.id,
      event_type: event.canonical_event_type,
      idempotency_key: idempotencyKey,
      operational_mutation_applied: false,
      notes: "Duplicate webhook delivery — already recorded. No second state transition.",
    });
  }

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  // --- Resolve Liftor identity from the provider identifiers ---
  let leadMapping: Record<string, unknown> | null = null;
  if (event.provider_lead_id || event.email) {
    let q = admin
      .from("outbound_provider_lead_mappings")
      .select("id, liftor_contact_id, liftor_campaign_id, business_id, provider_campaign_id, contact_email")
      .eq("provider_type", "smartlead");
    q = event.provider_lead_id
      ? q.eq("provider_lead_id", event.provider_lead_id)
      : q.eq("contact_email", event.email);
    if (event.provider_campaign_id) q = q.eq("provider_campaign_id", event.provider_campaign_id);
    const { data: rows } = await q.limit(2);
    // Fail closed on ambiguity: store the event, resolve no contact.
    leadMapping = (rows ?? []).length === 1 ? (rows as Record<string, unknown>[])[0] : null;
  }

  let contactId = (leadMapping?.liftor_contact_id as string | null) ?? null;
  if (!contactId && event.email) {
    const { data: matches } = await admin
      .from("contacts")
      .select("id, hard_bounced, unsubscribed_at, do_not_contact_at, is_globally_suppressed")
      .ilike("email", event.email)
      .limit(2);
    if ((matches ?? []).length === 1) contactId = (matches as Record<string, string>[])[0].id;
  }

  const { data: inserted, error: insErr } = await admin
    .from("outbound_provider_events")
    .insert({
      provider_type: "smartlead",
      provider_id: provider?.id ?? null,
      provider_event_type: event.canonical_event_type,
      provider_event_id: event.provider_event_id,
      provider_campaign_id: event.provider_campaign_id,
      provider_lead_id: event.provider_lead_id,
      provider_mailbox_id: event.provider_mailbox_id,
      idempotency_key: idempotencyKey,
      contact_id: contactId,
      liftor_campaign_id: (leadMapping?.liftor_campaign_id as string | null) ?? null,
      lead_mapping_id: (leadMapping?.id as string | null) ?? null,
      raw_payload: payload,
      normalized_payload: {
        ...event,
        idempotency_key: idempotencyKey,
        normalizer_version: EVENT_NORMALIZER_VERSION,
        received_at: new Date().toISOString(),
      },
      event_occurred_at: event.event_occurred_at,
      processing_status: "received",
      operational_mutation_applied: false,
      error: null,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    // Unique-violation on the idempotency key = concurrent duplicate delivery.
    if ((insErr as { code?: string }).code === "23505") {
      return json({
        ok: true,
        duplicate: true,
        event_type: event.canonical_event_type,
        idempotency_key: idempotencyKey,
        operational_mutation_applied: false,
        notes: "Concurrent duplicate webhook delivery collapsed to the existing event row.",
      });
    }
    return json({ ok: false, error: "event_log_failed" }, 500);
  }

  const eventRowId = inserted?.id ?? null;

  // --- Canonical CRM escalation (never weakens an existing block) ---
  const contactMutation = deriveContactMutation(event, payload);
  const mailboxMutation = deriveMailboxMutation(event, payload);
  const applied: string[] = [];
  const failures: string[] = [];

  if (contactId && Object.keys(contactMutation.contact_patch).length > 0) {
    const { error } = await admin
      .from("contacts")
      .update(contactMutation.contact_patch)
      .eq("id", contactId);
    if (error) failures.push("contact_update_failed");
    else applied.push("contact_suppression_state");
  }

  // Stop any further queued sends to a replied / blocked contact.
  if (contactId && (contactMutation.blocks_future_sends || contactMutation.opens_conversation)) {
    const { error } = await admin
      .from("email_queue")
      .update({
        status: "cancelled",
        error_message: `cancelled_by_smartlead_${event.canonical_event_type}`,
      })
      .eq("contact_id", contactId)
      .in("status", ["pending", "delayed", "throttled"]);
    if (error) failures.push("queue_cancel_failed");
    else applied.push("pending_queue_cancelled");
  }

  if (event.provider_mailbox_id && Object.keys(mailboxMutation.inbox_patch).length > 0) {
    const { error } = await admin
      .from("inboxes")
      .update(mailboxMutation.inbox_patch)
      .eq("provider_mailbox_id", event.provider_mailbox_id);
    if (error) failures.push("inbox_update_failed");
    else applied.push("mailbox_paused");
  }

  if (leadMapping?.id && event.is_operational) {
    await admin
      .from("outbound_provider_lead_mappings")
      .update({ metadata: { last_provider_event: event.canonical_event_type, at: new Date().toISOString() } })
      .eq("id", leadMapping.id as string);
  }

  const status = failures.length > 0
    ? "error"
    : contactId || applied.length > 0
      ? "processed"
      : event.is_known
        ? "stored_unmapped"
        : "stored_unknown_event";

  if (eventRowId) {
    await admin
      .from("outbound_provider_events")
      .update({
        processing_status: status,
        operational_mutation_applied: applied.length > 0,
        processed_at: new Date().toISOString(),
        error: failures.length > 0 ? failures.join(",") : null,
      })
      .eq("id", eventRowId);
  }

  return json({
    ok: true,
    duplicate: false,
    event_id: eventRowId,
    event_type: event.canonical_event_type,
    known_event: event.is_known,
    idempotency_key: idempotencyKey,
    contact_resolved: !!contactId,
    transition: contactMutation.transition,
    operational_mutation_applied: applied.length > 0,
    mutations_applied: applied,
    processing_status: status,
    notes: "Inbound return loop only. No Smartlead API call, no email sent.",
  });
});
