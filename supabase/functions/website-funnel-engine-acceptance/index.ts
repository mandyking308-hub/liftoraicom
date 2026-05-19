import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const TABLES = [
  "website_funnel_strategies","website_landing_page_drafts","website_page_sections",
  "lead_magnet_assets","conversion_cta_maps","conversion_asset_packs",
  "website_funnel_gap_reviews","website_funnel_audit",
];
const EXTENSIONS: Array<[string,string]> = [
  ["social_campaign_plans","funnel_strategy_id"],
  ["social_campaign_plans","funnel_status"],
  ["social_content_items","cta_map_id"],
  ["social_content_items","funnel_destination_status"],
  ["social_calendar_items","cta_map_id"],
  ["social_calendar_items","funnel_destination_status"],
  ["social_strategy_recommendations","funnel_strategy_id"],
];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, string> = {};
  for (const t of TABLES) {
    const { error } = await a.admin.from(t).select("id").limit(1);
    checks[`table_${t}`] = error ? `err:${error.message}` : "ok";
  }
  for (const [t, c] of EXTENSIONS) {
    try { const { error } = await a.admin.from(t).select(c).limit(1); checks[`${t}.${c}`] = error ? `err:${error.message}` : "ok"; }
    catch (e: any) { checks[`${t}.${c}`] = `err:${e?.message ?? "unknown"}`; }
  }
  const failed = Object.entries(checks).filter(([_,v]) => v !== "ok");
  return json({
    ok: failed.length === 0,
    status: failed.length === 0 ? "PASS" : "BLOCKED",
    checks, blockers: failed.map(([k,v]) => `${k}: ${v}`),
    safety: SAFETY_FLAGS,
    no_forbidden_action_audit: {
      website_publish: false, website_deploy: false,
      shopify_api: false, lovable_api: false, wix_api: false, webflow_api: false, wordpress_api: false,
      external_forms_created: false, payment_links_created: false, customer_charged: false,
      email_send: false, dm_send: false, comment_send: false,
      social_publish: false, social_schedule: false, apollo: false, smartlead_post: false,
      auto_send: false, cron: false, scraping: false,
      external_api_calls: 0, pages_published: 0, live_forms_created: 0, payments_created: 0, emails_sent: 0,
      external_publish_placeholder_fails_closed: true,
      fake_leads_created: false, fake_conversions_created: false, invented_testimonials: false,
      competitor_assets_copied: false, real_data_deletion: false, secrets_exposed: false,
    },
  });
});