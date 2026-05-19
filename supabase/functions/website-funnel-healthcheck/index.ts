import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  const c = async (t: string, filter?: Record<string, any>) => {
    try {
      let q: any = (a.admin as any).from(t).select("id", { head: true, count: "exact" });
      if (business_id) q = q.eq("business_id", business_id);
      if (filter) for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      const { count } = await q; return count ?? 0;
    } catch { return 0; }
  };
  const funnel_strategies_total = await c("website_funnel_strategies");
  const approved_funnels = await c("website_funnel_strategies", { approval_status: "approved" });
  const landing_pages_total = await c("website_landing_page_drafts");
  const lead_magnets_total = await c("lead_magnet_assets");
  const cta_maps_total = await c("conversion_cta_maps");
  const conversion_asset_packs_total = await c("conversion_asset_packs");
  const open_gap_reviews = await c("website_funnel_gap_reviews", { status: "open" });
  const blocked_gaps = await c("website_funnel_gap_reviews", { severity: "critical", status: "open" });
  const pages_export_ready = await c("website_landing_page_drafts", { builder_export_status: "export_ready" });
  const manually_built_count = await c("website_landing_page_drafts", { page_status: "manually_built" });
  const live_confirmed_external_count = await c("website_landing_page_drafts", { page_status: "live_confirmed_external" });
  let social_content_without_cta_map = 0, campaigns_without_funnel = 0;
  try {
    let q: any = (a.admin as any).from("social_content_items").select("id", { head: true, count: "exact" }).is("cta_map_id", null);
    if (business_id) q = q.eq("business_id", business_id);
    const { count } = await q; social_content_without_cta_map = count ?? 0;
  } catch {}
  try {
    let q: any = (a.admin as any).from("social_campaign_plans").select("id", { head: true, count: "exact" }).is("funnel_strategy_id", null);
    if (business_id) q = q.eq("business_id", business_id);
    const { count } = await q; campaigns_without_funnel = count ?? 0;
  } catch {}
  return json({
    ok: true,
    funnel_strategies_total, approved_funnels, landing_pages_total, lead_magnets_total,
    cta_maps_total, conversion_asset_packs_total, open_gap_reviews, blocked_gaps,
    pages_export_ready, manually_built_count, live_confirmed_external_count,
    social_content_without_cta_map, campaigns_without_funnel,
    readiness_average: funnel_strategies_total ? Math.round((approved_funnels / funnel_strategies_total) * 100) : 0,
    external_api_calls_total: 0, pages_published_total: 0, live_forms_created_total: 0, payments_created_total: 0, emails_sent_total: 0,
    ...SAFETY_FLAGS,
  });
});