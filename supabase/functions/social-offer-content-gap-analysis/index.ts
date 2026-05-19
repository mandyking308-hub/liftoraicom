import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const [offers, items, campaigns, strategies, journeyRules] = await Promise.all([
    admin.from("business_social_offer_mappings").select("id,offer_name,cta").eq("business_id", business_id),
    admin.from("social_content_items").select("id,offer_mapping_id,cta,customer_journey_stage").eq("business_id", business_id),
    admin.from("social_campaign_plans").select("id,campaign_name,missing_assets,proof_needed,linked_revenue_target_id").eq("business_id", business_id),
    admin.from("social_revenue_content_strategy").select("revenue_target_id").eq("business_id", business_id),
    admin.from("social_customer_journey_content_rules").select("journey_stage").eq("business_id", business_id),
  ]);

  const offersList = offers.data || [];
  const itemsList = items.data || [];
  const linkedOfferIds = new Set(itemsList.map((i: any) => i.offer_mapping_id).filter(Boolean));

  const offers_without_content = offersList.filter((o: any) => !linkedOfferIds.has(o.id)).map((o: any) => o.offer_name);
  const content_without_offer = itemsList.filter((i: any) => !i.offer_mapping_id).length;
  const campaigns_without_proof = (campaigns.data || []).filter((c: any) => !c.proof_needed?.length).map((c: any) => c.campaign_name);
  const campaigns_without_assets = (campaigns.data || []).filter((c: any) => (c.missing_assets?.length ?? 0) > 0).map((c: any) => c.campaign_name);

  const strategyRevenueIds = new Set((strategies.data || []).map((s: any) => s.revenue_target_id).filter(Boolean));
  const campaignRevenueIds = (campaigns.data || []).map((c: any) => c.linked_revenue_target_id).filter(Boolean);
  const revenue_targets_without_strategy = campaignRevenueIds.filter((id: string) => !strategyRevenueIds.has(id));

  const ruleStages = new Set((journeyRules.data || []).map((r: any) => r.journey_stage));
  const itemStages = new Set(itemsList.map((i: any) => i.customer_journey_stage).filter(Boolean));
  const allStages = ["prospect","lead","warm_lead","qualified","client","onboarding","active_customer","at_risk_customer","churned_customer","advocate"];
  const customer_stages_without_content = allStages.filter(s => !itemStages.has(s));
  const customer_stages_without_rules = allStages.filter(s => !ruleStages.has(s));

  const missing_ctas = itemsList.filter((i: any) => !i.cta).length;

  return json({
    ok: true, no_records_mutated: true, dry_run: true,
    offers_without_content,
    content_without_offer_count: content_without_offer,
    campaigns_without_proof,
    campaigns_without_assets,
    revenue_targets_without_strategy,
    customer_stages_without_content,
    customer_stages_without_rules,
    missing_ctas,
    next_action: offers_without_content.length > 0
      ? `Create content for ${offers_without_content.length} offers`
      : customer_stages_without_rules.length > 0
        ? "Generate customer journey content rules"
        : "All major gaps closed — run campaign readiness check.",
  });
});