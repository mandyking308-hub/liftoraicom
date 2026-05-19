import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const ROLES = ["hero_content","support_content","proof_content","educational_content","offer_content","objection_handling"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, campaign_plan_id, content_pack_id } = body;
  if (!business_id || !campaign_plan_id) return json({ ok: false, error: "business_id_and_campaign_plan_id_required" }, 400);

  const [campaign, existing, packItems] = await Promise.all([
    admin.from("social_campaign_plans").select("*").eq("id", campaign_plan_id).maybeSingle(),
    admin.from("social_campaign_content_map").select("map_role,content_item_id,asset_id").eq("campaign_plan_id", campaign_plan_id),
    content_pack_id
      ? admin.from("social_content_pack_items").select("content_item_id,asset_id,platform").eq("pack_id", content_pack_id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const filledRoles = new Set((existing.data || []).map((r: any) => r.map_role));
  const missing_roles = ROLES.filter(r => !filledRoles.has(r));
  const proposed_mapping = (packItems.data || []).slice(0, 12).map((p: any, i: number) => ({
    business_id, campaign_plan_id, content_pack_id,
    content_item_id: p.content_item_id, asset_id: p.asset_id,
    map_role: ROLES[i % ROLES.length], platform: p.platform,
    funnel_stage: (campaign.data as any)?.funnel_stage,
    customer_journey_stage: (campaign.data as any)?.customer_journey_stage,
    priority_score: 50 + (ROLES.length - (i % ROLES.length)),
    status: p.asset_id ? "ready_for_review" : "needs_asset",
  }));

  return json({
    ok: true, no_records_mutated: true, dry_run: true,
    campaign: campaign.data, existing_count: (existing.data || []).length,
    missing_roles, proposed_mapping,
  });
});