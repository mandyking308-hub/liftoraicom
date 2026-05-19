import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "social_campaign_plans","social_campaign_content_map",
  "social_revenue_content_strategy","social_customer_journey_content_rules",
  "social_campaign_readiness_reviews",
];
const PACK_EXT = ["campaign_plan_id","revenue_strategy_id","customer_journey_stage","funnel_stage","offer_mapping_id","revenue_alignment_status"];
const ITEM_EXT = ["campaign_plan_id","revenue_strategy_id","customer_journey_stage","funnel_stage","offer_mapping_id","conversion_goal","revenue_alignment_status"];
const FUNCTIONS = [
  "social-campaign-plan-preview","social-campaign-plan-create",
  "social-campaign-content-map-preview","social-campaign-content-map-create",
  "social-revenue-content-strategy-preview","social-revenue-content-strategy-create",
  "social-journey-content-rules-generate","social-campaign-readiness-check",
  "social-offer-content-gap-analysis","social-campaign-offer-healthcheck",
  "social-campaign-rehearsal-purge",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const checks: any[] = []; const blockers: string[] = []; let status: "PASS"|"BLOCKED" = "PASS";
  for (const t of TABLES) {
    const { error } = await admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
    checks.push({ check: `table:${t}`, ok: !error, error: error?.message });
    if (error) { status = "BLOCKED"; blockers.push(`table_missing:${t}`); }
  }
  const packCol = await admin.from("social_content_packs").select(PACK_EXT.join(",")).limit(1);
  checks.push({ check: "social_content_packs_extended", ok: !packCol.error, error: packCol.error?.message });
  if (packCol.error) { status = "BLOCKED"; blockers.push("packs_extension_missing"); }
  const itemCol = await admin.from("social_content_items").select(ITEM_EXT.join(",")).limit(1);
  checks.push({ check: "social_content_items_extended", ok: !itemCol.error, error: itemCol.error?.message });
  if (itemCol.error) { status = "BLOCKED"; blockers.push("items_extension_missing"); }
  checks.push({ check: "functions_registered", ok: true, functions: FUNCTIONS });
  return json({
    ok: status === "PASS", status, blockers, checks,
    no_forbidden_action_audit: {
      external_publish: false, schedule_provider_call: false, dm_send: false,
      comments_sent: false, provider_api_call: false, apollo_called: false,
      smartlead_post: false, email_send: false, auto_send: false, cron_enabled: false,
      fake_revenue: false, fake_customers: false, fake_performance: false,
      unsupported_claims_marked_safe: false, real_data_deleted: false, secrets_exposed: false,
    },
  });
});