import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const ALLOWED_RIGHTS = new Set([
  "unknown","founder_owned","company_owned","licensed","third_party_review_required",
  "consent_required","expired","blocked","approved_for_limited_use","approved",
]);
const ALLOWED_REVIEW = new Set([
  "pending","approved","approved_limited","rejected","legal_review","expired","archived",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin, user } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.asset_id) return json({ ok: false, error: "business_id, asset_id required" }, 400);
  const dry_run = b.dry_run !== false;

  const { data: asset } = await admin.from("social_assets").select("*").eq("id", b.asset_id).eq("business_id", b.business_id).maybeSingle();
  if (!asset) return json({ ok: false, error: "asset_not_found" }, 404);

  const d = b.decision ?? {};
  if (d.rights_status_after && !ALLOWED_RIGHTS.has(d.rights_status_after))
    return json({ ok: false, error: "invalid_rights_status_after" }, 400);
  if (d.review_status && !ALLOWED_REVIEW.has(d.review_status))
    return json({ ok: false, error: "invalid_review_status" }, 400);

  // Safety: do not mark third-party as founder_owned implicitly.
  if (d.rights_status_after === "founder_owned" && asset.rights_status !== "founder_owned" && !d.explicit_founder_ownership_confirmed) {
    return json({ ok: false, reason: "founder_ownership_requires_explicit_confirmation" }, 400);
  }

  const review = {
    business_id: b.business_id,
    asset_id: b.asset_id,
    review_status: d.review_status ?? "pending",
    rights_status_before: asset.rights_status,
    rights_status_after: d.rights_status_after ?? asset.rights_status,
    public_use_allowed: d.public_use_allowed ?? null,
    commercial_use_allowed: d.commercial_use_allowed ?? null,
    paid_ads_allowed: d.paid_ads_allowed ?? null,
    derivative_use_allowed: d.derivative_use_allowed ?? null,
    consent_status: d.consent_status ?? null,
    review_notes: d.review_notes ?? null,
    reviewed_by: user.email ?? user.id,
    reviewed_at: new Date().toISOString(),
    legal_review_required: !!d.legal_review_required,
    founder_review_required: d.founder_review_required ?? false,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_write: review });
  if (b.confirmation_phrase !== "APPLY SOCIAL ASSET RIGHTS REVIEW")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "APPLY SOCIAL ASSET RIGHTS REVIEW" }, 400);

  const { error: e1 } = await admin.from("social_asset_rights_reviews").insert(review);
  if (e1) return json({ ok: false, error: e1.message }, 500);

  const assetUpdate: any = {
    rights_status: review.rights_status_after,
    legal_review_required: review.legal_review_required,
    founder_review_required: review.founder_review_required,
  };
  if (review.public_use_allowed !== null) assetUpdate.public_use_allowed = review.public_use_allowed;
  if (review.commercial_use_allowed !== null) assetUpdate.commercial_use_allowed = review.commercial_use_allowed;
  if (review.paid_ads_allowed !== null) assetUpdate.paid_ads_allowed = review.paid_ads_allowed;
  if (review.derivative_use_allowed !== null) assetUpdate.derivative_use_allowed = review.derivative_use_allowed;
  if (review.consent_status) assetUpdate.consent_status = review.consent_status;
  if (review.review_status === "approved") {
    assetUpdate.approved_for_social = !!review.public_use_allowed;
    assetUpdate.approved_for_ads = !!review.paid_ads_allowed;
  }
  if (review.review_status === "approved_limited") {
    assetUpdate.approved_for_social = !!review.public_use_allowed;
    assetUpdate.approved_for_ads = false;
  }
  if (review.review_status === "rejected") {
    assetUpdate.approved_for_social = false;
    assetUpdate.approved_for_ads = false;
  }

  const { error: e2 } = await admin.from("social_assets").update(assetUpdate).eq("id", b.asset_id);
  if (e2) return json({ ok: false, error: e2.message }, 500);

  return json({ ok: true, asset_id: b.asset_id, asset_update: assetUpdate });
});