import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import {
  evaluateQueuedAction,
  incrementRateLimit,
  providerActionId,
  relationshipAudit,
  sanitiseProviderSummary,
} from "../_shared/socialRelationshipDb.ts";
import { classifyProviderFailure, idempotencyKey } from "../_shared/socialRelationshipLogic.ts";
import { providerAdapter } from "../_shared/socialRelationshipProvider.ts";
import { getUnipileConfig, type ProviderResult } from "../_shared/unipileClient.ts";
import { startUnipileChat } from "../_shared/unipileActions.ts";
import { sendUnipileChatMessage } from "../_shared/unipileMessageActions.ts";

const CONFIRMATION = "SEND APPROVED SOCIAL ACTION";

function nestedProviderId(value: unknown): string | null {
  const direct = providerActionId(value);
  if (direct) return direct;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of ["data", "message", "chat", "invitation", "object"]) {
    const nested = providerActionId(row[key]);
    if (nested) return nested;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const actionId = String(body.action_id ?? "");
  if (!actionId) return json({ ok: false, error: "action_id_required" }, 400);
  if (body.confirmation_phrase !== CONFIRMATION) {
    return json({ ok: false, error: "confirmation_required", confirmation_phrase: CONFIRMATION }, 400);
  }

  const { data: action } = await auth.admin.from("social_relationship_action_queue")
    .select("*").eq("id", actionId).maybeSingle();
  if (!action) return json({ ok: false, error: "action_not_found" }, 404);
  if (["sent","accepted","replied"].includes(action.action_status)) {
    return json({ ok: true, duplicate_safe: true, action_id: action.id, status: action.action_status, provider_action_id: action.provider_action_id });
  }

  const decision = await evaluateQueuedAction(auth.admin, action);
  if (!decision.allowed) {
    await auth.admin.from("social_relationship_action_queue").update({
      action_status: "blocked", blocker_codes: decision.blockerCodes, updated_at: new Date().toISOString(),
    }).eq("id", action.id);
    await relationshipAudit(auth.admin, {
      business_id: action.business_id, provider: action.provider, account_id: action.account_id,
      actor_type: "founder", actor_id: auth.user.id,
      action: "relationship_action_submit", action_status: "blocked",
      entity_type: "action", entity_id: action.id,
      idempotency_key: action.idempotency_key, blocker_codes: decision.blockerCodes,
    });
    return json({ ok: false, error: "action_blocked", blockers: decision.blockerCodes }, 409);
  }

  if (["follow","accept_invitation","decline_invitation","sync_profile","sync_conversation"].includes(action.action_type)) {
    const blockers = [`action_not_implemented_for_live_adapter:${action.action_type}`];
    await auth.admin.from("social_relationship_action_queue").update({ action_status: "blocked", blocker_codes: blockers, updated_at: new Date().toISOString() }).eq("id", action.id);
    return json({ ok: false, error: "action_not_implemented", blockers }, 409);
  }

  const { data: account } = await auth.admin.from("social_relationship_accounts")
    .select("*").eq("id", action.account_id).maybeSingle();
  if (!account) return json({ ok: false, error: "account_not_found" }, 404);
  const key = action.idempotency_key || idempotencyKey([
    action.business_id, action.account_id, action.profile_id, action.conversation_id, action.action_type,
    JSON.stringify(action.payload_json ?? {}),
  ]);
  if (action.action_status === "blocked") {
    await auth.admin.from("social_relationship_action_queue").update({ action_status: "ready", blocker_codes: [], idempotency_key: key, updated_at: new Date().toISOString() }).eq("id", action.id);
  }
  const claim = await auth.admin.rpc("social_relationship_claim_action", {
    p_action_id: action.id,
    p_business_id: action.business_id,
    p_idempotency_key: key,
  });
  if (claim.error || claim.data !== true) {
    const current = await auth.admin.from("social_relationship_action_queue").select("action_status,provider_action_id").eq("id", action.id).maybeSingle();
    return json({ ok: false, error: "action_claim_failed", current: current.data ?? null }, 409);
  }

  const adapter = providerAdapter(action.provider);
  if (!adapter) return json({ ok: false, error: "provider_unsupported" }, 400);
  const payload = action.payload_json ?? {};
  const providerId = String(payload.provider_id ?? "");
  const message = String(payload.message ?? "").trim();
  let result: ProviderResult<Record<string, unknown>>;

  if (["send_invitation","connect"].includes(action.action_type)) {
    if (!providerId) result = { ok: false, status: 400, errorCode: "provider_id_required", errorMessage: "A provider profile ID is required." };
    else result = await adapter.sendInvitation(account.external_account_id, account.platform, providerId, message || null, key);
  } else if (action.action_type === "start_chat") {
    const config = getUnipileConfig();
    if (!config) result = { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "Unipile is not configured." };
    else if (!providerId || !message) result = { ok: false, status: 400, errorCode: "provider_id_and_message_required", errorMessage: "A provider profile ID and message are required." };
    else result = await startUnipileChat(config, account.external_account_id, providerId, message, key);
  } else if (["send_message","reply_message"].includes(action.action_type)) {
    let chatId = String(payload.chat_id ?? "");
    if (!chatId && action.conversation_id) {
      const conversation = await auth.admin.from("social_relationship_conversations").select("external_chat_id").eq("id", action.conversation_id).maybeSingle();
      chatId = String(conversation.data?.external_chat_id ?? "");
    }
    const config = getUnipileConfig();
    if (!config) result = { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "Unipile is not configured." };
    else if (!chatId || !message) result = { ok: false, status: 400, errorCode: "chat_id_and_message_required", errorMessage: "A chat ID and message are required." };
    else result = await sendUnipileChatMessage(config, chatId, account.external_account_id, message, key);
  } else {
    result = { ok: false, status: 400, errorCode: "action_unsupported", errorMessage: `Unsupported action ${action.action_type}` };
  }

  const now = new Date().toISOString();
  const externalId = result.ok ? nestedProviderId(result.data) : null;
  if (result.ok && externalId) {
    const terminalStatus = action.action_type === "reply_message" ? "replied" : "sent";
    await auth.admin.from("social_relationship_action_queue").update({
      action_status: terminalStatus,
      provider_action_id: externalId,
      provider_response_summary: sanitiseProviderSummary(result.data),
      blocker_codes: [],
      last_error: null,
      submitted_at: now,
      completed_at: now,
      updated_at: now,
    }).eq("id", action.id);
    await incrementRateLimit(auth.admin, action.account_id, action.action_type);

    if (action.action_type === "start_chat") {
      const conversation = await auth.admin.from("social_relationship_conversations").upsert({
        business_id: action.business_id,
        provider: action.provider,
        platform: action.platform,
        account_id: action.account_id,
        profile_id: action.profile_id,
        external_chat_id: externalId,
        conversation_status: "open",
        last_message_at: now,
        last_outbound_at: now,
        source_attribution: { target_list_id: action.target_list_id, action_id: action.id },
        updated_at: now,
      }, { onConflict: "provider,account_id,external_chat_id" }).select("id").maybeSingle();
      if (conversation.data?.id) {
        await auth.admin.from("social_relationship_action_queue").update({ conversation_id: conversation.data.id, updated_at: now }).eq("id", action.id);
      }
    }

    await relationshipAudit(auth.admin, {
      business_id: action.business_id, provider: action.provider, account_id: action.account_id,
      actor_type: "founder", actor_id: auth.user.id,
      action: "relationship_action_submit", action_status: terminalStatus,
      entity_type: "action", entity_id: action.id,
      idempotency_key: key,
      provider_response_summary: sanitiseProviderSummary(result.data),
    });
    return json({ ok: true, action_id: action.id, status: terminalStatus, provider_action_id: externalId });
  }

  if (result.ok && !externalId) {
    await auth.admin.from("social_relationship_action_queue").update({
      action_status: "submission_unknown",
      provider_response_summary: sanitiseProviderSummary(result.data),
      last_error: "provider_success_without_external_id",
      submitted_at: now,
      updated_at: now,
    }).eq("id", action.id);
    await incrementRateLimit(auth.admin, action.account_id, action.action_type);
    await relationshipAudit(auth.admin, {
      business_id: action.business_id, provider: action.provider, account_id: action.account_id,
      actor_type: "founder", actor_id: auth.user.id,
      action: "relationship_action_submit", action_status: "submission_unknown",
      entity_type: "action", entity_id: action.id, idempotency_key: key,
      provider_response_summary: sanitiseProviderSummary(result.data),
    });
    return json({ ok: false, error: "submission_unknown", action_id: action.id, reconciliation_required: true }, 202);
  }

  const failureClass = classifyProviderFailure(result.status, result.ambiguous ? "transport" : "provider_response");
  const status = failureClass === "ambiguous" ? "submission_unknown"
    : failureClass === "retryable" ? "retrying" : "failed";
  const retrySeconds = Math.max(60, result.retryAfterSeconds ?? Math.min(3600, 60 * Math.pow(2, Number(action.attempt_count ?? 0))));
  await auth.admin.from("social_relationship_action_queue").update({
    action_status: status,
    provider_response_summary: {},
    last_error: result.errorCode ?? result.errorMessage ?? "provider_failure",
    next_retry_at: status === "retrying" ? new Date(Date.now() + retrySeconds * 1000).toISOString() : null,
    submitted_at: now,
    updated_at: now,
  }).eq("id", action.id);
  if (failureClass === "ambiguous") await incrementRateLimit(auth.admin, action.account_id, action.action_type);
  if ([401,403,429].includes(result.status)) {
    await auth.admin.from("social_relationship_accounts").update({
      account_status: result.status === 429 ? "rate_limited" : "degraded",
      cooldown_until: new Date(Date.now() + retrySeconds * 1000).toISOString(),
      updated_at: now,
    }).eq("id", action.account_id);
  }
  await relationshipAudit(auth.admin, {
    business_id: action.business_id, provider: action.provider, account_id: action.account_id,
    actor_type: "founder", actor_id: auth.user.id,
    action: "relationship_action_submit", action_status: status,
    entity_type: "action", entity_id: action.id, idempotency_key: key,
    provider_response_summary: { status: result.status, error_code: result.errorCode ?? null, failure_class: failureClass },
  });
  return json({ ok: false, error: result.errorCode ?? "provider_failure", status, retry_at: status === "retrying" ? new Date(Date.now() + retrySeconds * 1000).toISOString() : null }, failureClass === "ambiguous" ? 202 : result.status >= 400 ? result.status : 502);
});
