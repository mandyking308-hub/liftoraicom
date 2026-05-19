import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, ratePerformance, confidenceFromSamples, ALLOWED_SUMMARY_TYPES } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "GENERATE SOCIAL PERFORMANCE SUMMARY";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const { business_id, summary_type, target_id, platform, period_start, period_end } = body;
  if (!business_id || !summary_type) return json({ ok: false, error: "missing_fields" }, 400);
  if (!ALLOWED_SUMMARY_TYPES.includes(summary_type)) return json({ ok: false, error: "invalid_summary_type" }, 400);
  const dry_run = body.dry_run !== false;

  let q: any = a.admin.from("social_performance_metrics").select("*").eq("business_id", business_id);
  if (platform) q = q.eq("platform", platform);
  if (summary_type === "content_item" && target_id) q = q.eq("content_item_id", target_id);
  if (summary_type === "campaign" && target_id) q = q.eq("campaign_plan_id", target_id);
  if (summary_type === "asset" && target_id) q = q.eq("asset_id", target_id);
  if (period_start) q = q.gte("metric_date", period_start);
  if (period_end) q = q.lte("metric_date", period_end);
  const { data: metrics } = await q;
  const list = (metrics ?? []) as any[];

  const sum = (k: string) => list.reduce((s, m) => s + Number(m[k] ?? 0), 0);
  const total_views = sum("views");
  const total_impressions = sum("impressions");
  const total_reach = sum("reach");
  const total_engagement = sum("likes") + sum("comments") + sum("shares") + sum("saves");
  const total_clicks = sum("clicks");
  const total_leads = sum("lead_count");
  const total_conversions = sum("conversion_count");
  const total_revenue = list.reduce((s, m) => s + Number(m.revenue_attributed ?? 0), 0) || null;
  const ers = list.map((m) => Number(m.engagement_rate ?? 0)).filter((x) => !!x);
  const avg_er = ers.length ? ers.reduce((a, b) => a + b, 0) / ers.length : null;
  const ctrs = list.map((m) => Number(m.click_through_rate ?? 0)).filter((x) => !!x);
  const avg_ctr = ctrs.length ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : null;
  const rating = ratePerformance(avg_er, list.length);
  const confidence = confidenceFromSamples(list.length);

  const caveats: string[] = [];
  if (list.length < 3) caveats.push("Sample size too small to draw firm conclusions.");
  if (list.some((m) => m.attribution_status !== "manually_confirmed" && m.attribution_status !== "system_matched"))
    caveats.push("Revenue/conversion attribution is unverified.");
  if (list.every((m) => m.metric_confidence === "manual_unverified")) caveats.push("All metrics are manually entered and unverified.");

  const key_findings: string[] = [];
  if (avg_er != null) key_findings.push(`Avg engagement rate ${(avg_er * 100).toFixed(2)}% across ${list.length} posts.`);
  if (total_revenue) key_findings.push(`Revenue attributed: ${total_revenue} (treat as unverified unless confirmed).`);
  if (total_leads) key_findings.push(`Leads recorded: ${total_leads}.`);

  const summary = {
    business_id, summary_type, summary_status: "generated", platform: platform ?? null,
    content_item_id: summary_type === "content_item" ? target_id : null,
    campaign_plan_id: summary_type === "campaign" ? target_id : null,
    asset_id: summary_type === "asset" ? target_id : null,
    period_start: period_start ?? null, period_end: period_end ?? null,
    total_posts: list.length, total_views, total_impressions, total_reach, total_engagement,
    total_clicks, total_leads, total_conversions, total_revenue_attributed: total_revenue,
    avg_engagement_rate: avg_er, avg_click_through_rate: avg_ctr,
    performance_rating: rating, key_findings, caveats, confidence_score: confidence,
    is_test_data: !!body.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, summary, no_records_mutated: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const { data: ins, error } = await a.admin.from("social_content_performance_summaries").insert(summary).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  if (summary_type === "content_item" && target_id) {
    await a.admin.from("social_content_items").update({
      performance_summary_id: ins.id, performance_rating: rating,
      total_views, total_engagement, last_performance_import_at: new Date().toISOString(),
      learning_status: "signals_available",
    }).eq("id", target_id);
  } else if (summary_type === "campaign" && target_id) {
    await a.admin.from("social_campaign_plans").update({
      performance_summary_id: ins.id, performance_rating: rating, learning_status: "signals_available",
    }).eq("id", target_id);
  } else if (summary_type === "asset" && target_id) {
    await a.admin.from("social_assets").update({
      performance_summary_id: ins.id, performance_rating: rating,
    }).eq("id", target_id);
  }

  await a.admin.from("social_analytics_audit").insert({
    business_id, summary_id: ins.id, action: "summary_generated", action_status: "recorded",
    result_json: { summary_id: ins.id, rating, confidence },
  });
  return json({ ok: true, summary: ins, ...SAFETY_FLAGS });
});