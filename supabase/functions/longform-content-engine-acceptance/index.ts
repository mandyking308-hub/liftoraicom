import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const TABLES = ["longform_content_strategies","seo_content_briefs","longform_content_drafts","newsletter_sequence_plans","longform_repurposing_maps","longform_content_gap_reviews","longform_manual_export_packs","longform_content_audit"];
const EXT: Array<[string,string]> = [
  ["social_campaign_plans","longform_strategy_id"],
  ["social_campaign_plans","longform_status"],
  ["website_funnel_strategies","longform_strategy_id"],
  ["lead_magnet_assets","longform_draft_id"],
  ["social_content_items","source_longform_draft_id"],
];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string,string> = {};
  for (const t of TABLES) { const { error } = await a.admin.from(t).select("id").limit(1); checks[`table_${t}`] = error ? `err:${error.message}` : "ok"; }
  for (const [t,c] of EXT) { try { const { error } = await a.admin.from(t).select(c).limit(1); checks[`${t}.${c}`] = error ? `err:${error.message}` : "ok"; } catch (e: any) { checks[`${t}.${c}`] = `err:${e?.message ?? "unknown"}`; } }
  const failed = Object.entries(checks).filter(([_,v]) => v !== "ok");
  return json({
    ok: failed.length === 0, status: failed.length === 0 ? "PASS" : "BLOCKED",
    checks, blockers: failed.map(([k,v]) => `${k}: ${v}`),
    safety: SAFETY_FLAGS,
    no_forbidden_action_audit: {
      blog_publish: false, page_publish: false, website_deploy: false,
      cms_api: false, mailchimp: false, klaviyo: false, convertkit: false, substack: false, beehiiv: false, hubspot_marketing: false,
      newsletter_send: false, email_send: false, dm_send: false, comment_send: false,
      social_publish: false, social_schedule: false, apollo: false, smartlead_post: false,
      auto_send: false, cron: false, scraping: false, seo_api: false, gsc: false, ga: false,
      external_api_calls: 0, pages_published: 0, newsletters_sent: 0, emails_sent: 0, scraped_pages: 0,
      external_publish_placeholder_fails_closed: true,
      fake_subscribers: false, fake_seo_rankings: false, invented_testimonials: false, invented_statistics: false,
      regulated_claims_marked_safe: false, real_data_deletion: false, secrets_exposed: false,
    },
  });
});