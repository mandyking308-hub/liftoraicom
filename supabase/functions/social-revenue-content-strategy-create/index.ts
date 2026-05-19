import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { estimateRevenueStrategy } from "../_shared/socialCampaignLogic.ts";

const CONFIRM = "CREATE SOCIAL REVENUE STRATEGY";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const est = estimateRevenueStrategy({
    target_amount: body.target_amount, target_count: body.target_count,
    price: body.price, primary_offer: body.primary_offer,
  });

  const row = {
    business_id,
    revenue_target_id: body.revenue_target_id,
    campaign_plan_id: body.campaign_plan_id,
    strategy_status: "draft",
    target_summary: body.target_summary,
    target_amount: body.target_amount,
    target_count: body.target_count,
    currency: body.currency || "GBP",
    period_start: body.period_start,
    period_end: body.period_end,
    primary_offer: body.primary_offer,
    estimated_leads_needed: est.estimated_leads_needed,
    estimated_conversion_rate: est.estimated_conversion_rate,
    estimated_content_volume: est.estimated_content_volume,
    recommended_platforms: body.recommended_platforms || ["instagram","linkedin","tiktok"],
    recommended_campaigns: body.recommended_campaigns || ["lead_generation","conversion"],
    recommended_content_mix: body.recommended_content_mix || { educational: 0.4, authority: 0.2, offer: 0.25, social_proof: 0.15 },
    revenue_assumptions: est.revenue_assumptions,
    blockers: est.blockers,
    confidence_score: est.confidence_score,
    approval_status: "draft",
    founder_notes: body.founder_notes,
    is_test_data: !!body.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert: row });

  const { data, error } = await admin.from("social_revenue_content_strategy").insert(row).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, strategy: data });
});