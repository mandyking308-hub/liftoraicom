import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA SPEND SCENARIO";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id || !body.scenario_name) return json({ ok: false, error: "missing_required_fields" }, 400);
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS });
  const evidence = body.evidence_level && body.evidence_provided ? body.evidence_level : "estimate_only";
  const { data, error } = await a.admin.from("paid_media_spend_scenarios").insert({
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    scenario_name: body.scenario_name, currency: body.currency ?? "GBP",
    planned_spend: body.planned_spend ?? null, daily_spend: body.daily_spend ?? null,
    expected_cpc: body.expected_cpc ?? null, expected_cpl: body.expected_cpl ?? null,
    expected_cac: body.expected_cac ?? null, expected_clicks: body.expected_clicks ?? null,
    expected_leads: body.expected_leads ?? null, expected_conversions: body.expected_conversions ?? null,
    expected_revenue: body.expected_revenue ?? null, expected_roas: body.expected_roas ?? null,
    confidence_score: body.confidence_score ?? 0, evidence_level: evidence,
    assumptions: body.assumptions ?? [], caveats: body.caveats ?? [],
    is_test_data: !!body.is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, spend_scenario_id: data.id, action: "spend_scenario_created", after_json: data });
  return json({ ok: true, scenario: data, safety: SAFETY_FLAGS });
});
