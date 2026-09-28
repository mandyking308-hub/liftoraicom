import { corsHeaders, serviceClient } from "../_shared/socialRelationshipDb.ts";
import { SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import {
  analyzeInboundSocialTurn,
  buildSocialAIDraftMessages,
  buildSafeSocialResponseDraft,
  buildSocialInboundIdempotencyKey,
  expectedSocialInboundSecretRef,
  normalizeInboundSocialEvent,
  sanitizeSocialAIDraft,
  socialInboundReceiverEnabled,
  verifySocialInboundSignature,
  type RetainedTurn,
} from "../_shared/socialInboundMultiTurn.ts";

const MAX_BODY_BYTES = 128 * 1024;
const inboundCorsHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Headers": `${corsHeaders["Access-Control-Allow-Headers"]}, x-social-signature, x-request-id`,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...inboundCorsHeaders, "Content-Type": "application/json" },
});

function asRetainedTurns(value: unknown): RetainedTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): RetainedTurn[] => {
    if (!item || typeof item !== "object") return [];
    const turn = item as Record<string, unknown>;
    if ((turn.role !== "inbound" && turn.role !== "assistant_draft") || typeof turn.content !== "string") return [];
    return [{
      role: turn.role,
      content: turn.content,
      ...(typeof turn.event_id === "string" ? { eventId: turn.event_id } : {}),
      ...(typeof turn.idempotency_key === "string" ? { idempotencyKey: turn.idempotency_key } : {}),
      ...(typeof turn.intent === "string" ? { intent: turn.intent } : {}),
      ...(typeof turn.sentiment === "string" ? { sentiment: turn.sentiment } : {}),
      ...(typeof turn.risk_level === "string" ? { riskLevel: turn.risk_level } : {}),
      ...(turn.role === "assistant_draft" ? { sent: false as const } : {}),
    }];
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadConversationState(
  admin: any,
  input: { businessId: string; socialAccountId: string; provider: string; platform: string; threadId: string; userId: string },
) {
  const { data, error } = await admin.from("social_inbound_conversation_states")
    .select("id,business_id,conversation_id,turn_count,turn_history,escalation_pending")
    .eq("business_id", input.businessId)
    .eq("social_account_id", input.socialAccountId)
    .eq("provider", input.provider)
    .eq("platform", input.platform)
    .eq("external_thread_id", input.threadId)
    .eq("external_user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error("social_inbound_state_read_failed");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: inboundCorsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed", ...SAFETY_FLAGS }, 405);
  if (!socialInboundReceiverEnabled(Deno.env.get("SOCIAL_INBOUND_WEBHOOK_RECEIVER_ENABLED"))) {
    return json({ ok: false, blocked: true, reason: "social_inbound_receiver_disabled", ...SAFETY_FLAGS }, 403);
  }

  let rawBody: Uint8Array;
  let payload: unknown;
  try {
    rawBody = new Uint8Array(await req.arrayBuffer());
    if (rawBody.byteLength === 0 || rawBody.byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: "invalid_body_size", ...SAFETY_FLAGS }, 413);
    }
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
  } catch {
    return json({ ok: false, error: "invalid_json", ...SAFETY_FLAGS }, 400);
  }

  const event = normalizeInboundSocialEvent(payload);
  if (!event) return json({ ok: false, error: "invalid_social_event_envelope", ...SAFETY_FLAGS }, 400);

  try {
    const admin: any = serviceClient();
    const { data: accountRows, error: accountError } = await admin.from("social_accounts")
      .select("id,business_id,provider,platform,account_external_id,connection_status")
      .eq("provider", event.provider)
      .eq("platform", event.platform)
      .eq("account_external_id", event.accountExternalId)
      .limit(2);
    if (accountError) return json({ ok: false, error: "social_account_lookup_failed", ...SAFETY_FLAGS }, 503);
    if (!accountRows || accountRows.length !== 1) {
      return json({ ok: false, error: "social_account_unresolved_or_ambiguous", ...SAFETY_FLAGS }, 401);
    }
    const account = accountRows[0];

    const { data: connections, error: connectionError } = await admin.from("social_provider_connections")
      .select("id,business_id,provider,connection_status,connected_account_id,inbound_receiver_enabled,webhook_secret_ref")
      .eq("business_id", account.business_id)
      .eq("provider", event.provider)
      .eq("connected_account_id", account.id)
      .eq("connection_status", "connected")
      .limit(2);
    if (connectionError) return json({ ok: false, error: "social_provider_connection_lookup_failed", ...SAFETY_FLAGS }, 503);
    if (!connections || connections.length !== 1) {
      return json({ ok: false, error: "social_provider_connection_unresolved_or_ambiguous", ...SAFETY_FLAGS }, 401);
    }
    const connection = connections[0];
    const expectedSecretRef = expectedSocialInboundSecretRef(String(connection.id));
    if (!expectedSecretRef || connection.webhook_secret_ref !== expectedSecretRef) {
      return json({ ok: false, error: "social_webhook_secret_not_configured", ...SAFETY_FLAGS }, 401);
    }
    const signatureValid = await verifySocialInboundSignature(
      rawBody,
      req.headers.get("x-social-signature"),
      Deno.env.get(expectedSecretRef),
    );
    if (!signatureValid) return json({ ok: false, error: "invalid_social_signature", ...SAFETY_FLAGS }, 401);

    if (account.connection_status !== "connected" || connection.inbound_receiver_enabled !== true) {
      return json({ ok: false, blocked: true, reason: "social_account_receiver_disabled", ...SAFETY_FLAGS }, 403);
    }
    const { data: profile, error: profileError } = await admin.from("social_business_profiles")
      .select("business_id,social_inbox_enabled")
      .eq("business_id", account.business_id)
      .maybeSingle();
    if (profileError) return json({ ok: false, error: "social_feature_gate_lookup_failed", ...SAFETY_FLAGS }, 503);
    if (profile?.social_inbox_enabled !== true) {
      return json({ ok: false, blocked: true, reason: "business_social_inbox_disabled", ...SAFETY_FLAGS }, 403);
    }
    const { data: business, error: businessError } = await admin.from("businesses")
      .select("id,name").eq("id", account.business_id).maybeSingle();
    if (businessError || !business) return json({ ok: false, error: "social_business_lookup_failed", ...SAFETY_FLAGS }, 503);

    const idempotencyKey = buildSocialInboundIdempotencyKey(
      event.externalEventId,
      req.headers.get("x-request-id"),
    );
    const { data: priorReceipt, error: receiptError } = await admin.from("social_inbound_event_receipts")
      .select("id,processing_status,engagement_event_id,conversation_state_id")
      .eq("social_account_id", account.id)
      .eq("external_event_id", event.externalEventId)
      .maybeSingle();
    if (receiptError) return json({ ok: false, error: "social_event_dedupe_lookup_failed", ...SAFETY_FLAGS }, 503);
    if (priorReceipt) return json({
      ok: true,
      duplicate: true,
      processing_status: priorReceipt.processing_status,
      event_id: priorReceipt.engagement_event_id,
      state_id: priorReceipt.conversation_state_id,
      ...SAFETY_FLAGS,
    });

    const scope = {
      businessId: String(account.business_id),
      socialAccountId: String(account.id),
      provider: event.provider,
      platform: event.platform,
      threadId: event.externalThreadId,
      userId: event.externalUserId,
    };
    const payloadHash = await sha256Hex(rawBody);

    for (let attempt = 0; attempt < 3; attempt++) {
      const state = await loadConversationState(admin, scope);
      const previousTurns = asRetainedTurns(state?.turn_history);
      const analysis = analyzeInboundSocialTurn({
        text: event.messageText,
        previousTurns,
        escalationPending: state?.escalation_pending === true,
      });
      let draftText = buildSafeSocialResponseDraft(analysis, previousTurns);
      let draftSource = "safe_fallback";
      let aiTraceId: string | null = null;
      if (analysis.decision === "draft" && draftText) {
        try {
          const gateway = await callAIGateway({
            business_id: account.business_id,
            conversation_id: state?.conversation_id ?? null,
            action_type: "social_inbound_response_draft",
            task_category: "social_inbound",
            request_type: "social_inbound_multiturn_draft",
            model: "google/gemini-2.5-flash",
            fallback_model: "google/gemini-3-flash-preview",
            risk_level: "medium",
            approval_required: true,
            idempotency_key: `social-inbound:${account.id}:${event.externalEventId}:turn:${Number(state?.turn_count ?? 0)}`,
            metadata: { provider: event.provider, platform: event.platform, retained_turn_count: previousTurns.length },
            messages: buildSocialAIDraftMessages({
              businessName: String(business.name ?? "this business"),
              currentMessage: event.messageText,
              analysis,
              previousTurns,
            }),
          });
          const candidate = sanitizeSocialAIDraft(gateway.data?.choices?.[0]?.message?.content);
          if (gateway.status === "completed" && candidate) {
            draftText = candidate;
            draftSource = "ai_gateway";
            aiTraceId = gateway.trace_id;
          }
        } catch {
          // Keep the conservative internal fallback if the model is unavailable.
        }
      }
      const { data: result, error } = await admin.rpc("process_social_inbound_multiturn_event", {
        p_provider_connection_id: connection.id,
        p_social_account_id: account.id,
        p_provider: event.provider,
        p_platform: event.platform,
        p_idempotency_key: idempotencyKey,
        p_external_event_id: event.externalEventId,
        p_external_thread_id: event.externalThreadId,
        p_external_user_id: event.externalUserId,
        p_event_type: event.eventType,
        p_message_text: event.messageText,
        p_social_handle: event.handle,
        p_display_name: event.displayName,
        p_received_at: event.receivedAt,
        p_expected_turn_count: Number(state?.turn_count ?? 0),
        p_payload_sha256: payloadHash,
        p_analysis: {
          decision: analysis.decision,
          intent: analysis.intent,
          sentiment: analysis.sentiment,
          risk_level: analysis.riskLevel,
          confidence_score: analysis.confidenceScore,
          risk_flags: analysis.riskFlags,
          escalation_reasons: analysis.escalationReasons,
          escalation_reason: analysis.escalationReason,
          recommended_agent: analysis.recommendedAgent,
          recommended_next_action: analysis.recommendedNextAction,
          draft_text: draftText,
          draft_source: draftSource,
          ai_trace_id: aiTraceId,
        },
      });
      if (!error) return json({ ...result, ...SAFETY_FLAGS });
      if (String(error.message ?? "").includes("social_inbound_state_version_conflict") && attempt < 2) continue;
      const conflict = String(error.message ?? "").includes("social_inbound_state_version_conflict");
      return json({ ok: false, error: conflict ? "social_inbound_state_busy" : "social_inbound_processing_failed", ...SAFETY_FLAGS }, conflict ? 409 : 500);
    }
    return json({ ok: false, error: "social_inbound_state_busy", ...SAFETY_FLAGS }, 409);
  } catch {
    return json({ ok: false, error: "social_inbound_processing_failed", ...SAFETY_FLAGS }, 500);
  }
});
