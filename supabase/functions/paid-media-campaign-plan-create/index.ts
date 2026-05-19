import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA CAMPAIGN PLAN";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id || !body.campaign_name || !body.campaign_type) return json({ ok: false, error: "missing_required_fields" }, 400);
  if (body.dry_run !== false) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS, preview: body });
  }
  const { data, error } = await a.admin.from("paid_media_campaign_plans").insert({
    business_id: body.business_id, campaign_name: body.campaign_name, campaign_type: body.campaign_type,
    target_audience: body.target_audience ?? null, primary_goal: body.primary_goal ?? null,
    offer_name: body.offer_name ?? null, platform_list: body.platform_list ?? [],
    linked_funnel_strategy_id: body.linked_funnel_strategy_id ?? null,
    linked_landing_page_id: body.linked_landing_page_id ?? null,
    linked_lead_magnet_id: body.linked_lead_magnet_id ?? null,
    linked_social_campaign_plan_id: body.linked_social_campaign_plan_id ?? null,
    funnel_destination_url: body.funnel_destination_url ?? null,
    budget_total: body.budget_total ?? null, daily_budget: body.daily_budget ?? null,
    currency: body.currency ?? "GBP", start_date: body.start_date ?? null, end_date: body.end_date ?? null,
    success_metric: body.success_metric ?? null, expected_result_notes: body.expected_result_notes ?? null,
    assumptions: body.assumptions ?? [], caveats: body.caveats ?? [], risk_warnings: body.risk_warnings ?? [],
    founder_notes: body.founder_notes ?? null, is_test_data: !!body.is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, campaign_plan_id: data.id, action: "campaign_plan_created", after_json: data });
  return json({ ok: true, plan: data, safety: SAFETY_FLAGS });
});