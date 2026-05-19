import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

const TABLES = [
  "social_engagement_events","social_engagement_classifications","social_engagement_crm_matches",
  "social_engagement_reply_drafts","social_engagement_escalations","social_engagement_import_batches",
  "social_engagement_audit",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, boolean> = {}; const blockers: string[] = [];
  for (const t of TABLES) {
    const { error } = await (a.admin as any).from(t).select("id", { head: true, count: "exact" }).limit(1);
    checks[`table_${t}`] = !error;
    if (error) blockers.push(`missing_${t}:${error.message}`);
  }
  const counterChecks: [string, string][] = [
    ["social_keyword_trigger_rules","engagement_count,last_engagement_at"],
    ["social_dm_flow_blueprints","engagement_count,last_engagement_at"],
    ["social_content_items","social_engagement_count,last_social_engagement_at"],
    ["social_calendar_items","social_engagement_count,last_social_engagement_at"],
  ];
  for (const [tbl, cols] of counterChecks) {
    const { error } = await (a.admin as any).from(tbl).select(cols, { head: true }).limit(1);
    checks[`counters_${tbl}`] = !error;
    if (error) blockers.push(`missing_counters_${tbl}`);
  }
  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({ status, checks, blockers, safety_audit: { ...SAFETY_FLAGS, no_external_action: true, no_real_data_deletion: true, provider_event_receiver_fail_closed: true } });
});