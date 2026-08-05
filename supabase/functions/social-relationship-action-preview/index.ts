import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { evaluateQueuedAction, relationshipAudit } from "../_shared/socialRelationshipDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const actionId = String(body.action_id ?? "");
  if (!actionId) return json({ ok: false, error: "action_id_required" }, 400);

  const { data: action } = await auth.admin.from("social_relationship_action_queue")
    .select("*").eq("id", actionId).maybeSingle();
  if (!action) return json({ ok: false, error: "action_not_found" }, 404);
  const decision = await evaluateQueuedAction(auth.admin, action);
  const providerInput = decision.allowed ? {
    action_type: action.action_type,
    account_id: action.account_id,
    provider_id: action.payload_json?.provider_id ?? null,
    chat_id: action.payload_json?.chat_id ?? null,
    message: action.payload_json?.message ?? null,
    idempotency_key: action.idempotency_key,
  } : null;

  await auth.admin.from("social_relationship_action_queue").update({
    blocker_codes: decision.blockerCodes,
    action_status: decision.allowed ? action.action_status : "blocked",
    updated_at: new Date().toISOString(),
  }).eq("id", action.id).in("action_status", ["draft","pending_approval","ready","blocked","retrying"]);
  await relationshipAudit(auth.admin, {
    business_id: action.business_id, provider: action.provider, account_id: action.account_id,
    actor_type: "founder", actor_id: auth.user.id,
    action: "relationship_action_preview",
    action_status: decision.allowed ? "ready" : "blocked",
    entity_type: "action", entity_id: action.id,
    idempotency_key: action.idempotency_key,
    blocker_codes: decision.blockerCodes,
    after_json: { provider_input: providerInput, draft_only: decision.draftOnly },
  });
  return json({
    ok: true,
    action_id: action.id,
    ready: decision.allowed,
    draft_only: decision.draftOnly,
    blockers: decision.blockerCodes,
    provider_input: providerInput,
    no_provider_call: true,
  });
});
