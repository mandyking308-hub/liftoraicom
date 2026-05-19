import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, normalizeMetricRow } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "CREATE SOCIAL MANUAL METRIC";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  const { row, errors, warnings } = normalizeMetricRow(body.metric ?? {});
  if (errors.length) return json({ ok: false, errors, warnings }, 400);
  if (dry_run) return json({ ok: true, dry_run: true, normalised: row, warnings, no_records_mutated: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const { data, error } = await a.admin.from("social_performance_metrics").insert({
    business_id,
    platform: row.platform,
    platform_key: row.platform_key ?? row.platform,
    provider: row.provider ?? null,
    metric_date: row.metric_date ?? new Date().toISOString().slice(0, 10),
    external_post_id: row.external_post_id ?? null,
    post_url: row.post_url ?? null,
    content_item_id: row.content_item_id ?? null,
    campaign_plan_id: row.campaign_plan_id ?? null,
    calendar_item_id: row.calendar_item_id ?? null,
    asset_id: row.asset_id ?? null,
    title: row.title ?? null,
    caption_snippet: row.caption_snippet ?? null,
    content_type: row.content_type ?? null,
    views: Number(row.views ?? 0),
    impressions: Number(row.impressions ?? 0),
    reach: Number(row.reach ?? 0),
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    shares: Number(row.shares ?? 0),
    saves: Number(row.saves ?? 0),
    clicks: Number(row.clicks ?? 0),
    follows: Number(row.follows ?? 0),
    profile_visits: Number(row.profile_visits ?? 0),
    conversion_count: Number(row.conversion_count ?? 0),
    lead_count: Number(row.lead_count ?? 0),
    revenue_attributed: row.revenue_attributed ?? null,
    engagement_rate: row.engagement_rate ?? null,
    attribution_status: row.attribution_status ?? "unverified",
    metric_confidence: row.metric_confidence ?? "manual_unverified",
    is_test_data: !!body.is_test_data,
  }).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  await a.admin.from("social_analytics_audit").insert({
    business_id, metric_id: data.id, action: "metric_created", action_status: "recorded",
    result_json: { metric_id: data.id }, is_test_data: !!body.is_test_data,
  });
  return json({ ok: true, metric: data, warnings, ...SAFETY_FLAGS });
});