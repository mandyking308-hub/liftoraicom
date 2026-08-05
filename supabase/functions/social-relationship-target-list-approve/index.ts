import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { getRelationshipAccount, getRelationshipPolicy, relationshipAudit } from "../_shared/socialRelationshipDb.ts";
import { idempotencyKey, type RelationshipActionType } from "../_shared/socialRelationshipLogic.ts";

const CONFIRMATION = "APPROVE SOCIAL TARGET LIST";
const ACTIONS = new Set<RelationshipActionType>([
  "send_invitation","connect","follow","start_chat","send_message","reply_message",
  "accept_invitation","decline_invitation","sync_profile","sync_conversation",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const businessId = String(body.business_id ?? "");
  const accountId = String(body.account_id ?? "");
  const profileIds = Array.isArray(body.profile_ids) ? [...new Set(body.profile_ids.map(String).filter(Boolean))].slice(0, 50) : [];
  const actionType = String(body.action_type ?? "send_invitation") as RelationshipActionType;
  if (!businessId || !accountId || !profileIds.length) return json({ ok: false, error: "business_id_account_id_and_profile_ids_required" }, 400);
  if (!ACTIONS.has(actionType)) return json({ ok: false, error: "action_type_invalid" }, 400);

  const account = await getRelationshipAccount(auth.admin, accountId);
  if (!account) return json({ ok: false, error: "account_not_found" }, 404);
  const { data: profiles } = await auth.admin.from("social_relationship_profiles")
    .select("*").eq("business_id", businessId).in("id", profileIds);
  const blockers: string[] = [];
  if ((profiles ?? []).length !== profileIds.length) blockers.push("profile_business_scope_mismatch");
  for (const profile of profiles ?? []) {
    if (profile.do_not_contact) blockers.push(`do_not_contact:${profile.id}`);
    if (["high","blocked"].includes(profile.risk_status)) blockers.push(`profile_risk_blocked:${profile.id}`);
    if (profile.platform !== account.platform) blockers.push(`platform_mismatch:${profile.id}`);
  }

  const policy = await getRelationshipPolicy(auth.admin, businessId, account.provider, accountId);
  const preview = {
    list_name: String(body.list_name ?? "Approved social targets").slice(0, 160),
    business_id: businessId,
    account_id: accountId,
    platform: account.platform,
    action_type: actionType,
    target_count: profiles?.length ?? 0,
    policy_mode: policy.mode,
    blockers: [...new Set(blockers)],
    no_provider_call: true,
  };
  if (body.dry_run !== false || body.confirmation_phrase !== CONFIRMATION || blockers.length) {
    return json({
      ok: blockers.length === 0,
      dry_run: true,
      preview,
      confirmation_phrase: CONFIRMATION,
      no_records_mutated: true,
    }, blockers.length ? 409 : 200);
  }

  const now = new Date().toISOString();
  const { data: list, error: listError } = await auth.admin.from("social_relationship_target_lists").insert({
    business_id: businessId,
    list_name: preview.list_name,
    list_status: "approved",
    primary_goal: String(body.primary_goal ?? "relationship_building").slice(0, 160),
    default_action: actionType,
    approval_status: "approved",
    approved_by: auth.user.id,
    approved_at: now,
    policy_snapshot: { mode: policy.mode, account_id: accountId, platform: account.platform },
  }).select("*").maybeSingle();
  if (listError || !list) return json({ ok: false, error: "target_list_create_failed", detail: listError?.message }, 500);

  const targetRows = (profiles ?? []).map((profile: any) => {
    const score = Number(body.scores?.[profile.id] ?? 50);
    return {
      business_id: businessId,
      target_list_id: list.id,
      profile_id: profile.id,
      overall_score: Math.max(0, Math.min(100, Number.isFinite(score) ? score : 50)),
      score_breakdown: body.score_breakdowns?.[profile.id] ?? {},
      ranking_reason: String(body.ranking_reasons?.[profile.id] ?? "Founder-selected social target").slice(0, 500),
      recommended_action: actionType,
      approval_status: "approved",
      approved_by: auth.user.id,
      approved_at: now,
    };
  });
  const targetInsert = await auth.admin.from("social_relationship_targets").insert(targetRows).select("*");
  if (targetInsert.error) return json({ ok: false, error: "targets_create_failed", detail: targetInsert.error.message }, 500);

  const messageByProfile = body.messages && typeof body.messages === "object" ? body.messages : {};
  const queueRows = (targetInsert.data ?? []).map((target: any) => {
    const profile = (profiles ?? []).find((p: any) => p.id === target.profile_id);
    const message = String(messageByProfile[profile?.id] ?? body.default_message ?? "").trim().slice(0, 1000);
    const key = idempotencyKey([businessId, accountId, list.id, profile?.external_profile_id, actionType, message]);
    return {
      business_id: businessId,
      provider: account.provider,
      platform: account.platform,
      account_id: accountId,
      target_list_id: list.id,
      target_id: target.id,
      profile_id: profile?.id,
      action_type: actionType,
      action_status: ["test_only","draft_actions"].includes(policy.mode) ? "draft" : "ready",
      approval_status: "approved",
      payload_json: {
        provider_id: profile?.external_profile_id,
        public_identifier: profile?.public_identifier,
        message: message || null,
      },
      idempotency_key: key,
      scheduled_for: null,
    };
  });
  const queueInsert = await auth.admin.from("social_relationship_action_queue").insert(queueRows).select("id,profile_id,action_type,action_status,idempotency_key");
  if (queueInsert.error) return json({ ok: false, error: "action_queue_create_failed", detail: queueInsert.error.message }, 500);

  await auth.admin.from("social_relationship_target_lists").update({ list_status: "active", updated_at: new Date().toISOString() }).eq("id", list.id);
  await relationshipAudit(auth.admin, {
    business_id: businessId, provider: account.provider, account_id: accountId,
    actor_type: "founder", actor_id: auth.user.id,
    action: "target_list_approved", action_status: "completed",
    entity_type: "target_list", entity_id: list.id,
    after_json: { targets: targetRows.length, actions_created: queueInsert.data?.length ?? 0, action_type: actionType },
  });
  return json({ ok: true, target_list_id: list.id, targets_created: targetRows.length, actions: queueInsert.data ?? [], provider_called: false });
});
