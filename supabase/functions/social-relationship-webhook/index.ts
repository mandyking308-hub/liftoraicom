/**
 * Public inbound webhook receiver for social relationship providers.
 * Authenticated by a shared secret header (never a URL query parameter).
 * Fails closed: unsigned events are stored for audit and never processed.
 */
import { corsHeaders, json, serviceClient, audit } from "../_shared/socialRelationshipDb.ts";
import { classifyIntent, detectEscalation, isOptOut } from "../_shared/socialRelationshipLogic.ts";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const expected = (Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET") ?? "").trim();
  const supplied = (req.headers.get("x-social-relationship-secret") ?? "").trim();
  const signature_valid = Boolean(expected) && timingSafeEqual(expected, supplied);

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const admin = serviceClient();
  const provider_event_id = String(payload.webhook_id ?? payload.event_id ?? payload.message_id ?? crypto.randomUUID());

  const { data: dupe } = await admin
    .from("social_relationship_webhook_events").select("id").eq("provider_event_id", provider_event_id).maybeSingle();
  if (dupe) return json({ ok: true, deduped: true });

  const { data: evt } = await admin.from("social_relationship_webhook_events").insert({
    provider: String(payload.provider ?? "unipile"),
    event_type: String(payload.event ?? payload.type ?? "unknown"),
    provider_event_id,
    payload,
    signature_valid,
    processing_status: signature_valid ? "pending" : "rejected",
    processing_error: signature_valid ? null : "invalid_or_missing_signature",
  }).select("*").maybeSingle();

  if (!signature_valid) return json({ ok: false, error: "invalid_signature" }, 401);

  try {
    const chat_id = String(payload.chat_id ?? payload.chat?.id ?? "");
    const account_provider_id = String(payload.account_id ?? "");
    const text = String(payload.message ?? payload.text ?? "").slice(0, 8000);
    const provider_message_id = String(payload.message_id ?? payload.id ?? provider_event_id);

    if (!chat_id || !account_provider_id) {
      await admin.from("social_relationship_webhook_events")
        .update({ processing_status: "ignored", processing_error: "missing_chat_or_account", processed_at: new Date().toISOString() })
        .eq("id", evt!.id);
      return json({ ok: true, ignored: true });
    }

    const { data: account } = await admin.from("social_relationship_accounts")
      .select("*").eq("provider_account_id", account_provider_id).maybeSingle();
    if (!account) {
      await admin.from("social_relationship_webhook_events")
        .update({ processing_status: "ignored", processing_error: "account_not_found", processed_at: new Date().toISOString() })
        .eq("id", evt!.id);
      return json({ ok: true, ignored: true });
    }
    const business_id = account.business_id;

    let { data: conv } = await admin.from("social_relationship_conversations")
      .select("*").eq("business_id", business_id).eq("provider_chat_id", chat_id).maybeSingle();
    if (!conv) {
      conv = (await admin.from("social_relationship_conversations").insert({
        business_id, account_id: account.id, network: account.network, provider_chat_id: chat_id,
        conversation_status: "open",
      }).select("*").maybeSingle()).data;
    }

    const eventType = String(payload.event ?? payload.type ?? "");
    if (eventType.includes("relation") || eventType.includes("invitation_accepted")) {
      await admin.from("social_relationship_targets")
        .update({ target_status: "connected" })
        .eq("business_id", business_id)
        .eq("profile_id", conv?.profile_id ?? "00000000-0000-0000-0000-000000000000");
    }

    if (text) {
      const { data: exists } = await admin.from("social_relationship_messages")
        .select("id").eq("provider_message_id", provider_message_id).maybeSingle();
      if (!exists) {
        await admin.from("social_relationship_messages").insert({
          business_id, conversation_id: conv!.id, network: account.network,
          direction: "inbound", message_status: "received", content: text,
          provider_message_id, provider_timestamp: payload.timestamp ?? null,
        });
      }
      const intent = classifyIntent(text);
      const esc = detectEscalation(text, { intent });
      const patch: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        last_inbound_at: new Date().toISOString(),
        unread_count: (conv!.unread_count ?? 0) + 1,
        last_intent: intent,
        intent_history: [...((conv!.intent_history as any[]) ?? []), { intent, at: new Date().toISOString() }].slice(-20),
        priority_boost: Math.min(100, (conv!.priority_boost ?? 0) + (intent === "question" ? 20 : 0)),
      };
      if (esc.escalate) {
        patch.escalation_pending = true;
        patch.escalation_reason = esc.category;
        await admin.from("social_relationship_escalations").insert({
          business_id, conversation_id: conv!.id, category: esc.category ?? "other",
          severity: esc.severity ?? "medium", summary: text.slice(0, 300), escalation_status: "open",
        });
      }
      if (isOptOut(text)) {
        patch.conversation_status = "closed";
        const { data: profile } = await admin.from("social_relationship_profiles").select("*").eq("id", conv!.profile_id ?? "").maybeSingle();
        await admin.from("social_relationship_suppressions").insert({
          business_id, scope: "profile", network: account.network,
          provider_profile_id: profile?.provider_profile_id ?? null,
          profile_url: profile?.profile_url ?? null,
          reason: "opt_out", detail: "Detected in inbound social message",
        });
        await admin.from("social_relationship_action_queue")
          .update({ action_status: "cancelled", blocked_reason: "opt_out_received" })
          .eq("conversation_id", conv!.id)
          .in("action_status", ["draft", "pending_approval", "approved", "scheduled", "retry"]);
      }
      await admin.from("social_relationship_conversations").update(patch).eq("id", conv!.id);
    }

    await admin.from("social_relationship_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString(), business_id })
      .eq("id", evt!.id);
    await audit(admin, { business_id, account_id: account.id, conversation_id: conv?.id, event: "webhook_processed", actor: "provider", provider: account.provider, detail: { event_type: eventType } });
    return json({ ok: true, processed: true });
  } catch (e) {
    await admin.from("social_relationship_webhook_events")
      .update({ processing_status: "failed", processing_error: String((e as Error)?.message ?? e).slice(0, 300), processed_at: new Date().toISOString() })
      .eq("id", evt!.id);
    return json({ ok: false, error: "processing_failed" }, 500);
  }
});
