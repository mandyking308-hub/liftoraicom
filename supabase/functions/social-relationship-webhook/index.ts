/** Verified, idempotent inbound webhook receiver for Social Relationships. */
import { corsHeaders, json, serviceClient, audit } from "../_shared/socialRelationshipDb.ts";
import { classifyIntent, detectEscalation, isOptOut } from "../_shared/socialRelationshipLogic.ts";

function secureEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
async function hexSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function signatureParts(header: string): { timestamp: string; signature: string } | null {
  const entries = header.split(",").map((part) => part.trim().split("=", 2));
  const values = Object.fromEntries(entries.filter((entry) => entry.length === 2));
  return values.t && values.v0 ? { timestamp: values.t, signature: values.v0 } : null;
}
async function authenticate(req: Request, rawBody: string): Promise<{ ok: boolean; method?: string; error?: string }> {
  const signature = req.headers.get("unipile-signature") ?? "";
  const officialSecret = (Deno.env.get("UNIPILE_WEBHOOK_SECRET") ?? "").trim();
  if (signature && officialSecret) {
    const parts = signatureParts(signature);
    if (!parts) return { ok: false, error: "signature_header_invalid" };
    const timestamp = Number(parts.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return { ok: false, error: "signature_expired" };
    const expected = await hmacHex(officialSecret, `${parts.timestamp}.${rawBody}`);
    return secureEqual(parts.signature.toLowerCase(), expected.toLowerCase())
      ? { ok: true, method: "unipile_hmac_sha256" }
      : { ok: false, error: "signature_invalid" };
  }
  const fallbackSecret = (Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET") ?? "").trim();
  const supplied = (req.headers.get("x-social-relationship-webhook-secret") ?? "").trim();
  return fallbackSecret && secureEqual(fallbackSecret, supplied)
    ? { ok: true, method: "explicit_shared_secret_fallback" }
    : { ok: false, error: "signature_missing_or_invalid" };
}
function extract(payload: Record<string, any>) {
  const nested = record(payload.payload);
  const message = Object.keys(record(payload.message)).length ? record(payload.message) : nested;
  const chat = record(message.chat);
  const sender = record(message.sender);
  const account = record(payload.account_info);
  const type = firstString(payload.event, payload.type, nested.event, nested.type) ?? "unknown";
  const chatId = firstString(payload.chat_id, message.chat_id, chat.id, nested.chat_id);
  const accountId = firstString(payload.account_id, message.account_id, nested.account_id, account.account_id);
  const messageId = firstString(payload.message_id, message.message_id, message.id, nested.message_id, nested.id);
  const senderId = firstString(message.sender_id, sender.id, sender.attendee_provider_id, nested.sender_id);
  const text = firstString(message.text, message.content, message.body, payload.text) ?? "";
  const createdAt = firstString(message.timestamp, message.created_at, nested.timestamp, payload.timestamp) ?? new Date().toISOString();
  const outbound = typeof message.is_sender === "boolean" ? message.is_sender : false;
  const profileId = firstString(nested.provider_profile_id, nested.user_id, payload.provider_profile_id, senderId);
  return { type, chatId, accountId, messageId, senderId, text: text.slice(0, 8000), createdAt, outbound, profileId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const rawBody = await req.text();
  const verified = await authenticate(req, rawBody);
  if (!verified.ok) return json({ ok: false, error: verified.error ?? "invalid_signature" }, 401);

  let payload: Record<string, any>;
  try { payload = record(JSON.parse(rawBody)); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const fields = extract(payload);
  const payloadHash = await hexSha256(rawBody);
  const providerEventId = firstString(payload.webhook_id, payload.event_id, payload.delivery_id, fields.messageId) ?? payloadHash;
  const admin = serviceClient();
  const { data: duplicate } = await admin.from("social_relationship_webhook_events")
    .select("id").eq("provider", "unipile").eq("provider_event_id", providerEventId).maybeSingle();
  if (duplicate) return json({ ok: true, deduped: true, event_id: providerEventId });

  const sanitisedPayload = {
    event_type: fields.type, account_id: fields.accountId, chat_id: fields.chatId,
    message_id: fields.messageId, sender_id: fields.senderId, text: fields.text,
    created_at: fields.createdAt, outbound: fields.outbound, payload_hash: payloadHash,
  };
  const { data: eventRow, error: eventError } = await admin.from("social_relationship_webhook_events").insert({
    provider: "unipile", event_type: fields.type, provider_event_id: providerEventId,
    payload: sanitisedPayload, signature_valid: true, processing_status: "received",
  }).select("*").maybeSingle();
  if (eventError?.code === "23505") return json({ ok: true, deduped: true, event_id: providerEventId });
  if (eventError || !eventRow) return json({ ok: false, error: "event_record_failed" }, 500);

  try {
    if (!fields.accountId) {
      await admin.from("social_relationship_webhook_events").update({ processing_status: "ignored", processing_error: "account_id_missing", processed_at: new Date().toISOString() }).eq("id", eventRow.id);
      return json({ ok: true, ignored: true, reason: "account_id_missing" });
    }

    let account: any = null;
    if (fields.chatId) {
      const { data: existingConversation } = await admin.from("social_relationship_conversations")
        .select("account_id,business_id").eq("provider_chat_id", fields.chatId).limit(2);
      if ((existingConversation ?? []).length === 1) {
        account = (await admin.from("social_relationship_accounts").select("*")
          .eq("id", existingConversation![0].account_id).eq("business_id", existingConversation![0].business_id).maybeSingle()).data;
      }
    }
    if (!account) {
      const { data: matches } = await admin.from("social_relationship_accounts").select("*")
        .eq("provider", "unipile").eq("provider_account_id", fields.accountId).limit(2);
      if ((matches ?? []).length !== 1) {
        await admin.from("social_relationship_webhook_events").update({ processing_status: "ignored", processing_error: "account_business_route_ambiguous", processed_at: new Date().toISOString() }).eq("id", eventRow.id);
        return json({ ok: true, ignored: true, reason: "account_business_route_ambiguous" });
      }
      account = matches![0];
    }
    const business_id = account.business_id;

    if (fields.type.includes("relation") || fields.type.includes("invitation_accepted")) {
      if (fields.profileId) {
        const { data: profile } = await admin.from("social_relationship_profiles").select("id")
          .eq("business_id", business_id).eq("network", account.network).eq("provider_profile_id", fields.profileId).maybeSingle();
        if (profile) {
          await admin.from("social_relationship_profiles").update({ relationship_status: "connected", updated_at: new Date().toISOString() }).eq("id", profile.id).eq("business_id", business_id);
          await admin.from("social_relationship_targets").update({ target_status: "connected", updated_at: new Date().toISOString() }).eq("profile_id", profile.id).eq("business_id", business_id);
          await admin.from("social_relationship_action_queue").update({ action_status: "accepted", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("profile_id", profile.id).eq("business_id", business_id).eq("action_status", "sent");
        }
      }
      await admin.from("social_relationship_webhook_events").update({ business_id, processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", eventRow.id);
      return json({ ok: true, processed: "relation_event" });
    }

    if (!fields.chatId || !fields.messageId || !fields.text) {
      await admin.from("social_relationship_webhook_events").update({ business_id, processing_status: "ignored", processing_error: "not_a_message_event", processed_at: new Date().toISOString() }).eq("id", eventRow.id);
      return json({ ok: true, ignored: true, reason: "not_a_message_event" });
    }

    let profile: any = null;
    if (fields.senderId) {
      profile = (await admin.from("social_relationship_profiles").select("*")
        .eq("business_id", business_id).eq("network", account.network).eq("provider_profile_id", fields.senderId).maybeSingle()).data;
    }
    let { data: conversation } = await admin.from("social_relationship_conversations").select("*")
      .eq("business_id", business_id).eq("account_id", account.id).eq("provider_chat_id", fields.chatId).maybeSingle();
    if (!conversation) {
      conversation = (await admin.from("social_relationship_conversations").insert({
        business_id, account_id: account.id, profile_id: profile?.id ?? null, network: account.network,
        provider_chat_id: fields.chatId, conversation_status: "open",
      }).select("*").maybeSingle()).data;
    }
    if (!conversation) throw new Error("conversation_create_failed");

    const { data: existingMessage } = await admin.from("social_relationship_messages").select("id")
      .eq("conversation_id", conversation.id).eq("provider_message_id", fields.messageId).maybeSingle();
    if (!existingMessage) {
      await admin.from("social_relationship_messages").insert({
        business_id, conversation_id: conversation.id, network: account.network,
        direction: fields.outbound ? "outbound" : "inbound",
        message_status: fields.outbound ? "sent" : "received", content: fields.text,
        provider_message_id: fields.messageId, provider_timestamp: fields.createdAt,
        metadata: { signature_method: verified.method, sender_id: fields.senderId },
      });
    }
    if (fields.outbound) {
      await admin.from("social_relationship_conversations").update({
        last_message_at: fields.createdAt, last_outbound_at: fields.createdAt, updated_at: new Date().toISOString(),
      }).eq("id", conversation.id).eq("business_id", business_id);
    } else {
      const intent = classifyIntent(fields.text);
      const escalation = detectEscalation(fields.text, { intent });
      const immediateStop = isOptOut(fields.text) || intent === "not_interested" || intent === "complaint";
      const history = Array.isArray(conversation.intent_history) ? conversation.intent_history : [];
      const patch: Record<string, unknown> = {
        last_message_at: fields.createdAt, last_inbound_at: fields.createdAt,
        unread_count: Number(conversation.unread_count ?? 0) + 1, last_intent: intent,
        intent_history: [...history, { intent, at: new Date().toISOString() }].slice(-20),
        priority_boost: Math.min(100, Number(conversation.priority_boost ?? 0) + (intent === "question" ? 20 : 0)),
        updated_at: new Date().toISOString(),
      };
      if (immediateStop && profile) {
        patch.conversation_status = "suppressed";
        const reason = isOptOut(fields.text) ? "opt_out" : intent === "complaint" ? "complaint" : "negative_reply";
        const { data: existingSuppression } = await admin.from("social_relationship_suppressions").select("id")
          .eq("business_id", business_id).eq("network", account.network).eq("provider_profile_id", profile.provider_profile_id).maybeSingle();
        if (!existingSuppression) await admin.from("social_relationship_suppressions").insert({
          business_id, scope: "business", network: account.network,
          provider_profile_id: profile.provider_profile_id, profile_url: profile.profile_url,
          reason, detail: `Inbound social intent: ${intent}`,
        });
        await admin.from("social_relationship_targets").update({ target_status: "suppressed", blocked_reason: reason, updated_at: new Date().toISOString() }).eq("profile_id", profile.id).eq("business_id", business_id);
        await admin.from("social_relationship_action_queue").update({ action_status: "cancelled", blocked_reason: `${reason}_received`, updated_at: new Date().toISOString() })
          .eq("profile_id", profile.id).eq("business_id", business_id)
          .in("action_status", ["draft","pending_approval","ready","retrying","blocked"]);
      }
      if (escalation.escalate) {
        patch.escalation_pending = true; patch.escalation_reason = escalation.category; patch.conversation_status = "escalated";
        const { data: escalationRow } = await admin.from("social_relationship_escalations").insert({
          business_id, conversation_id: conversation.id, category: escalation.category ?? "other",
          severity: escalation.severity ?? "medium", summary: fields.text.slice(0, 300), escalation_status: "open",
        }).select("id").maybeSingle();
        if (escalationRow?.id) {
          await admin.from("founder_approval_items").insert({
            approval_type: "social_relationship_escalation", business_id,
            agent_key: "social_relationship_engine", source_system: "social_relationship_engine",
            source_table: "social_relationship_escalations", source_id: escalationRow.id,
            title: `Social conversation requires review: ${escalation.category ?? intent}`,
            summary: fields.text.slice(0, 500), recommended_action: "Review and decide the response. No automatic reply has been sent.",
            priority_level: escalation.severity === "critical" ? "urgent" : "high", status: "pending",
          });
        }
      }
      await admin.from("social_relationship_conversations").update(patch).eq("id", conversation.id).eq("business_id", business_id);
    }

    await admin.from("social_relationship_webhook_events").update({ business_id, processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", eventRow.id);
    await audit(admin, {
      business_id, account_id: account.id, conversation_id: conversation.id,
      event: "webhook_processed", actor: "provider", provider: account.provider,
      detail: { event_type: fields.type, message_id: fields.messageId, outbound: fields.outbound },
    });
    return json({ ok: true, processed: true, conversation_id: conversation.id });
  } catch (error) {
    const message = String((error as Error)?.message ?? error).slice(0, 300);
    await admin.from("social_relationship_webhook_events").update({ processing_status: "failed", processing_error: message, processed_at: new Date().toISOString() }).eq("id", eventRow.id);
    return json({ ok: false, error: "processing_failed" }, 500);
  }
});
