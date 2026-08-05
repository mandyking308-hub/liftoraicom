import { corsHeaders, json, requireFounder, loadContext } from "../_shared/socialRelationshipDb.ts";
import { computeRelationshipHealth, normaliseMode } from "../_shared/socialRelationshipLogic.ts";
import { UnipileAdapter, ManyChatAdapter } from "../_shared/socialRelationshipProvider.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const ctx = await loadContext(a.admin, business_id);
  const unipile = new UnipileAdapter();
  const manychat = new ManyChatAdapter();

  const [{ data: accounts }, { data: caps }, { data: queue }, { data: escal }, { data: convs }, { data: fails }] =
    await Promise.all([
      a.admin.from("social_relationship_accounts").select("*").eq("business_id", business_id),
      a.admin.from("social_relationship_capabilities").select("account_id, capability, supported").eq("business_id", business_id),
      a.admin.from("social_relationship_action_queue").select("action_status").eq("business_id", business_id),
      a.admin.from("social_relationship_escalations").select("id").eq("business_id", business_id).eq("escalation_status", "open"),
      a.admin.from("social_relationship_conversations").select("id, escalation_pending").eq("business_id", business_id),
      a.admin
        .from("social_relationship_audit")
        .select("id")
        .eq("business_id", business_id)
        .eq("event_status", "failed")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);

  const capable = new Set((caps ?? []).filter((c: any) => c.supported).map((c: any) => c.account_id));
  const counts: Record<string, number> = {};
  for (const q of queue ?? []) counts[q.action_status] = (counts[q.action_status] ?? 0) + 1;

  const paused = ctx.pauses.some((p: any) => p.is_paused);
  const health = computeRelationshipHealth({
    credentials_present: Boolean(ctx.connection?.credentials_present) || unipile.configured(),
    connection_ok: Boolean(ctx.connection?.last_test_ok),
    accounts_count: (accounts ?? []).length,
    capable_accounts: (accounts ?? []).filter((x: any) => capable.has(x.id)).length,
    mode: ctx.mode,
    paused,
    webhook_registered: Boolean(ctx.connection?.webhook_registered),
    recent_failures: (fails ?? []).length,
  });

  return json({
    ok: true,
    business_id,
    health,
    mode: normaliseMode(ctx.mode),
    paused,
    providers: {
      unipile: { configured: unipile.configured(), error: unipile.configurationError() },
      manychat: { configured: manychat.configured(), relationship_actions_enabled: false },
    },
    connection: ctx.connection
      ? {
          id: ctx.connection.id,
          connection_status: ctx.connection.connection_status,
          credentials_present: ctx.connection.credentials_present,
          webhook_registered: ctx.connection.webhook_registered,
          last_test_at: ctx.connection.last_test_at,
          last_test_ok: ctx.connection.last_test_ok,
          last_error: ctx.connection.last_error,
        }
      : null,
    accounts: (accounts ?? []).map((x: any) => ({
      id: x.id,
      network: x.network,
      account_name: x.account_name,
      account_status: x.account_status,
      real_account_declared: x.real_account_declared,
      capable: capable.has(x.id),
      cooldown_until: x.cooldown_until,
    })),
    queue_counts: counts,
    conversations_count: (convs ?? []).length,
    escalations_open: (escal ?? []).length,
    recent_failures_24h: (fails ?? []).length,
    policy: ctx.policy,
  });
});
