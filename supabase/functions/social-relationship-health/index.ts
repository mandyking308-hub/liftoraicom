import { corsHeaders, json, requireFounder, loadContext } from "../_shared/socialRelationshipDb.ts";
import { computeRelationshipHealth, normaliseMode, resolvePause } from "../_shared/socialRelationshipLogic.ts";
import { UnipileAdapter, ManyChatAdapter } from "../_shared/socialRelationshipProvider.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const context = await loadContext(auth.admin, business_id, "unipile");
  const unipile = new UnipileAdapter();
  const manychat = new ManyChatAdapter();
  const [{ data: accounts }, { data: capabilities }, { data: queue }, { data: escalations }, { data: conversations }, { data: failures }] = await Promise.all([
    auth.admin.from("social_relationship_accounts").select("*").eq("business_id", business_id),
    auth.admin.from("social_relationship_capabilities").select("account_id,capability,supported").eq("business_id", business_id),
    auth.admin.from("social_relationship_action_queue").select("action_status").eq("business_id", business_id),
    auth.admin.from("social_relationship_escalations").select("id").eq("business_id", business_id).eq("escalation_status", "open"),
    auth.admin.from("social_relationship_conversations").select("id,escalation_pending").eq("business_id", business_id),
    auth.admin.from("social_relationship_audit").select("id").eq("business_id", business_id)
      .eq("event_status", "failed").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
  ]);

  const capableAccounts = new Set((capabilities ?? []).filter((row: any) => row.supported).map((row: any) => row.account_id));
  const queueCounts: Record<string, number> = {};
  for (const row of queue ?? []) queueCounts[row.action_status] = (queueCounts[row.action_status] ?? 0) + 1;

  const businessPause = resolvePause(context.pauses as any, { business_id, provider: "unipile", account_id: null });
  const accountPauseIds = (accounts ?? []).filter((account: any) =>
    resolvePause(context.pauses as any, { business_id, provider: account.provider, account_id: account.id }).paused,
  ).map((account: any) => account.id);
  const paused = businessPause.paused;
  const health = computeRelationshipHealth({
    credentials_present: Boolean(context.connection?.credentials_present) || unipile.configured(),
    connection_ok: Boolean(context.connection?.last_test_ok),
    accounts_count: (accounts ?? []).length,
    capable_accounts: (accounts ?? []).filter((account: any) => capableAccounts.has(account.id)).length,
    mode: context.mode,
    paused,
    webhook_registered: Boolean(context.connection?.webhook_registered),
    recent_failures: (failures ?? []).length,
  });

  return json({
    ok: true,
    business_id,
    health,
    mode: normaliseMode(context.mode),
    paused,
    pause_scope: businessPause.scope ?? null,
    account_pauses: accountPauseIds,
    providers: {
      unipile: { configured: unipile.configured(), error: unipile.configurationError() },
      manychat: { configured: manychat.configured(), relationship_actions_enabled: false },
    },
    connection: context.connection ? {
      id: context.connection.id,
      connection_status: context.connection.connection_status,
      credentials_present: context.connection.credentials_present,
      webhook_registered: context.connection.webhook_registered,
      last_test_at: context.connection.last_test_at,
      last_test_ok: context.connection.last_test_ok,
      last_error: context.connection.last_error,
    } : null,
    accounts: (accounts ?? []).map((account: any) => ({
      id: account.id,
      network: account.network,
      account_name: account.account_name,
      account_status: account.account_status,
      real_account_declared: account.real_account_declared,
      capable: capableAccounts.has(account.id),
      paused: accountPauseIds.includes(account.id),
      cooldown_until: account.cooldown_until,
    })),
    queue_counts: queueCounts,
    conversations_count: (conversations ?? []).length,
    escalations_open: (escalations ?? []).length,
    recent_failures_24h: (failures ?? []).length,
    policy: context.policy,
  });
});
