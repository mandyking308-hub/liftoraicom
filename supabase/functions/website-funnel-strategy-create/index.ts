import { corsHeaders, json, requireFounder, recommendFunnel, complianceWarnings, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE WEBSITE FUNNEL STRATEGY";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, strategy_name, strategy_type = "lead_generation", target_audience, primary_offer, primary_goal, funnel_stage, website_url, page_goal, value_proposition, linked_campaign_plan_id, founder_notes, is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !strategy_name) return json({ ok: false, error: "missing_fields" }, 400);
  const rec = recommendFunnel(strategy_type);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, preview: { strategy_name, strategy_type, recommended_pages: rec.pages }, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("website_funnel_strategies").insert({
    business_id, strategy_name, strategy_type, target_audience, primary_offer, primary_goal, funnel_stage,
    linked_campaign_plan_id: linked_campaign_plan_id ?? null, website_url, page_goal, value_proposition,
    recommended_pages: rec.pages, risk_warnings: complianceWarnings(strategy_type),
    founder_notes, is_test_data, approval_status: "needs_review",
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, funnel_strategy_id: data?.id, action: "funnel_strategy_created", action_status: "recorded", after_json: data ?? {}, is_test_data });
  return json({ ok: true, strategy: data, ...SAFETY_FLAGS });
});