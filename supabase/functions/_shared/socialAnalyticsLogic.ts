// Shared logic for the Social Analytics / Performance Import + Learning Signals layer.
// 100% internal — never calls provider APIs, never scrapes, never publishes, never invents metrics.

export const SAFETY_FLAGS = {
  no_metricool_api_call: true,
  no_buffer_api_call: true,
  no_hootsuite_api_call: true,
  no_meta_api_call: true,
  no_tiktok_api_call: true,
  no_youtube_api_call: true,
  no_linkedin_api_call: true,
  no_x_api_call: true,
  no_social_provider_api_call: true,
  no_scraping: true,
  no_publish: true,
  no_schedule: true,
  no_dm_send: true,
  no_comment_send: true,
  no_apollo: true,
  no_smartlead_post: true,
  no_email_send: true,
  no_auto_send: true,
  no_cron: true,
  no_fake_metrics: true,
  no_fake_revenue: true,
  no_fake_conversions: true,
  no_automatic_strategy_change: true,
  no_real_data_deletion: true,
  provider_calls: 0,
  scraped_pages: 0,
  fake_metrics_created: 0,
};

export const ALLOWED_PLATFORMS = ["instagram","facebook","tiktok","youtube","linkedin","x_twitter","threads","pinterest","blog","newsletter","website","other"] as const;
export const ALLOWED_CONTENT_TYPES = ["reel","short","video","image_post","carousel","story","text_post","link_post","blog","newsletter","other"] as const;
export const ALLOWED_IMPORT_TYPES = ["manual","csv","pasted_table","metricool_export","platform_export","operator_entry","test","other"] as const;
export const ALLOWED_IMPORT_STATUS = ["draft","previewed","imported","partially_imported","failed","archived"] as const;
export const ALLOWED_ATTRIBUTION = ["none","unverified","assumed","manually_confirmed","system_matched","blocked"] as const;
export const ALLOWED_CONFIDENCE = ["manual_unverified","manual_checked","imported_unverified","imported_checked","system_matched","low_confidence","test_only"] as const;
export const ALLOWED_SUMMARY_TYPES = ["content_item","content_pack","campaign","platform","asset","calendar_week","calendar_month","business_overview","other"] as const;
export const ALLOWED_RATINGS = ["unknown","poor","below_average","average","good","strong","excellent","inconclusive"] as const;
export const ALLOWED_SIGNAL_TYPES = [
  "hook_working","hook_underperforming","caption_working","cta_working","cta_underperforming",
  "platform_working","platform_underperforming","asset_working","asset_underperforming",
  "campaign_working","campaign_underperforming","audience_signal","timing_signal","format_signal",
  "topic_signal","offer_signal","retention_signal","win_back_signal","customer_pain_signal","complaint_signal","other",
] as const;
export const ALLOWED_RECOMMENDATION_TYPES = [
  "create_more_content_like_this","reduce_content_type","change_hook_style","change_cta",
  "change_platform_focus","change_posting_time","improve_asset","create_campaign","adjust_campaign",
  "create_lead_magnet","improve_offer","strengthen_proof","improve_retention_content",
  "improve_win_back_content","escalate_to_founder","other",
] as const;

export function normalizeMetricRow(raw: any): { row: any; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const r: any = { ...raw };
  if (!r.platform && r.platform_key) r.platform = r.platform_key;
  if (!r.platform) errors.push("missing_platform");
  else if (!ALLOWED_PLATFORMS.includes(r.platform)) warnings.push(`unknown_platform:${r.platform}`);
  if (r.content_type && !ALLOWED_CONTENT_TYPES.includes(r.content_type)) warnings.push(`unknown_content_type:${r.content_type}`);
  const hasAnyMetric = ["views","impressions","reach","likes","comments","shares","saves","clicks","follows","conversion_count","lead_count","revenue_attributed"]
    .some((k) => Number(r[k] ?? 0) > 0);
  if (!hasAnyMetric) warnings.push("no_metric_values_provided");
  if (r.revenue_attributed != null && (!r.attribution_status || r.attribution_status === "unverified")) {
    warnings.push("revenue_unverified");
  }
  // engagement rate if missing
  const denom = Number(r.impressions || r.reach || r.views || 0);
  if (denom && r.engagement_rate == null) {
    const eng = Number(r.likes || 0) + Number(r.comments || 0) + Number(r.shares || 0) + Number(r.saves || 0);
    r.engagement_rate = denom ? eng / denom : 0;
  }
  return { row: r, errors, warnings };
}

export function ratePerformance(engagementRate: number | null | undefined, samples: number): string {
  if (!samples || samples < 1) return "unknown";
  if (samples < 3) return "inconclusive";
  const er = Number(engagementRate ?? 0);
  if (er >= 0.08) return "excellent";
  if (er >= 0.05) return "strong";
  if (er >= 0.03) return "good";
  if (er >= 0.015) return "average";
  if (er >= 0.005) return "below_average";
  return "poor";
}

export function confidenceFromSamples(samples: number): number {
  if (samples >= 30) return 90;
  if (samples >= 15) return 75;
  if (samples >= 7) return 55;
  if (samples >= 3) return 35;
  if (samples >= 1) return 15;
  return 0;
}

export function dataQualityScore(opts: { metrics: number; unmatched: number; lowConfidence: number }): number {
  const { metrics, unmatched, lowConfidence } = opts;
  if (!metrics) return 0;
  const matchedRatio = 1 - unmatched / Math.max(1, metrics);
  const confidentRatio = 1 - lowConfidence / Math.max(1, metrics);
  return Math.round((matchedRatio * 50 + confidentRatio * 50));
}