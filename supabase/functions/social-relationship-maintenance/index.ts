/** Secret-gated unattended maintenance for the Social Relationship Engine. */
import { corsHeaders, json, serviceClient, audit } from "../_shared/socialRelationshipDb.ts";
import { runDueActions } from "../_shared/socialRelationshipRunner.ts";

function secureEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const expected = (Deno.env.get("SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET") ?? "").trim();
  const supplied = (req.headers.get("x-social-relationship-secret") ?? "").trim();
  if (!secureEqual(expected, supplied)) return json({ ok: false, error: "unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const admin = serviceClient();
  const now = new Date();
  const business_id = body.business_id ? String(body.business_id) : null;

  let cooldownQuery = admin.from("social_relationship_accounts")
    .update({ cooldown_until: null, account_status: "ok", updated_at: now.toISOString() })
    .lt("cooldown_until", now.toISOString()).not("cooldown_until", "is", null);
  if (business_id) cooldownQuery = cooldownQuery.eq("business_id", business_id);
  const { data: cooled } = await cooldownQuery.select("id");

  let conversationQuery = admin.from("social_relationship_conversations")
    .update({ conversation_status: "closed", updated_at: now.toISOString() })
    .eq("conversation_status", "open")
    .lt("last_message_at", new Date(now.getTime() - 30 * 86400000).toISOString());
  if (business_id) conversationQuery = conversationQuery.eq("business_id", business_id);
  const { data: expired } = await conversationQuery.select("id");

  const run = await runDueActions(admin, {
    business_id, limit: Number(body.limit ?? 10), now, actor: "maintenance", unattended: true,
  });
  await audit(admin, {
    business_id, event: "maintenance_run", actor: "maintenance", provider_calls: run.provider_calls,
    detail: { cooldowns_released: cooled?.length ?? 0, conversations_closed: expired?.length ?? 0, ...run, details: undefined },
  });
  return json({ ok: true, cooldowns_released: cooled?.length ?? 0, conversations_closed: expired?.length ?? 0, run, ran_at: now.toISOString() });
});
