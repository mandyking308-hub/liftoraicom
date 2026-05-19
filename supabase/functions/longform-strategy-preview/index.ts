import { corsHeaders, json, requireFounder, SAFETY_FLAGS, defaultPillars, recommendCadence, buyerJourneyFor, defaultProofRequired } from "../_shared/longformContentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, strategy_type = "blog", target_audience, primary_goal } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  return json({
    ok: true, no_records_mutated: true,
    recommended: {
      content_pillars: defaultPillars(strategy_type),
      priority_topics: [],
      cadence_recommendation: recommendCadence(strategy_type),
      buyer_journey_stage: buyerJourneyFor(strategy_type),
      proof_required: defaultProofRequired(strategy_type),
      missing_proof: ["Awaiting founder evidence inputs"],
      risk_warnings: ["No publishing — internal drafts only"],
      target_audience: target_audience ?? null,
      primary_goal: primary_goal ?? null,
    },
    safety: SAFETY_FLAGS,
  });
});