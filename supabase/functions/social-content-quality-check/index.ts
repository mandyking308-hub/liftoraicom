import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { qualityReview, SENSITIVE_SECTORS, inferBusinessType } from "../_shared/socialContentFactory.ts";

const CONFIRM = "SAVE SOCIAL CONTENT QUALITY REVIEW";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_item_id, pack_id, variant_id } = body;
  const dry_run = body.dry_run !== false;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  let target: any = null;
  if (content_item_id) {
    const { data } = await admin.from("social_content_items").select("*").eq("id", content_item_id).maybeSingle();
    target = data;
  } else if (variant_id) {
    const { data } = await admin.from("social_content_variants").select("*").eq("id", variant_id).maybeSingle();
    target = data;
  }
  const hasAsset = !!target?.asset_id;
  let assetApproved = false;
  if (hasAsset) {
    const { data } = await admin.from("social_assets").select("consent_status").eq("id", target.asset_id).maybeSingle();
    assetApproved = data?.consent_status === "approved" || data?.consent_status === "verified";
  }
  const { data: brain } = await admin.from("business_social_brain_profiles").select("brand_voice").eq("business_id", business_id).maybeSingle();
  const sensitive = SENSITIVE_SECTORS.includes(inferBusinessType(undefined, undefined, target?.caption || ""));
  const review = qualityReview({
    content: target, hasAsset, assetApproved, sensitive,
    brandFitHints: brain?.brand_voice ? [brain.brand_voice] : [],
  });

  if (dry_run) return json({ ok: true, dry_run: true, review });

  const row: any = {
    business_id, content_item_id, variant_id, pack_id,
    review_status: review.review_status,
    quality_score: review.quality_score,
    brand_fit_score: review.brand_fit_score,
    compliance_score: review.compliance_score,
    asset_readiness_score: review.asset_readiness_score,
    risk_level: review.risk_level,
    issues: review.issues,
    recommendations: review.recommendations,
    founder_review_required: review.founder_review_required,
    legal_review_required: review.legal_review_required,
    is_test_data: !!body.is_test_data,
    reviewed_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("social_content_quality_reviews").insert(row).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  if (content_item_id) {
    await admin.from("social_content_items").update({
      quality_status: review.review_status === "passed" ? "passed" : "needs_edit",
      compliance_status: review.legal_review_required ? "needs_review" : "passed",
      publish_readiness: review.publish_readiness,
    }).eq("id", content_item_id);
  }
  return json({ ok: true, review: data });
});