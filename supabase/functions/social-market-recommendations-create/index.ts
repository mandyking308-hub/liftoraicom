import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, recommendations } = b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id || !Array.isArray(recommendations) || recommendations.length === 0) return json({ ok: false, error: "missing_business_or_recs" }, 400);

  const rows = recommendations.map((r: any) => ({
    business_id,
    recommendation_type: r.recommendation_type ?? "content_angle",
    recommendation_status: "draft",
    priority: r.priority ?? "normal",
    title: String(r.title ?? "Market learning recommendation").slice(0, 240),
    description: r.description ?? r.suggested_action ?? null,
    rationale: r.rationale ?? null,
    recommended_action: r.suggested_action ?? null,
    expected_impact: r.impact_area ?? null,
    evidence_level: r.evidence_level ?? "low",
    confidence_score: r.confidence_score ?? 0,
    founder_approval_required: true,
    approval_status: "draft",
    market_learning_signal_id: r.market_learning_signal_id ?? null,
    competitor_pattern_id: r.competitor_pattern_id ?? null,
    trend_signal_id: r.trend_signal_id ?? null,
    is_test_data: !!r.is_test_data,
    metadata: { legally_distinct_adaptation: r.legally_distinct_adaptation ?? null, linked_modules: r.linked_modules ?? [] },
  }));

  if (dry_run) return json({ ok: true, dry_run: true, preview: rows, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "CREATE SOCIAL MARKET RECOMMENDATIONS") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await (a.admin as any).from("social_strategy_recommendations").insert(rows).select();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);
  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, action: "recommendation_created",
    result_json: { created: ins.data?.length ?? 0 }, ...SUCCESS_AUDIT_DEFAULTS,
  });
  return json({ ok: true, recommendations: ins.data ?? [], ...SAFETY_FLAGS });
});