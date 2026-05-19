import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, legallyDistinctSuggestion, confidenceFromCount } from "../_shared/socialCompetitorTrendLogic.ts";

function build(business_id: string, sources: { observations?: any[]; trends?: any[]; review?: any | null }) {
  const signals: any[] = [];
  for (const o of sources.observations ?? []) {
    let signal_type = "content_gap";
    let impact_area = "content";
    if (o.observation_type === "offer" || o.observation_type === "pricing") { signal_type = "offer_gap"; impact_area = "offer"; }
    if (o.observation_type === "hook") { signal_type = "hook_opportunity"; impact_area = "content"; }
    if (o.observation_type === "testimonial" || o.observation_type === "review") { signal_type = "proof_gap"; impact_area = "brand"; }
    if (o.observation_type === "customer_objection") { signal_type = "objection_signal"; impact_area = "customer_success"; }
    signals.push({
      business_id, signal_type, signal_status: "needs_review",
      source_observation_id: o.id, source_competitor_id: o.competitor_id ?? null,
      signal_title: `Signal from ${o.observation_type}`,
      signal_description: (o.observation_text ?? "").slice(0, 240),
      evidence_summary: `Manual observation${o.platform ? ` on ${o.platform}` : ""}.`,
      recommendation: "Test a legally distinct adaptation in next content pack after founder approval.",
      legally_distinct_adaptation: legallyDistinctSuggestion(o.observation_text ?? ""),
      impact_area,
      confidence_score: confidenceFromCount(1),
      founder_review_required: true,
      is_test_data: !!o.is_test_data,
    });
  }
  for (const t of sources.trends ?? []) {
    signals.push({
      business_id, signal_type: "trend_opportunity", signal_status: "needs_review",
      source_trend_id: t.id,
      signal_title: `Trend: ${t.trend_title}`,
      signal_description: (t.trend_description ?? "").slice(0, 240),
      evidence_summary: `Manual trend signal (${t.trend_type}).`,
      recommendation: t.suggested_use ?? "Plan a legally distinct response if relevant.",
      legally_distinct_adaptation: legallyDistinctSuggestion(t.trend_description ?? t.trend_title),
      impact_area: "content",
      confidence_score: t.confidence_score ?? 25,
      founder_review_required: true,
      is_test_data: !!t.is_test_data,
    });
  }
  if (sources.review) {
    for (const g of (sources.review.offer_gaps ?? []).slice(0, 5)) {
      signals.push({
        business_id, signal_type: "offer_gap", signal_status: "needs_review",
        positioning_review_id: sources.review.id,
        signal_title: `Offer gap: ${String(g).slice(0, 80)}`,
        signal_description: String(g),
        evidence_summary: "Synthesised from positioning review.",
        recommendation: "Consider offer-led campaign in Campaign Engine.",
        legally_distinct_adaptation: legallyDistinctSuggestion(String(g)),
        impact_area: "offer", confidence_score: sources.review.confidence_score ?? 25,
        founder_review_required: true,
        is_test_data: !!sources.review.is_test_data,
      });
    }
  }
  return signals;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id } = b;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const ad = a.admin as any;

  let observations: any[] = [];
  let trends: any[] = [];
  let review: any = null;
  if (b.observation_id) {
    const { data } = await ad.from("social_competitor_observations").select("*").eq("id", b.observation_id).maybeSingle();
    if (data) observations.push(data);
  } else if (b.competitor_id) {
    const { data } = await ad.from("social_competitor_observations").select("*").eq("business_id", business_id).eq("competitor_id", b.competitor_id).limit(20);
    observations = data ?? [];
  } else {
    const { data } = await ad.from("social_competitor_observations").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(10);
    observations = data ?? [];
  }
  if (b.trend_id) {
    const { data } = await ad.from("social_trend_signals").select("*").eq("id", b.trend_id).maybeSingle();
    if (data) trends.push(data);
  } else {
    const { data } = await ad.from("social_trend_signals").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(5);
    trends = data ?? [];
  }
  if (b.positioning_review_id) {
    const { data } = await ad.from("social_market_positioning_reviews").select("*").eq("id", b.positioning_review_id).maybeSingle();
    review = data ?? null;
  }

  const signals = build(business_id, { observations, trends, review });
  return json({ ok: true, dry_run: true, signals, signals_count: signals.length, ...SAFETY_FLAGS, no_records_mutated: true });
});