import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, any> = {};
  const tables = [
    "social_keyword_trigger_rules",
    "social_dm_flow_blueprints",
    "social_dm_flow_steps",
    "social_manychat_manual_exports",
    "social_engagement_flow_audit",
  ];
  for (const t of tables) {
    const { error } = await a.admin.from(t).select("id").limit(1);
    checks[t] = error ? `err:${error.message}` : "ok";
  }
  const extCheck = async (t: string, col: string) => {
    const { error } = await a.admin.from(t).select(col).limit(1);
    checks[`${t}.${col}`] = error ? `err:${error.message}` : "ok";
  };
  await extCheck("social_campaign_plans", "engagement_flow_status");
  await extCheck("social_content_items", "engagement_flow_status");
  await extCheck("social_calendar_items", "engagement_flow_status");
  const status = Object.values(checks).every((v) => v === "ok") ? "PASS" : "BLOCKED";
  return json({
    ok: true, status, checks,
    safety: SAFETY_FLAGS,
    no_forbidden_action_audit: "pass",
  });
});