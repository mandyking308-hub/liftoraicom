/**
 * Unattended maintenance for the Social Relationship Engine.
 * Secret-gated (SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET) so it can be driven by
 * pg_cron without a user JWT. Runs due actions, releases cooldowns and expires
 * stale conversations. Never bypasses the action gate.
 */
import { corsHeaders, json, serviceClient, audit } from "../_shared/socialRelationshipDb.ts";
import { runDueActions } from "../_shared/socialRelationshipRunner.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const expected = (Deno.env.get("SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET") ?? "").trim();
  const supplied = (req.headers.get("x-social-relationship-secret") ?? "").trim();
  if (!expected || expected !== supplied) return json({ ok: false, error: "unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const admin = serviceClient();
  const now = new Date();

  // Release expired account cooldowns.
  const { data: cooled } = await admin.from("social_relationship_accounts")
    .update({ cooldown_until: null, account_status: "ok" })
    .lt("cooldown_until", now.toISOString())
    .not("cooldown_until", "is", null)
    .select("id");

  // Expire stale open conversations (30 days quiet).
  const { data: expired } = await admin.from("social_relationship_conversations")
    .update({ conversation_status: "dormant" })
    .eq("conversation_status", "open")
    .lt("last_message_at", new Date(now.getTime() - 30 * 86400000).toISOString())
    .select("id");

  const run = await runDueActions(admin, {
    business_id: body.business_id ?? null,
    limit: Number(body.limit ?? 10),
    now,
    actor: "maintenance",
    // Unattended dispatch is permitted ONLY under approved_batch_autopilot.
    require_autopilot: true,
  });

  await audit(admin, {
    business_id: body.business_id ?? null, event: "maintenance_run",
    actor: "maintenance", provider_calls: run.provider_calls,
    detail: { cooldowns_released: (cooled ?? []).length, conversations_expired: (expired ?? []).length, ...run, details: undefined },
  });

  return json({
    ok: true,
    cooldowns_released: (cooled ?? []).length,
    conversations_expired: (expired ?? []).length,
    run,
    ran_at: now.toISOString(),
  });
});
