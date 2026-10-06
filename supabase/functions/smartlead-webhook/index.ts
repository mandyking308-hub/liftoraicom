import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildIdempotencyKey,
  deriveContactMutation,
  deriveMailboxMutation,
  EVENT_NORMALIZER_VERSION,
  extractEvent,
} from "../_shared/smartleadEventNormalizer.ts";
import {
  resolveProviderConnectionSecret,
  type ScopedProviderConnection,
} from "../_shared/providerConnectionResolver.ts";
import {
  resolveSmartleadAttribution,
  type ScopedBusinessContactRelationship,
  type ScopedCampaignMapping,
  type ScopedLeadMapping,
} from "../_shared/smartleadCrmAttribution.ts";
import {
  smartleadWebhookReceiverEnabled,
  verifySmartleadWebhookSignature,
} from "../_shared/smartleadWebhookAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-smartlead-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

interface SmartleadConnection extends ScopedProviderConnection {
  inbound_receiver_enabled: boolean;
}

interface ScopedBcr extends ScopedBusinessContactRelationship {
  current_stage: string;
  do_not_contact: boolean;
}

interface MailboxMapping {
  business_id: string;
  provider_connection_id: string;
  provider_type: string;
  provider_mailbox_id: string;
  inbox_id: string | null;
  estate_key: string | null;
  is_active: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && !/[\s%*_]/.test(email) ? email : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // A deployment must opt in explicitly. No secret or connection lookup runs by default.
  if (!smartleadWebhookReceiverEnabled(Deno.env.get("SMARTLEAD_WEBHOOK_RECEIVER_ENABLED"))) {
    return json({ ok: false, error: "receiver_disabled" }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "receiver_unavailable" }, 503);

  const rawBody = new Uint8Array(await req.arrayBuffer());
  const signature = req.headers.get("x-smartlead-signature");
  if (!signature) return json({ ok: false, error: "invalid_signature" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: connectionRows, error: connectionError } = await admin
    .from("outbound_provider_connections")
    .select("id,business_id,provider_type,connection_status,is_enabled,inbound_receiver_enabled,mutations_enabled,credential_secret_ref,webhook_secret_ref")
    .eq("provider_type", "smartlead")
    .eq("connection_status", "verified")
    .eq("is_enabled", true)
    .eq("inbound_receiver_enabled", true);

  if (connectionError) return json({ ok: false, error: "connection_lookup_failed" }, 503);

  const matchedConnections: SmartleadConnection[] = [];
  for (const rawConnection of connectionRows ?? []) {
    const connection = rawConnection as SmartleadConnection;
    const secret = resolveProviderConnectionSecret(connection, "WEBHOOK_SECRET", (name) => Deno.env.get(name));
    if (secret && await verifySmartleadWebhookSignature(rawBody, signature, secret)) {
      matchedConnections.push(connection);
    }
  }

  // Identical secrets across connections are ambiguous and must not select a tenant.
  if (matchedConnections.length !== 1) {
    return json({ ok: false, error: matchedConnections.length ? "ambiguous_provider_connection" : "invalid_signature" }, 401);
  }
  const connection = matchedConnections[0];

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(rawBody));
    if (!isRecord(parsed)) return json({ ok: false, error: "invalid_payload" }, 400);
    payload = parsed;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const event = extractEvent(payload);
  const requestId = req.headers.get("x-request-id");
  const idempotencyKey = buildIdempotencyKey(event, requestId);
  const { data: existing, error: existingError } = await admin
    .from("outbound_provider_events")
    .select("id,processing_status,operational_mutation_applied")
    .eq("provider_connection_id", connection.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) return json({ ok: false, error: "idempotency_lookup_failed" }, 503);
  if (existing) {
    return json({
      ok: true,
      duplicate: true,
      event_id: existing.id,
      event_type: event.canonical_event_type,
      idempotency_key: idempotencyKey,
      processing_status: existing.processing_status,
      operational_mutation_applied: false,
    });
  }

  let campaignMappings: ScopedCampaignMapping[] = [];
  let leadMappings: ScopedLeadMapping[] = [];
  let relationships: ScopedBcr[] = [];
  let campaignLookupError = false;
  let canonicalCampaignLookupError = false;
  let canonicalCampaignMismatch = false;
  let canonicalCampaignOwned = false;
  let leadLookupError = false;
  let bcrLookupError = false;

