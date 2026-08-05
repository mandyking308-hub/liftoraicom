import {
  DEFAULT_RELATIONSHIP_POLICY,
  evaluateRelationshipAction,
  type RelationshipActionContext,
  type RelationshipActionDecision,
  type RelationshipActionType,
  type RelationshipPolicy,
} from "./socialRelationshipLogic.ts";
import { capabilityForAction } from "./socialRelationshipProvider.ts";

export type SupabaseAdmin = any;

export async function relationshipAudit(
  admin: SupabaseAdmin,
  row: {
    business_id?: string | null;
    provider?: string | null;
    account_id?: string | null;
    actor_type?: string;
    actor_id?: string | null;
    action: string;
    action_status: string;
    entity_type?: string | null;
    entity_id?: string | null;
    idempotency_key?: string | null;
    blocker_codes?: string[];
    before_json?: unknown;
    after_json?: unknown;
    provider_response_summary?: unknown;
  },
): Promise<void> {
  const payload = {
    business_id: row.business_id ?? null,
    provider: row.provider ?? null,
    account_id: row.account_id ?? null,
    actor_type: row.actor_type ?? "system",
    actor_id: row.actor_id ?? null,
    action: row.action,
    action_status: row.action_status,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    idempotency_key: row.idempotency_key ?? null,
    blocker_codes: row.blocker_codes ?? [],
    before_json: row.before_json ?? null,
    after_json: row.after_json ?? null,
    provider_response_summary: row.provider_response_summary ?? null,
  };
  await admin.from("social_relationship_audit").insert(payload);
}

export async function getRelationshipConnection(admin: SupabaseAdmin, provider = "unipile"): Promise<any | null> {
  const { data } = await admin
    .from("social_relationship_provider_connections")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();
  return data ?? null;
}

