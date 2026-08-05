import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import {
  capabilitiesForUnipile,
  platformFromProviderType,
  providerAdapter,
} from "../_shared/socialRelationshipProvider.ts";
import { relationshipAudit } from "../_shared/socialRelationshipDb.ts";

const CAPABILITY_KEYS = [
  "profile_search","company_search","send_invitation","follow","start_chat",
  "send_message","read_chats","read_messages","webhooks","relation_events",
  "comments_mentions","manage_invitations",
] as const;

const DEFAULT_LIMITS: Record<string, { daily: number; weekly: number }> = {
  send_invitation: { daily: 5, weekly: 20 },
  connect: { daily: 5, weekly: 20 },
  follow: { daily: 5, weekly: 20 },
  start_chat: { daily: 8, weekly: 32 },
  send_message: { daily: 10, weekly: 40 },
  reply_message: { daily: 20, weekly: 80 },
  accept_invitation: { daily: 10, weekly: 40 },
  decline_invitation: { daily: 10, weekly: 40 },
  sync_profile: { daily: 200, weekly: 1000 },
  sync_conversation: { daily: 200, weekly: 1000 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider ?? "unipile").toLowerCase();
  const adapter = providerAdapter(provider);
  if (!adapter) return json({ ok: false, error: "provider_unsupported" }, 400);

  const result = await adapter.listAccounts();
  if (!result.ok) {
    await relationshipAudit(auth.admin, {
      provider, actor_type: "founder", actor_id: auth.user.id,
      action: "provider_account_sync", action_status: "failed",
      after_json: { status: result.status, error_code: result.errorCode ?? null },
    });
    return json({ ok: false, error: result.errorCode ?? "account_sync_failed", message: result.errorMessage }, result.status >= 400 ? result.status : 502);
  }

  const accounts = result.data ?? [];
  const { data: existingRows } = await auth.admin.from("social_relationship_accounts")
    .select("*").eq("provider", provider);
  const existing = new Map((existingRows ?? []).map((row: any) => [row.external_account_id, row]));
  const now = new Date().toISOString();
  const synced: any[] = [];

  for (const external of accounts) {
    const platform = platformFromProviderType(external.provider || external.type);
    if (platform === "unknown") continue;
    const prior = existing.get(external.id);
    const status = String(external.status ?? "").toLowerCase();
    const accountStatus = ["ok","running","connected"].includes(status) || !status ? "connected"
      : ["credentials","checkpoint"].includes(status) ? "checkpoint"
      : "degraded";

    const { data: row, error } = await auth.admin.from("social_relationship_accounts").upsert({
      provider_connection_id: (await auth.admin.from("social_relationship_provider_connections").select("id").eq("provider", provider).maybeSingle()).data?.id,
      provider,
      platform,
      external_account_id: external.id,
      display_name: external.name,
      account_handle: external.username,
      profile_url: external.profileUrl,
      account_status: accountStatus,
      real_account_confirmed: prior?.real_account_confirmed ?? false,
      execution_enabled: prior?.execution_enabled ?? false,
      cooldown_until: prior?.cooldown_until ?? null,
      last_synced_at: now,
      sanitised_metadata: { provider_type: external.type, provider_status: external.status },
      is_test_data: prior?.is_test_data ?? false,
      updated_at: now,
    }, { onConflict: "provider,external_account_id" }).select("*").maybeSingle();
    if (error || !row) continue;

    const capabilities = capabilitiesForUnipile(platform);
    const capabilityRows = CAPABILITY_KEYS.map((key) => ({
      account_id: row.id,
      capability: key,
      supported: !!capabilities[key],
      support_level: capabilities[key]
        ? (["send_invitation","start_chat","send_message","manage_invitations"].includes(key) ? "approval_required" : "supported")
        : "unsupported",
      constraints_json: key === "send_invitation" ? { conservative_limits_required: true } : {},
      last_verified_at: now,
      updated_at: now,
    }));
    await auth.admin.from("social_relationship_capabilities").upsert(capabilityRows, { onConflict: "account_id,capability" });

    for (const [actionType, limits] of Object.entries(DEFAULT_LIMITS)) {
      const { data: existingLimit } = await auth.admin.from("social_relationship_rate_limits")
        .select("id").eq("account_id", row.id).eq("action_type", actionType).maybeSingle();
      if (!existingLimit) {
        await auth.admin.from("social_relationship_rate_limits").insert({
          account_id: row.id,
          platform,
          action_type: actionType,
          daily_limit: limits.daily,
          weekly_limit: limits.weekly,
        });
      }
    }
    synced.push({ id: row.id, platform, display_name: row.display_name, status: row.account_status, execution_enabled: row.execution_enabled });
  }

  await auth.admin.from("social_relationship_provider_connections").update({
    connection_status: "connected",
    last_account_sync_at: now,
    last_capability_sync_at: now,
    sanitised_metadata: { account_count: synced.length },
    last_error: null,
    updated_at: now,
  }).eq("provider", provider);

  await relationshipAudit(auth.admin, {
    provider, actor_type: "founder", actor_id: auth.user.id,
    action: "provider_account_sync", action_status: "completed",
    after_json: { synced_accounts: synced.length },
  });
  return json({ ok: true, provider, accounts: synced, safe_defaults: { execution_enabled: false, real_account_confirmed: false } });
});