  if (event.canonical_event_type !== "mailbox_error" && event.provider_campaign_id) {
    const campaignResult = await admin
      .from("outbound_provider_campaign_mappings")
      .select("id,business_id,provider_connection_id,provider_type,provider_campaign_id,liftor_campaign_id,mapping_status,is_active")
      .eq("business_id", connection.business_id)
      .eq("provider_connection_id", connection.id)
      .eq("provider_type", "smartlead")
      .eq("provider_campaign_id", event.provider_campaign_id)
      .eq("mapping_status", "mapped")
      .eq("is_active", true)
      .limit(2);
    campaignLookupError = Boolean(campaignResult.error);
    campaignMappings = (campaignResult.data ?? []) as ScopedCampaignMapping[];

    if (!campaignLookupError && campaignMappings.length === 1) {
      const liftorCampaignId = campaignMappings[0].liftor_campaign_id;
      if (liftorCampaignId) {
        const canonicalCampaignResult = await admin
          .from("outreach_campaigns")
          .select("id")
          .eq("id", liftorCampaignId)
          .eq("business_id", connection.business_id)
          .maybeSingle();
        canonicalCampaignLookupError = Boolean(canonicalCampaignResult.error);
        canonicalCampaignOwned = Boolean(canonicalCampaignResult.data);
        canonicalCampaignMismatch = !canonicalCampaignLookupError && !canonicalCampaignOwned;
      } else {
        canonicalCampaignMismatch = true;
      }

      let leadQuery = admin
        .from("outbound_provider_lead_mappings")
        .select("id,business_id,provider_connection_id,provider_type,campaign_mapping_id,provider_campaign_id,provider_lead_id,contact_email,liftor_contact_id,liftor_campaign_id,business_contact_relationship_id")
        .eq("business_id", connection.business_id)
        .eq("provider_connection_id", connection.id)
        .eq("provider_type", "smartlead")
        .eq("campaign_mapping_id", campaignMappings[0].id)
        .eq("provider_campaign_id", event.provider_campaign_id);

      if (event.provider_lead_id) {
        leadQuery = leadQuery.eq("provider_lead_id", event.provider_lead_id);
      } else {
        const email = normalizedEmail(event.email);
        if (email) leadQuery = leadQuery.eq("contact_email", email);
      }

      if (canonicalCampaignOwned && (event.provider_lead_id || normalizedEmail(event.email))) {
        const leadResult = await leadQuery.limit(2);
        leadLookupError = Boolean(leadResult.error);
        leadMappings = (leadResult.data ?? []) as ScopedLeadMapping[];

        if (!leadLookupError && leadMappings.length === 1 && leadMappings[0].business_contact_relationship_id) {
          const bcrResult = await admin
            .from("business_contact_relationships")
            .select("id,business_id,contact_id,current_stage,do_not_contact")
            .eq("id", leadMappings[0].business_contact_relationship_id)
            .eq("business_id", connection.business_id)
            .eq("contact_id", leadMappings[0].liftor_contact_id)
            .limit(2);
          bcrLookupError = Boolean(bcrResult.error);
          relationships = (bcrResult.data ?? []) as ScopedBcr[];
        }
      }
    }
  }

  if (campaignLookupError || canonicalCampaignLookupError || leadLookupError || bcrLookupError) {
    return json({ ok: false, error: "attribution_lookup_failed" }, 503);
  }

  const attributionResult = resolveSmartleadAttribution({
    businessId: connection.business_id,
    providerConnectionId: connection.id,
    providerCampaignId: event.provider_campaign_id,
    providerLeadId: event.provider_lead_id,
    email: normalizedEmail(event.email),
    campaignMappings: campaignMappings.length === 1 && !canonicalCampaignOwned ? [] : campaignMappings,
    leadMappings,
    businessContactRelationships: relationships,
  });

