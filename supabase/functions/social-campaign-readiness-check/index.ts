import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "SAVE SOCIAL CAMPAIGN READINESS REVIEW";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, campaign_plan_id } = body;
  if (!business_id || !campaign_plan_id) return json({ ok: false, error: "business_id_and_campaign_plan_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const { data: campaign } = await admin.from("social_campaign_plans").select("*").eq("id", campaign_plan_id).maybeSingle();
  if (!campaign) return json({ ok: false, error: "campaign_not_found" }, 404);
  const { data: maps } = await admin.from("social_campaign_content_map").select("status,asset_id").eq("campaign_plan_id", campaign_plan_id);

  const blockers: string[] = [];
  const recommendations: string[] = [];

  const offer_clarity_score = (campaign as any).primary_offer ? 90 : 30;
  if (!(campaign as any).primary_offer) blockers.push("No primary offer set.");

  const mapCount = (maps || []).length;
  const withAsset = (maps || []).filter((m: any) => m.asset_id).length;
  const asset_readiness_score = mapCount === 0 ? 0 : Math.round((withAsset / mapCount) * 100);
  if (mapCount === 0) blockers.push("No content mapped to campaign.");
  if (mapCount > 0 && withAsset < mapCount) recommendations.push(`${mapCount - withAsset} mapped items missing assets.`);

  const proof_readiness_score = ((campaign as any).proof_needed?.length ?? 0) > 0
    ? Math.max(20, 80 - ((campaign as any).missing_assets?.length ?? 0) * 10)
    : 50;

  const compliance_score = ((campaign as any).compliance_warnings?.length ?? 0) === 0 ? 90 : 50;
  if (((campaign as any).compliance_warnings?.length ?? 0) > 0) recommendations.push("Address compliance warnings.");

  const content_coverage_score = Math.min(100, mapCount * 10);
  const revenue_alignment_score = (campaign as any).linked_revenue_target_id ? 80 : 30;
  if (!(campaign as any).linked_revenue_target_id) recommendations.push("Link to a revenue target for stronger ROI tracking.");

  const readiness_score = Math.round(
    (offer_clarity_score + asset_readiness_score + proof_readiness_score + compliance_score + content_coverage_score + revenue_alignment_score) / 6
  );
  const review_status = blockers.length > 0 ? "blocked" : readiness_score >= 70 ? "passed" : "needs_work";

  const review = {
    business_id, campaign_plan_id,
    review_status, readiness_score,
    offer_clarity_score, asset_readiness_score, proof_readiness_score,
    compliance_score, content_coverage_score, revenue_alignment_score,
    blockers, recommendations,
    founder_review_required: true,
    legal_review_required: ((campaign as any).risk_flags || []).includes("sensitive_sector"),
    reviewed_at: new Date().toISOString(),
    is_test_data: !!body.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, review });

  const { data, error } = await admin.from("social_campaign_readiness_reviews").insert(review).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await admin.from("social_campaign_plans").update({ readiness_score }).eq("id", campaign_plan_id);
  return json({ ok: true, review: data });
});