import { corsHeaders, json, requireRelationshipWebhook } from "../_shared/socialRelationshipAuth.ts";
import {
  cancelPendingActionsForProfile,
  relationshipAudit,
} from "../_shared/socialRelationshipDb.ts";
import {
  classifyRelationshipIntent,
  requiresFounderEscalation,
  shouldSuppressImmediately,
} from "../_shared/socialRelationshipLogic.ts";

function object(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function eventType(body: Record<string, any>): string {
  if (typeof body.type === "string") return body.type;
  if (typeof body.event === "string") return body.event;
  if (body.AccountStatus) return "account.status.v1";
  if (body.message_received || body.message) return "message_received";
  return "unknown";
}

function accountIdFrom(body: Record<string, any>): string | null {
  const payload = object(body.payload);
  const account = object(body.account);
  const info = object(body.account_info);
  const status = object(body.AccountStatus);
  return firstText(body.account_id, payload.account_id, account.id, account.account_id, info.account_id, status.account_id);
}

function messageFields(body: Record<string, any>) {
  const payload = object(body.payload);
  const message = Object.keys(payload).length ? payload : Object.keys(object(body.message)).length ? object(body.message) : body;
  const chat = object(message.chat);
  const sender = object(message.sender);
  const info = object(body.account_info);
  const externalMessageId = firstText(message.id, message.message_id, body.message_id);
  const chatId = firstText(message.chat_id, chat.id, body.chat_id);
  const senderId = firstText(message.sender_id, sender.id, sender.attendee_provider_id, message.attendee_provider_id);
  const text = firstText(message.text, message.content, message.body) ?? "";
  const createdAt = firstText(message.timestamp, message.created_at, body.created_at) ?? new Date().toISOString();
  const ownerId = firstText(info.user_id, body.account_user_id);
  const explicitSender = typeof message.is_sender === "boolean" ? message.is_sender : null;
  const outbound = explicitSender ?? (!!ownerId && !!senderId && ownerId === senderId);
  return { externalMessageId, chatId, senderId, text, createdAt, outbound, sanitised: {
    id: externalMessageId, chat_id: chatId, sender_id: senderId, text, created_at: createdAt, is_sender: outbound,
  } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = requireRelationshipWebhook(req);
  if ("error" in auth) return auth.error;
  const raw = await req.text();
  let body: Record<string, any>;
  try { body = object(JSON.parse(raw)); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const hash = await sha256(raw);
  const type = eventType(body);
  const externalEventId = firstText(body.id, body.event_id, body.delivery_id, body.webhook_id) ?? hash;
  const externalAccountId = accountIdFrom(body);
  const insert = await auth.admin.from("social_relationship_webhook_events").insert({
    provider: "unipile",
    external_event_id: externalEventId,
    event_type: type,
    account_external_id: externalAccountId,
    signature_verified: true,
    processing_status: "processing",
    payload_hash: hash,
    sanitised_payload: { type, account_id: externalAccountId },
    attempts: 1,
  }).select("id").maybeSingle();
  if (insert.error?.code === "23505") return json({ ok: true, duplicate: true, event_id: externalEventId });
  if (insert.error || !insert.data) return json({ ok: false, error: "webhook_event_record_failed" }, 500);
  const webhookRowId = insert.data.id;

  try {
    const { data: account } = externalAccountId
      ? await auth.admin.from("social_relationship_accounts").select("*").eq("provider", "unipile").eq("external_account_id", externalAccountId).maybeSingle()
      : { data: null };

    if (type.startsWith("account.status") || type === "account.add" || type === "account.reconnect" || type === "account.remove") {
      const statusPayload = object(body.payload);
      const legacy = object(body.AccountStatus);
      const rawStatus = firstText(statusPayload.status, statusPayload.message, legacy.message, body.status) ?? type;
      const normalized = /running|ok|add|reconnect/i.test(rawStatus) ? "connected"
        : /credential|checkpoint/i.test(rawStatus) ? "checkpoint"
        : /remove|disconnect/i.test(rawStatus) ? "disconnected" : "degraded";
      if (account) await auth.admin.from("social_relationship_accounts").update({ account_status: normalized, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", account.id);
      await auth.admin.from("social_relationship_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), sanitised_payload: { type, account_id: externalAccountId, status: rawStatus } }).eq("id", webhookRowId);
      return json({ ok: true, event_id: externalEventId, processed: "account_status", status: normalized });
    }

    if (type === "relation.request.accept" || type === "new_relation") {
      const payload = object(body.payload);
      const providerProfileId = firstText(payload.provider_id, payload.user_id, body.provider_id);
      if (account && providerProfileId) {
        await auth.admin.from("social_relationship_profiles").update({ relationship_status: "connected", last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("provider", "unipile").eq("account_id", account.id).eq("external_profile_id", providerProfileId);
        await auth.admin.from("social_relationship_action_queue").update({ action_status: "accepted", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("account_id", account.id).eq("profile_id", (await auth.admin.from("social_relationship_profiles").select("id").eq("account_id", account.id).eq("external_profile_id", providerProfileId).maybeSingle()).data?.id)
          .in("action_status", ["sent","submission_unknown"]);
      }
      await auth.admin.from("social_relationship_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), sanitised_payload: { type, account_id: externalAccountId, provider_profile_id: providerProfileId } }).eq("id", webhookRowId);
      return json({ ok: true, event_id: externalEventId, processed: "relation_accepted" });
    }

    if (!["message.new","message_received","message.received"].includes(type)) {
      await auth.admin.from("social_relationship_webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString(), sanitised_payload: { type, account_id: externalAccountId } }).eq("id", webhookRowId);
      return json({ ok: true, event_id: externalEventId, ignored: true, type });
    }

    if (!account) throw new Error("account_not_mapped");
    const msg = messageFields(body);
    if (!msg.externalMessageId || !msg.chatId) throw new Error("message_id_or_chat_id_missing");

    let { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*").eq("provider", "unipile").eq("account_id", account.id).eq("external_chat_id", msg.chatId).maybeSingle();
    let businessId: string | null = conversation?.business_id ?? null;
    if (!businessId) {
      const mappings = await auth.admin.from("social_relationship_business_accounts")
        .select("business_id").eq("account_id", account.id).eq("active", true).eq("inbound_routing_enabled", true);
      if ((mappings.data ?? []).length !== 1) {
        await auth.admin.from("social_relationship_webhook_events").update({
          processing_status: "ignored", last_error: "inbound_business_route_unresolved", processed_at: new Date().toISOString(),
          sanitised_payload: { type, account_id: externalAccountId, chat_id: msg.chatId },
        }).eq("id", webhookRowId);
        return json({ ok: true, event_id: externalEventId, ignored: true, reason: "inbound_business_route_unresolved" });
      }
      businessId = mappings.data[0].business_id;
    }

    let profile: any = null;
    if (msg.senderId) {
      profile = (await auth.admin.from("social_relationship_profiles").select("*").eq("business_id", businessId).eq("provider", "unipile").eq("external_profile_id", msg.senderId).maybeSingle()).data;
      if (!profile) {
        profile = (await auth.admin.from("social_relationship_profiles").insert({
          business_id: businessId,
          provider: "unipile",
          platform: account.platform,
          account_id: account.id,
          external_profile_id: msg.senderId,
          relationship_status: "connected",
          source_type: "inbound_message",
          source_provenance: { webhook_event_id: externalEventId },
          risk_status: "unreviewed",
          last_synced_at: new Date().toISOString(),
        }).select("*").maybeSingle()).data;
      }
    }

    if (!conversation) {
      conversation = (await auth.admin.from("social_relationship_conversations").insert({
        business_id: businessId,
        provider: "unipile",
        platform: account.platform,
        account_id: account.id,
        profile_id: profile?.id ?? null,
        external_chat_id: msg.chatId,
        conversation_status: "open",
        last_message_at: msg.createdAt,
        last_inbound_at: msg.outbound ? null : msg.createdAt,
        last_outbound_at: msg.outbound ? msg.createdAt : null,
        source_attribution: { source: "provider_webhook", first_event_id: externalEventId },
      }).select("*").maybeSingle()).data;
    }
    if (!conversation) throw new Error("conversation_create_failed");

    const intent = msg.outbound ? null : classifyRelationshipIntent(msg.text);
    const messageInsert = await auth.admin.from("social_relationship_messages").insert({
      business_id: businessId,
      conversation_id: conversation.id,
      provider: "unipile",
      platform: account.platform,
      external_message_id: msg.externalMessageId,
      direction: msg.outbound ? "outbound" : "inbound",
      content: msg.text,
      provider_created_at: msg.createdAt,
      delivery_status: msg.outbound ? "sent" : "received",
      ai_generated: false,
      classification: intent,
      raw_event_id: externalEventId,
    }).select("*").maybeSingle();
    if (messageInsert.error?.code === "23505") {
      await auth.admin.from("social_relationship_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", webhookRowId);
      return json({ ok: true, duplicate_message: true, event_id: externalEventId });
    }
    if (messageInsert.error || !messageInsert.data) throw new Error("message_insert_failed");

    const history = Array.isArray(conversation.intent_history) ? conversation.intent_history : [];
    await auth.admin.from("social_relationship_conversations").update({
      last_message_at: msg.createdAt,
      last_inbound_at: msg.outbound ? conversation.last_inbound_at : msg.createdAt,
      last_outbound_at: msg.outbound ? msg.createdAt : conversation.last_outbound_at,
      last_intent: intent ?? conversation.last_intent,
      intent_history: intent ? [...history, { intent, at: new Date().toISOString() }].slice(-20) : history,
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.id);

    if (intent) {
      const latency = Math.max(0, (Date.now() - new Date(msg.createdAt).getTime()) / 1000);
      await auth.admin.from("social_relationship_ai_actions").insert({
        business_id: businessId, conversation_id: conversation.id, message_id: messageInsert.data.id,
        action_type: "classify", classification: intent, tokens_used: 0, status: "completed",
        reply_latency_seconds: Number.isFinite(latency) ? latency : null,
        metadata: { classifier: "deterministic_preflight" },
      });

      if (profile && shouldSuppressImmediately(intent)) {
        const typeMap: Record<string,string> = { unsubscribe: "opt_out", not_interested: "not_interested", complaint: "complaint" };
        const existing = await auth.admin.from("social_relationship_suppressions").select("id").eq("profile_id", profile.id).eq("active", true).limit(1);
        if (!(existing.data ?? []).length) await auth.admin.from("social_relationship_suppressions").insert({
          business_id: businessId, provider: "unipile", platform: account.platform,
          external_profile_id: profile.external_profile_id, profile_id: profile.id,
          suppression_type: typeMap[intent] ?? "manual", reason: `Inbound intent: ${intent}`,
          source_message_id: msg.externalMessageId,
        });
        await auth.admin.from("social_relationship_profiles").update({ do_not_contact: true, updated_at: new Date().toISOString() }).eq("id", profile.id);
        await cancelPendingActionsForProfile(auth.admin, businessId, profile.id, `cancelled_after_${intent}`);
        await auth.admin.from("social_relationship_conversations").update({ conversation_status: "suppressed", updated_at: new Date().toISOString() }).eq("id", conversation.id);
      }

      if (requiresFounderEscalation(intent)) {
        const severity = ["legal","safeguarding"].includes(intent) ? "critical" : ["complaint","high_value","investor","press"].includes(intent) ? "high" : "medium";
        const escalation = await auth.admin.from("social_relationship_escalations").insert({
          business_id: businessId, conversation_id: conversation.id, message_id: messageInsert.data.id,
          escalation_type: intent, severity, reason: `Inbound social message classified as ${intent}`,
        }).select("id").maybeSingle();
        await auth.admin.from("social_relationship_conversations").update({ conversation_status: "escalated", escalation_pending: true, updated_at: new Date().toISOString() }).eq("id", conversation.id);
        if (escalation.data?.id) {
          const approval = await auth.admin.from("founder_approval_items").insert({
            approval_type: "social_relationship_escalation",
            business_id: businessId,
            agent_key: "social_relationship_engine",
            source_system: "social_relationship_engine",
            source_table: "social_relationship_escalations",
            source_id: escalation.data.id,
            title: `Social conversation requires review: ${intent}`,
            summary: msg.text.slice(0, 500),
            recommended_action: "Review the social conversation and decide the response.",
            priority_level: severity === "critical" ? "urgent" : "high",
            status: "pending",
          }).select("id").maybeSingle();
          if (approval.data?.id) await auth.admin.from("social_relationship_escalations").update({ founder_approval_item_id: approval.data.id }).eq("id", escalation.data.id);
        }
      }
    }

    await relationshipAudit(auth.admin, {
      business_id: businessId, provider: "unipile", account_id: account.id,
      action: "webhook_message_ingested", action_status: "processed",
      entity_type: "conversation", entity_id: conversation.id,
      after_json: { message_id: messageInsert.data.id, direction: msg.outbound ? "outbound" : "inbound", intent },
    });
    await auth.admin.from("social_relationship_webhook_events").update({
      processing_status: "processed", processed_at: new Date().toISOString(),
      sanitised_payload: { type, account_id: externalAccountId, message: msg.sanitised },
    }).eq("id", webhookRowId);
    return json({ ok: true, event_id: externalEventId, conversation_id: conversation.id, message_id: messageInsert.data.id, intent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await auth.admin.from("social_relationship_webhook_events").update({ processing_status: "failed", last_error: message.slice(0, 500), processed_at: new Date().toISOString() }).eq("id", webhookRowId);
    return json({ ok: false, error: "webhook_processing_failed", detail: message.slice(0, 200) }, 500);
  }
});