  let attribution: Extract<typeof attributionResult, { ok: true }> | null = null;
  let attributionError: string | null = null;
  if (event.canonical_event_type !== "mailbox_error") {
    if (canonicalCampaignMismatch) attributionError = "canonical_campaign_business_mismatch";
    else if ("reason" in attributionResult) attributionError = attributionResult.reason;
  }
  if (event.email && !normalizedEmail(event.email)) {
    attributionError = "event_email_invalid";
  } else if (attributionResult.ok) {
    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .select("id,email")
      .eq("id", attributionResult.contactId)
      .maybeSingle();
    if (contactError) return json({ ok: false, error: "canonical_contact_lookup_failed" }, 503);
    if (!contact) {
      attributionError = "canonical_contact_unbound";
    } else if (event.email && normalizedEmail(contact.email) !== normalizedEmail(event.email)) {
      attributionError = "canonical_contact_email_mismatch";
    } else {
      attribution = attributionResult;
    }
  }

  const campaignForAudit = attribution ?? ("campaignMapping" in attributionResult ? attributionResult : null);
  const leadForAudit = attribution ?? ("leadMapping" in attributionResult ? attributionResult : null);
  const canProcess = event.canonical_event_type === "mailbox_error" || attribution !== null;
  const initialStatus = canProcess ? "received" : "ignored";
  const receivedAt = new Date().toISOString();

  const insertPayload = {
    provider_type: "smartlead",
    provider_event_type: event.canonical_event_type,
    provider_event_id: event.provider_event_id,
    provider_campaign_id: event.provider_campaign_id,
    provider_lead_id: event.provider_lead_id,
    provider_mailbox_id: event.provider_mailbox_id,
    idempotency_key: idempotencyKey,
    provider_connection_id: connection.id,
    business_id: connection.business_id,
    campaign_mapping_id: campaignForAudit && "campaignMapping" in campaignForAudit
      ? campaignForAudit.campaignMapping?.id ?? null
      : null,
    lead_mapping_id: leadForAudit && "leadMapping" in leadForAudit ? leadForAudit.leadMapping?.id ?? null : null,
    liftor_campaign_id: campaignForAudit && "campaignMapping" in campaignForAudit
      ? campaignForAudit.campaignMapping?.liftor_campaign_id ?? null
      : null,
    business_contact_relationship_id: attribution?.businessContactRelationship.id ?? null,
    contact_id: attribution?.contactId ?? null,
    event_occurred_at: event.event_occurred_at,
    raw_payload: payload,
    normalized_payload: {
      ...event,
      idempotency_key: idempotencyKey,
      request_id: requestId,
      normalizer_version: EVENT_NORMALIZER_VERSION,
      received_at: receivedAt,
      business_id: connection.business_id,
      provider_connection_id: connection.id,
      attribution_status: attribution ? "resolved" : attributionError ?? "mailbox_event",
    },
    processing_status: initialStatus,
    operational_mutation_applied: false,
    processed_at: canProcess ? null : receivedAt,
    error: canProcess ? null : attributionError,
  };

