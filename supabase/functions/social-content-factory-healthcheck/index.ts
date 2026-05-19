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

  const [packs, items, needsReview, approved, variants, hooks, quality, blocked, missing, compliance] = await Promise.all([
    q("social_content_packs"),
    q("social_content_items"),
    q("social_content_items", { approval_status: "needs_review" }),
    q("social_content_items", { approval_status: "approved" }),
    q("social_content_variants"),
    q("social_hook_caption_bank"),
    q("social_content_quality_reviews"),
    q("social_content_items", { publish_readiness: "blocked" }),
    q("social_content_items", { asset_readiness_status: "missing_asset" }),
    q("social_content_items", { compliance_status: "needs_review" }),
  ]);

  const packsCount = packs.count ?? 0;
  const readyForCalendar = (approved.count ?? 0) > 0;
  const readyForApproval = (needsReview.count ?? 0) > 0;
  let nextAction = "Generate first content pack.";
  if (packsCount === 0) nextAction = "Generate first content pack.";
  else if ((missing.count ?? 0) > 0) nextAction = `Add ${missing.count} missing assets.`;
  else if ((needsReview.count ?? 0) > 0) nextAction = `Review ${needsReview.count} drafts.`;
  else if (readyForCalendar) nextAction = "Move approved content to calendar.";

  return json({
    ok: true,
    content_packs_count: packsCount,
    draft_items_count: items.count ?? 0,
    items_needing_review: needsReview.count ?? 0,
    approved_items_count: approved.count ?? 0,
    variants_count: variants.count ?? 0,
    hooks_bank_count: hooks.count ?? 0,
    quality_reviews_count: quality.count ?? 0,
    blocked_content_count: blocked.count ?? 0,
    missing_asset_count: missing.count ?? 0,
    compliance_warning_count: compliance.count ?? 0,
    ready_for_calendar_generation: readyForCalendar,
    ready_for_approval_flow: readyForApproval,
    next_action: nextAction,
    no_external_action: true,
  });
});