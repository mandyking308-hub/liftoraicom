import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, market_signal_id, positioning_review_id } = b;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const ad = a.admin as any;

  let signals: any[] = [];
  if (market_signal_id) {
    const { data } = await ad.from("social_market_learning_signals").select("*").eq("id", market_signal_id).maybeSingle();
    if (data) signals = [data];
  } else {
    const { data } = await ad.from("social_market_learning_signals").select("*").eq("business_id", business_id).eq("signal_status", "needs_review").limit(20);
    signals = data ?? [];
  }
  let review: any = null;
  if (positioning_review_id) {
    const { data } = await ad.from("social_market_positioning_reviews").select("*").eq("id", positioning_review_id).maybeSingle();
    review = data ?? null;
  }

  const recs = signals.map(s => ({
    business_id,
    market_learning_signal_id: s.id,
    recommendation_type: s.impact_area === "offer" ? "offer_change" : s.impact_area === "content" ? "content_angle" : "sales_angle",
    title: s.signal_title,
    rationale: s.evidence_summary ?? "Internal market learning",
    suggested_action: s.recommendation,
    legally_distinct_adaptation: s.legally_distinct_adaptation,
    impact_area: s.impact_area,
    confidence_score: s.confidence_score ?? 0,
    evidence_level: "manual_unverified",
    founder_review_required: true,
    linked_modules: s.impact_area === "offer" ? ["campaign_engine", "social_brain"]
      : s.impact_area === "content" ? ["content_factory", "calendar"]
      : ["social_brain"],
    is_test_data: !!s.is_test_data,
  }));

  return json({
    ok: true, dry_run: true,
    recommendations: recs,
    review_context: review ? { id: review.id, name: review.review_name, gaps: review.offer_gaps?.length ?? 0 } : null,
    ...SAFETY_FLAGS, no_records_mutated: true,
  });
});