  const { data: inserted, error: insertError } = await admin
    .from("outbound_provider_events")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      const { data: concurrentDuplicate } = await admin
        .from("outbound_provider_events")
        .select("id,processing_status")
        .eq("provider_connection_id", connection.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (concurrentDuplicate) {
        return json({ ok: true, duplicate: true, event_id: concurrentDuplicate.id, idempotency_key: idempotencyKey });
      }
    }
    return json({ ok: false, error: "event_log_failed" }, 500);
  }

  const eventRowId = inserted?.id ?? null;
  if (!eventRowId) return json({ ok: false, error: "event_log_failed" }, 500);
  if (!canProcess) {
    return json({
      ok: true,
      duplicate: false,
      event_id: eventRowId,
      event_type: event.canonical_event_type,
      idempotency_key: idempotencyKey,
      processing_status: "ignored",
      attribution_error: attributionError,
      operational_mutation_applied: false,
    });
  }

  const applied: string[] = [];
  const failures: string[] = [];
  let ignoredReason: string | null = null;

  if (attribution) {
    const contactMutation = deriveContactMutation(event, payload);
    if (Object.keys(contactMutation.contact_patch).length > 0) {
      const { error } = await admin
        .from("contacts")
        .update(contactMutation.contact_patch)
        .eq("id", attribution.contactId);
      if (error) failures.push("contact_update_failed");
      else applied.push("canonical_contact_state");
    }

    const currentBcr = attribution.businessContactRelationship as ScopedBcr;
    const relationshipPatch: Record<string, unknown> = {};
    if (contactMutation.blocks_future_sends) {
      relationshipPatch.current_stage = "do_not_contact";
      relationshipPatch.do_not_contact = true;
      relationshipPatch.do_not_contact_reason = event.canonical_event_type === "lead_unsubscribed"
        ? "unsubscribed_via_smartlead"
        : "hard_bounce_via_smartlead";
      relationshipPatch.campaign_eligible = false;
      relationshipPatch.last_campaign_id = attribution.liftorCampaignId;
    } else if (
      contactMutation.opens_conversation &&
      !currentBcr.do_not_contact &&
      !["client", "do_not_contact", "archived"].includes(currentBcr.current_stage)
    ) {
      relationshipPatch.current_stage = "engaged";
      relationshipPatch.campaign_eligible = false;
      relationshipPatch.last_campaign_id = attribution.liftorCampaignId;
    }

    if (Object.keys(relationshipPatch).length > 0) {
      const { error } = await admin
        .from("business_contact_relationships")
        .update(relationshipPatch)
        .eq("id", attribution.businessContactRelationship.id)
        .eq("business_id", connection.business_id)
        .eq("contact_id", attribution.contactId);
      if (error) failures.push("business_contact_relationship_update_failed");
      else applied.push("business_contact_relationship_state");
    }
  }

  if (event.canonical_event_type === "mailbox_error" && event.provider_mailbox_id) {
    const { data: mailboxRows, error: mailboxLookupError } = await admin
      .from("outbound_provider_mailbox_mappings")
      .select("business_id,provider_connection_id,provider_type,provider_mailbox_id,inbox_id,estate_key,is_active")
      .eq("business_id", connection.business_id)
      .eq("provider_connection_id", connection.id)
      .eq("provider_type", "smartlead")
      .eq("provider_mailbox_id", event.provider_mailbox_id)
      .eq("is_active", true)
      .limit(2);

    if (mailboxLookupError) {
      failures.push("mailbox_mapping_lookup_failed");
    } else {
      const mappings = (mailboxRows ?? []) as MailboxMapping[];
      if (mappings.length !== 1 || !mappings[0].inbox_id) {
        ignoredReason = "mailbox_mapping_unbound_or_ambiguous";
      } else {
        const mapping = mappings[0];
        const { data: inbox, error: inboxLookupError } = await admin
          .from("inboxes")
          .select("id,business_id,estate_key")
          .eq("id", mapping.inbox_id)
          .eq("business_id", connection.business_id)
          .maybeSingle();

        if (inboxLookupError) {
          failures.push("inbox_lookup_failed");
        } else if (!inbox || (mapping.estate_key && inbox.estate_key !== mapping.estate_key)) {
          ignoredReason = "mailbox_inbox_scope_mismatch";
        } else {
          const mailboxMutation = deriveMailboxMutation(event, payload);
          const { error } = await admin
            .from("inboxes")
            .update(mailboxMutation.inbox_patch)
            .eq("id", mapping.inbox_id)
            .eq("business_id", connection.business_id);
          if (error) failures.push("inbox_update_failed");
          else if (Object.keys(mailboxMutation.inbox_patch).length) applied.push("scoped_mailbox_health");
        }
      }
    }
  } else if (event.canonical_event_type === "mailbox_error") {
    ignoredReason = "provider_mailbox_id_missing";
  }

  const processingStatus = failures.length ? "error" : ignoredReason ? "ignored" : "mapped";
  const { error: finalizeError } = await admin
    .from("outbound_provider_events")
    .update({
      processing_status: processingStatus,
      operational_mutation_applied: applied.length > 0,
      processed_at: new Date().toISOString(),
      error: failures.length ? failures.join(",") : ignoredReason,
    })
    .eq("id", eventRowId)
    .eq("provider_connection_id", connection.id)
    .eq("business_id", connection.business_id);

  if (finalizeError) return json({ ok: false, error: "event_finalize_failed", event_id: eventRowId }, 500);
  return json({
    ok: !failures.length,
    duplicate: false,
    event_id: eventRowId,
    event_type: event.canonical_event_type,
    idempotency_key: idempotencyKey,
    contact_resolved: Boolean(attribution),
    attribution_error: attributionError,
    processing_status: processingStatus,
    operational_mutation_applied: applied.length > 0,
    mutations_applied: applied,
    error: failures.length ? failures.join(",") : ignoredReason,
    notes: "Inbound Smartlead event boundary only. No provider API call, lead push, or email send.",
  }, failures.length ? 500 : 200);
});
