import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "PURGE SOCIAL ENGAGEMENT FLOW TEST DATA";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, confirmation_phrase, dry_run = true } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const tables = ["social_manychat_manual_exports", "social_dm_flow_steps", "social_dm_flow_blueprints", "social_keyword_trigger_rules", "social_engagement_flow_audit"];
  const results: Record<string, any> = {};
  for (const t of tables) {
    const { error, count } = await (a.admin as any).from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    results[t] = error ? `err:${error.message}` : `deleted:${count ?? 0}`;
  }
  return json({ ok: true, results, real_data_preserved: true, ...SAFETY_FLAGS });
});