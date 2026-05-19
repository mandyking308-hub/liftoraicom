import { corsHeaders, json, requireFounder, logAudit, defaultPillars, recommendCadence, buyerJourneyFor, defaultProofRequired, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE LONGFORM CONTENT STRATEGY";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, strategy_name, strategy_type = "blog", dry_run = true, confirmation_phrase, is_test_data = false, ...rest } = body;
  if (!business_id || !strategy_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  }
  const row = {
    business_id, strategy_name, strategy_type,
    content_pillars: rest.content_pillars ?? defaultPillars(strategy_type),
    priority_topics: rest.priority_topics ?? [],
    cadence_recommendation: rest.cadence_recommendation ?? recommendCadence(strategy_type),
    buyer_journey_stage: rest.buyer_journey_stage ?? buyerJourneyFor(strategy_type),
    proof_required: rest.proof_required ?? defaultProofRequired(strategy_type),
    missing_proof: rest.missing_proof ?? [],
    risk_warnings: rest.risk_warnings ?? [],
    target_audience: rest.target_audience ?? null,
    primary_goal: rest.primary_goal ?? null,
    linked_campaign_plan_id: rest.linked_campaign_plan_id ?? null,
    linked_funnel_strategy_id: rest.linked_funnel_strategy_id ?? null,
    linked_revenue_target_id: rest.linked_revenue_target_id ?? null,
    linked_market_signal_id: rest.linked_market_signal_id ?? null,
    linked_learning_signal_id: rest.linked_learning_signal_id ?? null,
    linked_engagement_signal_id: rest.linked_engagement_signal_id ?? null,
    publishing_destination: rest.publishing_destination ?? null,
    founder_notes: rest.founder_notes ?? null,
    is_test_data,
  };
  const { data, error } = await a.admin.from("longform_content_strategies").insert(row).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, strategy_id: data?.id, action: "strategy_created", after_json: data ?? {}, is_test_data });
  return json({ ok: true, strategy: data, safety: SAFETY_FLAGS });
});