export async function getRelationshipAccount(admin: SupabaseAdmin, accountId: string): Promise<any | null> {
  const { data } = await admin
    .from("social_relationship_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();
  return data ?? null;
}

export function policyFromRow(row: any | null): RelationshipPolicy {
  if (!row) return { ...DEFAULT_RELATIONSHIP_POLICY };
  return {
    mode: row.policy_mode ?? DEFAULT_RELATIONSHIP_POLICY.mode,
    timezone: row.timezone ?? DEFAULT_RELATIONSHIP_POLICY.timezone,
    workingDays: Array.isArray(row.working_days) ? row.working_days.map(Number) : DEFAULT_RELATIONSHIP_POLICY.workingDays,
    workingHourStart: Number(row.working_hour_start ?? DEFAULT_RELATIONSHIP_POLICY.workingHourStart),
    workingHourEnd: Number(row.working_hour_end ?? DEFAULT_RELATIONSHIP_POLICY.workingHourEnd),
    minDelaySeconds: Number(row.min_delay_seconds ?? DEFAULT_RELATIONSHIP_POLICY.minDelaySeconds),
    maxJitterSeconds: Number(row.max_jitter_seconds ?? DEFAULT_RELATIONSHIP_POLICY.maxJitterSeconds),
    allowConnectionThenMessage: !!row.allow_connection_then_message,
    lowRiskAiReplyEnabled: !!row.low_risk_ai_reply_enabled,
    maxAiRepliesPerConversationDay: Number(row.max_ai_replies_per_conversation_day ?? DEFAULT_RELATIONSHIP_POLICY.maxAiRepliesPerConversationDay),
  };
}

export async function getRelationshipPolicy(
  admin: SupabaseAdmin,
  businessId: string,
  provider: string,
  accountId: string,
): Promise<RelationshipPolicy> {
  const { data: exact } = await admin
    .from("social_relationship_policies")
    .select("*")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .eq("account_id", accountId)
    .maybeSingle();
  if (exact) return policyFromRow(exact);

  const { data: providerDefault } = await admin
    .from("social_relationship_policies")
    .select("*")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .is("account_id", null)
    .maybeSingle();
  return policyFromRow(providerDefault ?? null);
}

export async function activePauseScopes(
  admin: SupabaseAdmin,
  businessId: string,
  provider: string,
  accountId: string,
): Promise<string[]> {
  const scopeKeys = [
    ["global", "global"],
    ["business", businessId],
    ["provider", provider],
    ["account", accountId],
  ];
  const { data } = await admin
    .from("social_relationship_pauses")
    .select("scope,scope_key,paused")
    .eq("paused", true);
  const active = new Set((data ?? []).map((row: any) => `${row.scope}:${row.scope_key}`));
  return scopeKeys.filter(([scope, key]) => active.has(`${scope}:${key}`)).map(([scope, key]) => `${scope}:${key}`);
}

export async function capabilitySupported(
  admin: SupabaseAdmin,
  accountId: string,
  capability: string,
): Promise<boolean> {
  const { data } = await admin
    .from("social_relationship_capabilities")
    .select("supported,support_level")
    .eq("account_id", accountId)
    .eq("capability", capability)
    .maybeSingle();
  return !!data?.supported && data?.support_level !== "unsupported";
}

export async function getRateLimit(
  admin: SupabaseAdmin,
  accountId: string,
  actionType: string,
): Promise<any | null> {
  const { data } = await admin
    .from("social_relationship_rate_limits")
    .select("*")
    .eq("account_id", accountId)
    .eq("action_type", actionType)
    .maybeSingle();
  return data ?? null;
}

export async function hasActiveSuppression(
  admin: SupabaseAdmin,
  profileId?: string | null,
  provider?: string | null,
  externalProfileId?: string | null,
): Promise<boolean> {
  let query = admin.from("social_relationship_suppressions").select("id").eq("active", true).limit(1);
  if (profileId) query = query.eq("profile_id", profileId);
  else if (provider && externalProfileId) query = query.eq("provider", provider).eq("external_profile_id", externalProfileId);
  else return false;
  const { data } = await query;
  return !!data?.length;
}

export async function evaluateQueuedAction(
  admin: SupabaseAdmin,
  action: any,
  now = new Date(),
): Promise<RelationshipActionDecision> {
  const account = await getRelationshipAccount(admin, action.account_id);
  if (!account) return { allowed: false, draftOnly: false, blockerCodes: ["account_not_found"] };

  const policy = await getRelationshipPolicy(admin, action.business_id, action.provider, action.account_id);
  const requiredCapability = capabilityForAction(action.action_type as RelationshipActionType);
  const [supported, pauses, rateLimit, suppression, profileResult, conversationResult] = await Promise.all([
    capabilitySupported(admin, action.account_id, requiredCapability),
    activePauseScopes(admin, action.business_id, action.provider, action.account_id),
    getRateLimit(admin, action.account_id, action.action_type),
    hasActiveSuppression(admin, action.profile_id, action.provider, null),
    action.profile_id
      ? admin.from("social_relationship_profiles").select("risk_status,do_not_contact").eq("id", action.profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    action.conversation_id
      ? admin.from("social_relationship_conversations").select("ai_reply_count_today").eq("id", action.conversation_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const context: RelationshipActionContext = {
    actionType: action.action_type,
    requiredCapability,
    policy,
    capabilitySupported: supported,
    accountConnected: account.account_status === "connected",
    accountExecutionEnabled: !!account.execution_enabled,
    realAccountConfirmed: !!account.real_account_confirmed,
    accountCooldownUntil: account.cooldown_until,
    pausedScopes: pauses,
    approvalStatus: action.approval_status,
    suppressionActive: suppression,
    profileRiskStatus: profileResult?.data?.risk_status,
    doNotContact: !!profileResult?.data?.do_not_contact,
    dailyCount: Number(rateLimit?.daily_count ?? 0),
    dailyLimit: Number(rateLimit?.daily_limit ?? 0),
    weeklyCount: Number(rateLimit?.weekly_count ?? 0),
    weeklyLimit: Number(rateLimit?.weekly_limit ?? 0),
    aiRepliesToday: Number(conversationResult?.data?.ai_reply_count_today ?? 0),
    now,
  };
  return evaluateRelationshipAction(context);
}

export async function incrementRateLimit(
  admin: SupabaseAdmin,
  accountId: string,
  actionType: string,
): Promise<void> {
  const limit = await getRateLimit(admin, accountId, actionType);
  if (!limit) return;
  const now = new Date();
  const dailyStart = new Date(limit.daily_window_started_at);
  const weeklyStart = new Date(limit.weekly_window_started_at);
  const dailyReset = !Number.isFinite(dailyStart.getTime()) || now.getTime() - dailyStart.getTime() >= 86_400_000;
  const weeklyReset = !Number.isFinite(weeklyStart.getTime()) || now.getTime() - weeklyStart.getTime() >= 7 * 86_400_000;
  await admin.from("social_relationship_rate_limits").update({
    daily_count: dailyReset ? 1 : Number(limit.daily_count ?? 0) + 1,
    weekly_count: weeklyReset ? 1 : Number(limit.weekly_count ?? 0) + 1,
    daily_window_started_at: dailyReset ? now.toISOString() : limit.daily_window_started_at,
    weekly_window_started_at: weeklyReset ? now.toISOString() : limit.weekly_window_started_at,
    updated_at: now.toISOString(),
  }).eq("id", limit.id);
}

export function sanitiseProviderSummary(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const allowed = ["id", "object", "status", "chat_id", "message_id", "provider_id", "account_id", "created_at"];
  return Object.fromEntries(allowed.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]));
}

export function providerActionId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of ["id", "message_id", "chat_id", "invitation_id", "provider_id"]) {
    const candidate = row[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export async function cancelPendingActionsForProfile(
  admin: SupabaseAdmin,
  businessId: string,
  profileId: string,
  reason: string,
): Promise<number> {
  const { data } = await admin
    .from("social_relationship_action_queue")
    .update({ action_status: "cancelled", last_error: reason, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("profile_id", profileId)
    .in("action_status", ["draft", "pending_approval", "ready", "retrying"])
    .select("id");
  return data?.length ?? 0;
}
