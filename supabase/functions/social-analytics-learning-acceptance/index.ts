import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

const TABLES = [
  "social_performance_import_batches","social_performance_metrics",
  "social_content_performance_summaries","social_learning_signals",
  "social_strategy_recommendations","social_analytics_audit",
];
const COUNTER_CHECKS: [string, string][] = [
  ["social_content_items","performance_summary_id,total_views,total_engagement,performance_rating,learning_status,last_performance_import_at"],
  ["social_content_variants","total_views,total_engagement,performance_rating,learning_status"],
  ["social_campaign_plans","performance_summary_id,performance_rating,learning_status"],
  ["social_assets","performance_summary_id,performance_rating,usage_performance_notes"],
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
  for (const [tbl, cols] of COUNTER_CHECKS) {
    const { error } = await (a.admin as any).from(tbl).select(cols, { head: true }).limit(1);
    checks[`extended_${tbl}`] = !error;
    if (error) blockers.push(`missing_extension_${tbl}`);
  }
  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({
    status, checks, blockers,
    safety_audit: {
      ...SAFETY_FLAGS, no_external_action: true, provider_sync_fail_closed: true,
      no_real_data_deletion: true,
    },
  });
});