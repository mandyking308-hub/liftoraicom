import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildIdempotencyKey,
  deriveContactMutation,
  deriveMailboxMutation,
  extractEvent,
  EVENT_NORMALIZER_VERSION,
} from "../_shared/smartleadEventNormalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-smartlead-signature, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Smartlead webhook receiver — operational event return path.
 *
 * Guarantees:
 *  - Shared-secret auth is REQUIRED (header only, never URL). Unchanged.
 *  - Every event is stored raw, with provenance and an idempotency key.
 *  - A duplicate webhook is acknowledged but NEVER re-applies a transition.
 *  - Reply / bounce / unsubscribe update canonical CRM suppression fields on
 *    public.contacts only. No competing CRM truth is created.
 *  - Unknown event types are stored and acknowledged with no state change.
 *  - This function never sends, starts or mutates anything in Smartlead.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;

  const provided =
    req.headers.get("x-smartlead-signature") ?? req.headers.get("x-webhook-secret") ?? null;

  if (!SECRET || SECRET.length === 0) {
    return json({
      ok: false,
      mode: "disabled",
      reason: "SMARTLEAD_WEBHOOK_SECRET not configured. Webhook receiver is disabled.",
      operational_mutation_applied: false,
    });
  }
  if (!provided || provided !== SECRET) {
    return json({ ok: false, error: "invalid_or_missing_secret" }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const evt = extractEvent(payload);
  const idempotencyKey = buildIdempotencyKey(evt);
  const receivedAt = new Date().toISOString();

  // ---- Idempotency: if we already stored this event, stop here. ----
  const { data: existing } = await admin
    .from("outbound_provider_events")
    .select("id, processing_status, operational_mutation_applied")
    .eq("provider_type", "smartlead")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    return json({
      ok: true,
      duplicate: true,
      event_id: existing.id,
      event_type: evt.canonical_event_type,
      processing_status: existing.processing_status,
      operational_mutation_applied: false,
      notes: "Duplicate webhook acknowledged. No state transition re-applied.",
    });
  }

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  // ---- Map back to Liftor via the mapping tables. ----
  let campaignMapping: Record<string, unknown> | null = null;
  if (evt.provider_campaign_id) {
    const { data } = await admin
      .from("outbound_provider_campaign_mappings")
      .select("id, business_id, liftor_campaign_id, provider_campaign_id")
      .eq("provider_type", "smartlead")
      .eq("provider_campaign_id", evt.provider_campaign_id)
      .maybeSingle();
    campaignMapping = data ?? null;
  }

  let leadMapping: Record<string, unknown> | null = null;
  if (evt.provider_campaign_id && (evt.provider_lead_id || evt.email)) {
    let q = admin
      .from("outbound_provider_lead_mappings")
      .select("id, liftor_contact_id, liftor_campaign_id, contact_email, inbox_id")
      .eq("provider_type", "smartlead")
      .eq("provider_campaign_id", evt.provider_campaign_id);
    q = evt.provider_lead_id
      ? q.eq("provider_lead_id", evt.provider_lead_id)
      : q.eq("contact_email", evt.email!);
    const { data } = await q.maybeSingle();
    leadMapping = data ?? null;
  }

  // Fall back to a direct CRM email match so suppression is never lost just
  // because a mapping row is missing.
  let contactId: string | null = (leadMapping?.liftor_contact_id as string) ?? null;
  let contact: Record<string, unknown> | null = null;
  if (!contactId && evt.email) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .ilike("email", evt.email)
      .limit(1)
      .maybeSingle();
    contactId = (data?.id as string) ?? null;
  }
  if (contactId) {
    const { data } = await admin
      .from("contacts")
      .select(
        "id, email, hard_bounced, unsubscribed_at, do_not_contact_at, is_globally_suppressed, sendable_status, status, conversation_active",
      )
      .eq("id", contactId)
      .maybeSingle();
    contact = data ?? null;
  }

  // ---- Store the raw event first, so nothing is ever lost. ----
  const { data: inserted, error: insErr } = await admin
    .from("outbound_provider_events")
    .insert({
      provider_type: "smartlead",
      provider_id: provider?.id ?? null,
      provider_event_type: evt.canonical_event_type,
      provider_event_id: evt.provider_event_id,
      provider_campaign_id: evt.provider_campaign_id,
      provider_lead_id: evt.provider_lead_id,
      provider_mailbox_id: evt.provider_mailbox_id,
      idempotency_key: idempotencyKey,
      raw_payload: payload,
      normalized_payload: { ...evt, normalizer_version: EVENT_NORMALIZER_VERSION, received_at: receivedAt },
      contact_id: contactId,
      liftor_campaign_id: (campaignMapping?.liftor_campaign_id as string) ?? null,
      lead_mapping_id: (leadMapping?.id as string) ?? null,
      event_occurred_at: evt.event_occurred_at,
      processing_status: "received",
      operational_mutation_applied: false,
      error: null,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    // A unique-violation here means a concurrent duplicate won the race.
    if (String(insErr.code) === "23505") {
      return json({
        ok: true,
        duplicate: true,
        event_type: evt.canonical_event_type,
        operational_mutation_applied: false,
        notes: "Concurrent duplicate webhook collapsed by idempotency key.",
      });
    }
    return json({ ok: false, error: "event_log_failed" }, 500);
  }

  const eventId = inserted?.id as string | undefined;

  // ---- Apply the canonical CRM transition, if any. ----
  const mutation = deriveContactMutation(evt, payload);
  const mailboxMutation = deriveMailboxMutation(evt, payload);
  let applied = false;
  let processingStatus = "processed";
  let processingError: string | null = null;

  try {
    if (Object.keys(mutation.contact_patch).length > 0) {
      if (!contact) {
        processingStatus = "unmatched";
        processingError = "contact_not_resolved_for_suppression_event";
      } else {
        // Escalation only: never clear an existing block.
        const patch: Record<string, unknown> = { ...mutation.contact_patch };
        if (contact.hard_bounced === true) delete patch.hard_bounced;
        if (contact.unsubscribed_at) {
          delete patch.unsubscribed_at;
          delete patch.unsubscribe_source;
        }
        if (contact.do_not_contact_at) {
          delete patch.do_not_contact_at;
          delete patch.do_not_contact_reason;
        }
        if (Object.keys(patch).length > 0) {
          const { error: upErr } = await admin.from("contacts").update(patch).eq("id", contact.id);
          if (upErr) {
            processingStatus = "failed";
            processingError = "contact_update_failed";
          } else {
            applied = true;
          }
        } else {
          applied = false;
        }
      }
    }

    // Pause a mailbox the provider says is broken.
    if (Object.keys(mailboxMutation.inbox_patch).length > 0 && evt.provider_mailbox_id) {
      await admin
        .from("inboxes")
        .update(mailboxMutation.inbox_patch)
        .eq("provider_mailbox_id", evt.provider_mailbox_id);
    }

    // Reflect the block on the lead mapping so it can never be re-pushed.
    if (mutation.blocks_future_sends && leadMapping?.id) {
      await admin
        .from("outbound_provider_lead_mappings")
        .update({
          sendability_status: "blocked",
          block_reason: mutation.transition,
          snapshot_taken_at: receivedAt,
        })
        .eq("id", leadMapping.id);
    }
  } catch {
    processingStatus = "failed";
    processingError = "processing_exception";
  }

  if (eventId) {
    await admin
      .from("outbound_provider_events")
      .update({
        processing_status: evt.is_known ? processingStatus : "stored_unknown_type",
        operational_mutation_applied: applied,
        processed_at: new Date().toISOString(),
        error: processingError,
      })
      .eq("id", eventId);
  }

  return json({
    ok: true,
    duplicate: false,
    event_id: eventId ?? null,
    event_type: evt.canonical_event_type,
    known_event_type: evt.is_known,
    transition: mutation.transition,
    blocks_future_sends: mutation.blocks_future_sends,
    contact_matched: !!contact,
    campaign_mapping_matched: !!campaignMapping,
    lead_mapping_matched: !!leadMapping,
    operational_mutation_applied: applied,
    processing_status: evt.is_known ? processingStatus : "stored_unknown_type",
    notes: "Event stored with provenance. Suppression changes only escalate. No Smartlead mutation, no email sent.",
  });
});
