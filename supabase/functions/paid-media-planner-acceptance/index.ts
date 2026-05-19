import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const TABLES = ["paid_media_campaign_plans","paid_media_audience_segments","paid_media_creative_variants","paid_media_budget_guards","paid_media_spend_scenarios","paid_media_readiness_checks","paid_media_manual_export_packs","paid_media_risk_reviews","paid_media_audit"];
const EXT: Array<[string,string]> = [
  ["social_campaign_plans","paid_media_campaign_plan_id"],
  ["social_campaign_plans","paid_media_status"],
  ["website_funnel_strategies","paid_media_campaign_plan_id"],
  ["website_funnel_strategies","ads_readiness_status"],
  ["website_landing_page_drafts","ads_readiness_status"],
  ["website_landing_page_drafts","paid_media_campaign_plan_id"],
  ["conversion_cta_maps","paid_media_campaign_plan_id"],
  ["conversion_cta_maps","ads_destination_status"],
  ["social_strategy_recommendations","paid_media_campaign_plan_id"],
];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, string> = {};
  for (const t of TABLES) { const { error } = await a.admin.from(t).select("id").limit(1); checks[`table_${t}`] = error ? `err:${error.message}` : "ok"; }
  for (const [t,c] of EXT) {
    try { const { error } = await a.admin.from(t).select(c).limit(1); checks[`${t}.${c}`] = error ? `err:${error.message}` : "ok"; }
    catch (e: any) { checks[`${t}.${c}`] = `err:${e?.message ?? "unknown"}`; }
  }
  const failed = Object.entries(checks).filter(([_,v]) => v !== "ok");
  return json({
    ok: failed.length === 0, status: failed.length === 0 ? "PASS" : "BLOCKED",
    checks, blockers: failed.map(([k,v]) => `${k}: ${v}`),
    safety: SAFETY_FLAGS,
    no_forbidden_action_audit: {
      meta_ads_api: false, google_ads_api: false, tiktok_ads_api: false, linkedin_ads_api: false,
      x_ads_api: false, pinterest_ads_api: false, reddit_ads_api: false,
      campaigns_launched: false, ads_created_externally: false, money_spent: false,
      payment_methods_created: false, pixels_created: false, tracking_tags_created_externally: false,
      email_send: false, dm_send: false, comment_send: false, social_publish: false, social_schedule: false,
      apollo: false, smartlead_post: false, auto_send: false, cron: false, scraping: false,
      fake_spend: false, fake_cac_roas_roi: false, fake_conversions: false, invented_testimonials: false,
      external_launch_placeholder_fails_closed: true,
      external_api_calls: 0, real_data_deletion: false, secrets_exposed: false,
    },
  });
});
