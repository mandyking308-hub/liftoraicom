import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, ALLOWED_RECOMMENDATION_TYPES } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "CREATE SOCIAL STRATEGY RECOMMENDATIONS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  const recs: any[] = Array.isArray(body.recommendations) ? body.recommendations : [];
  const valid = recs.filter((r) => r.title && r.recommendation_type && ALLOWED_RECOMMENDATION_TYPES.includes(r.recommendation_type));
  if (dry_run) return json({ ok: true, dry_run: true, will_create: valid.length, no_records_mutated: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const payload = valid.map((r) => ({
    business_id,
    recommendation_type: r.recommendation_type,
    recommendation_status: "needs_review",
    priority: r.priority ?? "normal",
    title: r.title,
    description: r.description ?? null,
    rationale: r.rationale ?? null,
    linked_learning_signal_id: r.linked_learning_signal_id ?? null,
    linked_campaign_plan_id: r.linked_campaign_plan_id ?? null,
    linked_revenue_target_id: r.linked_revenue_target_id ?? null,
    recommended_action: r.recommended_action ?? null,
    expected_impact: r.expected_impact ?? null,
    evidence_level: r.evidence_level ?? "low",
    confidence_score: Number(r.confidence_score ?? 0),
    founder_approval_required: true,
    approval_status: "needs_review",
    is_test_data: !!body.is_test_data,
  }));
  const { data, error } = await a.admin.from("social_strategy_recommendations").insert(payload).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_analytics_audit").insert({
    business_id, action: "recommendation_generated", action_status: "recorded",
    result_json: { created: data?.length ?? 0 }, is_test_data: !!body.is_test_data,
  });
  return json({ ok: true, created: data?.length ?? 0, ...SAFETY_FLAGS });
});