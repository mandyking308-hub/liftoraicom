import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialCompetitorTrendLogic.ts";

async function count(ad: any, table: string, business_id?: string, extra?: (q: any) => any) {
  let q = ad.from(table).select("id", { count: "exact", head: true });
  if (business_id) q = q.eq("business_id", business_id);
  if (extra) q = extra(q);
  const { count: c } = await q;
  return c ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id") ?? undefined;
  if (!business_id && req.method === "POST") {
    try { const b = await req.json(); business_id = b.business_id; } catch { /* */ }
  }
  const ad = a.admin as any;

  const [
    competitors_total, competitor_accounts_total,
    observations_total, observations_needing_review,
    trends_total, trends_needing_review,
    patterns_total, patterns_needing_review,
    positioning_reviews_total,
    market_learning_signals_total, market_learning_needing_review,
    recommendations_total,
  ] = await Promise.all([
    count(ad, "social_competitor_profiles", business_id),
    count(ad, "social_competitor_accounts", business_id),
    count(ad, "social_competitor_observations", business_id),
    count(ad, "social_competitor_observations", business_id, q => q.in("observation_status", ["draft","needs_review"])),
    count(ad, "social_trend_signals", business_id),
    count(ad, "social_trend_signals", business_id, q => q.in("trend_status", ["draft","needs_review"])),
    count(ad, "social_competitor_content_patterns", business_id),
    count(ad, "social_competitor_content_patterns", business_id, q => q.in("pattern_status", ["draft","needs_review"])),
    count(ad, "social_market_positioning_reviews", business_id),
    count(ad, "social_market_learning_signals", business_id),
    count(ad, "social_market_learning_signals", business_id, q => q.in("signal_status", ["draft","needs_review"])),
    count(ad, "social_strategy_recommendations", business_id),
  ]);

  return json({
    competitors_total, competitor_accounts_total,
    observations_total, observations_needing_review,
    trends_total, trends_needing_review,
    patterns_total, patterns_needing_review,
    positioning_reviews_total,
    market_learning_signals_total, market_learning_needing_review,
    recommendations_total,
    provider_calls_total: 0,
    scraped_pages_total: 0,
    competitor_claims_published_total: 0,
    copied_assets_created_total: 0,
    no_external_action: true,
    ...SAFETY_FLAGS,
  });
});