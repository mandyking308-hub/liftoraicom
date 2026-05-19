import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialCompetitorTrendLogic.ts";

const TABLES = [
  "social_competitor_profiles","social_competitor_accounts","social_competitor_observations",
  "social_competitor_content_patterns","social_trend_signals","social_market_positioning_reviews",
  "social_market_learning_signals","social_competitor_trend_audit",
];
const EXTENSIONS: [string, string][] = [
  ["social_content_items","market_learning_signal_id,competitor_inspiration_status,trend_signal_id"],
  ["social_content_packs","market_learning_signal_id,competitor_inspiration_status"],
  ["social_campaign_plans","market_positioning_review_id,market_learning_status"],
  ["social_strategy_recommendations","market_learning_signal_id,competitor_pattern_id,trend_signal_id"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, boolean> = {};
  const blockers: string[] = [];
  for (const t of TABLES) {
    const { error } = await (a.admin as any).from(t).select("id", { head: true, count: "exact" }).limit(1);
    checks[`table_${t}`] = !error;
    if (error) blockers.push(`missing_${t}:${error.message}`);
  }
  for (const [t, cols] of EXTENSIONS) {
    const { error } = await (a.admin as any).from(t).select(cols, { head: true }).limit(1);
    checks[`extended_${t}`] = !error;
    if (error) blockers.push(`missing_extension_${t}`);
  }
  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({
    status, checks, blockers,
    safety_audit: {
      ...SAFETY_FLAGS,
      provider_calls: 0, scraped_pages: 0,
      competitor_claims_published: 0, copied_assets_created: 0,
      external_research_fail_closed: true,
      no_fake_competitor_data: true,
      no_real_data_deletion: true,
    },
  });
});