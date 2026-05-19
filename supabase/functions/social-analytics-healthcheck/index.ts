import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, dataQualityScore } from "../_shared/socialAnalyticsLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id");
  if (!business_id && req.method === "POST") { try { const b = await req.json(); business_id = b.business_id ?? null; } catch {} }
  const where = (q: any) => business_id ? q.eq("business_id", business_id) : q;
  const cnt = async (t: string, extra?: (q: any) => any) => {
    let q: any = (a.admin as any).from(t).select("id", { count: "exact", head: true });
    q = where(q); if (extra) q = extra(q);
    const { count } = await q; return count ?? 0;
  };
  const import_batches_total = await cnt("social_performance_import_batches");
  const metrics_total = await cnt("social_performance_metrics");
  const metrics_unmatched = await cnt("social_performance_metrics", (q) => q.is("content_item_id", null).is("campaign_plan_id", null).is("calendar_item_id", null).is("asset_id", null));
  const low_confidence = await cnt("social_performance_metrics", (q) => q.in("metric_confidence", ["manual_unverified","imported_unverified","low_confidence","test_only"]));
  const summaries_total = await cnt("social_content_performance_summaries");
  const learning_signals_total = await cnt("social_learning_signals");
  const learning_signals_needing_review = await cnt("social_learning_signals", (q) => q.eq("signal_status", "needs_review"));
  const recommendations_total = await cnt("social_strategy_recommendations");
  const recommendations_needing_review = await cnt("social_strategy_recommendations", (q) => q.eq("recommendation_status", "needs_review"));

  const data_quality_score = dataQualityScore({ metrics: metrics_total, unmatched: metrics_unmatched, lowConfidence: low_confidence });

  let top_platform: string | null = null;
  let top_content_type: string | null = null;
  if (business_id) {
    const { data: rows } = await a.admin.from("social_performance_metrics").select("platform,content_type,engagement_rate").eq("business_id", business_id).limit(500);
    if (rows?.length) {
      const agg: Record<string, { c: number; er: number }> = {};
      const aggT: Record<string, { c: number; er: number }> = {};
      for (const r of rows as any[]) {
        const p = r.platform ?? "unknown";
        agg[p] = agg[p] || { c: 0, er: 0 }; agg[p].c++; agg[p].er += Number(r.engagement_rate ?? 0);
        const t = r.content_type ?? "unknown";
        aggT[t] = aggT[t] || { c: 0, er: 0 }; aggT[t].c++; aggT[t].er += Number(r.engagement_rate ?? 0);
      }
      const sP = Object.entries(agg).map(([k, v]) => [k, v.c ? v.er / v.c : 0] as const).sort((a, b) => b[1] - a[1]);
      const sT = Object.entries(aggT).filter(([k]) => k !== "unknown").map(([k, v]) => [k, v.c ? v.er / v.c : 0] as const).sort((a, b) => b[1] - a[1]);
      top_platform = sP[0]?.[0] ?? null;
      top_content_type = sT[0]?.[0] ?? null;
    }
  }

  return json({
    ok: true, business_id,
    import_batches_total, metrics_total, metrics_unmatched,
    summaries_total, learning_signals_total, learning_signals_needing_review,
    recommendations_total, recommendations_needing_review,
    top_platform_by_engagement: top_platform, top_content_type,
    data_quality_score,
    provider_calls_total: 0, scraped_pages_total: 0, fake_metrics_created_total: 0,
    no_external_action: true, ...SAFETY_FLAGS,
  });
});