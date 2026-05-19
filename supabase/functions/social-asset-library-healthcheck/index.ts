import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id");
  if (!business_id && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    business_id = b.business_id;
  }
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  const bid = business_id;

  const c = (t: string, filters: Array<[string, any]> = []) => {
    let q: any = admin.from(t).select("id", { count: "exact", head: true }).eq("business_id", bid);
    for (const [k, v] of filters) q = q.eq(k, v);
    return q;
  };

  const [
    assets, approvedSoc, approvedAds, rightsUnknown, rightsBlocked, consentReq, legalReq,
    reqsTotal, reqsMissing, reqsCritical, collections, hookBank, testData,
  ] = await Promise.all([
    c("social_assets"),
    c("social_assets", [["approved_for_social", true]]),
    c("social_assets", [["approved_for_ads", true]]),
    c("social_assets", [["rights_status", "unknown"]]),
    c("social_assets", [["rights_status", "blocked"]]),
    c("social_assets", [["consent_required", true]]),
    c("social_assets", [["legal_review_required", true]]),
    c("social_asset_requirements"),
    c("social_asset_requirements", [["status", "missing"]]),
    c("social_asset_requirements", [["status", "missing"], ["priority", "critical"]]),
    c("social_asset_collections"),
    c("social_hook_caption_bank"),
    c("social_assets", [["is_test_data", true]]),
  ]);

  const blockers: string[] = [];
  if ((approvedSoc.count ?? 0) === 0) blockers.push("no_approved_social_assets");
  if ((reqsCritical.count ?? 0) > 0) blockers.push("critical_assets_missing");
  if ((rightsBlocked.count ?? 0) > 0) blockers.push("blocked_assets_present");

  const ready_for_content_generation =
    (approvedSoc.count ?? 0) >= 3 &&
    (reqsCritical.count ?? 0) === 0 &&
    (rightsBlocked.count ?? 0) === 0;
  const ready_for_calendar_generation = ready_for_content_generation && (collections.count ?? 0) >= 1;

  return json({
    ok: true,
    assets_total: assets.count ?? 0,
    approved_for_social: approvedSoc.count ?? 0,
    approved_for_ads: approvedAds.count ?? 0,
    rights_unknown: rightsUnknown.count ?? 0,
    rights_blocked: rightsBlocked.count ?? 0,
    consent_required: consentReq.count ?? 0,
    legal_review_required: legalReq.count ?? 0,
    requirements_total: reqsTotal.count ?? 0,
    requirements_missing: reqsMissing.count ?? 0,
    requirements_critical: reqsCritical.count ?? 0,
    collections_total: collections.count ?? 0,
    hook_caption_bank_total: hookBank.count ?? 0,
    test_data_count: testData.count ?? 0,
    ready_for_content_generation,
    ready_for_calendar_generation,
    blockers,
    no_external_action: true,
  });
});
