import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");

  const q = (t: string, extra?: Record<string, unknown>) => {
    let qb = admin.from(t).select("id", { count: "exact", head: true });
    if (business_id) qb = qb.eq("business_id", business_id);
    if (extra) for (const [k, v] of Object.entries(extra)) qb = qb.eq(k, v as any);
    return qb;
  };

  const [plans, approved, strategies, rules, maps, reviews, blocked, offers, items, campaignsAll] = await Promise.all([
    q("social_campaign_plans"),
    q("social_campaign_plans", { approval_status: "approved" }),
    q("social_revenue_content_strategy"),
    q("social_customer_journey_content_rules"),
    q("social_campaign_content_map"),
    q("social_campaign_readiness_reviews"),
    q("social_campaign_plans", { campaign_status: "paused" }),
    business_id ? admin.from("business_social_offer_mappings").select("id").eq("business_id", business_id) : Promise.resolve({ data: [] as any[] }),
    business_id ? admin.from("social_content_items").select("offer_mapping_id").eq("business_id", business_id) : Promise.resolve({ data: [] as any[] }),
    business_id ? admin.from("social_campaign_plans").select("linked_revenue_target_id").eq("business_id", business_id) : Promise.resolve({ data: [] as any[] }),
  ]);

  const linkedOffers = new Set(((items.data as any[]) || []).map((i: any) => i.offer_mapping_id).filter(Boolean));
  const offers_without_content_count = ((offers.data as any[]) || []).filter((o: any) => !linkedOffers.has(o.id)).length;

  const linkedRev = new Set(((campaignsAll.data as any[]) || []).map((c: any) => c.linked_revenue_target_id).filter(Boolean));
  const stratData = await (business_id
    ? admin.from("social_revenue_content_strategy").select("revenue_target_id").eq("business_id", business_id)
    : Promise.resolve({ data: [] as any[] } as any));
  const stratSet = new Set(((stratData.data as any[]) || []).map((s: any) => s.revenue_target_id).filter(Boolean));
  const revenue_targets_without_strategy_count = [...linkedRev].filter(id => !stratSet.has(id)).length;

  const readyForCalendar = (approved.count ?? 0) > 0;
  const readyForApproval = (plans.count ?? 0) > 0;

  let next = "Create first campaign plan.";
  if ((plans.count ?? 0) === 0) next = "Create first campaign plan.";
  else if (offers_without_content_count > 0) next = `Create content for ${offers_without_content_count} offers.`;
  else if ((rules.count ?? 0) === 0) next = "Generate customer journey content rules.";
  else if (revenue_targets_without_strategy_count > 0) next = "Create revenue content strategies.";
  else if (!readyForCalendar) next = "Run campaign readiness check + approve.";

  return json({
    ok: true,
    campaign_plans_count: plans.count ?? 0,
    approved_campaigns_count: approved.count ?? 0,
    revenue_strategies_count: strategies.count ?? 0,
    journey_rules_count: rules.count ?? 0,
    campaign_content_maps_count: maps.count ?? 0,
    readiness_reviews_count: reviews.count ?? 0,
    campaigns_blocked_count: blocked.count ?? 0,
    offers_without_content_count,
    revenue_targets_without_strategy_count,
    ready_for_calendar_generation: readyForCalendar,
    ready_for_approval_flow: readyForApproval,
    next_action: next,
    no_external_action: true,
  });
});