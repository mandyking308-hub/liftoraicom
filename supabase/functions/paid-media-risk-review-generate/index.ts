import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS, detectUnsupportedClaims } from "../_shared/paidMediaLogic.ts";
const PHRASE = "GENERATE PAID MEDIA RISK REVIEW";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  let unsupported: string[] = [];
  if (body.creative_variant_id) {
    const { data: c } = await a.admin.from("paid_media_creative_variants").select("*").eq("id", body.creative_variant_id).single();
    if (c) unsupported = detectUnsupportedClaims(`${c.headline ?? ""} ${c.primary_text ?? ""} ${c.description ?? ""}`);
  }
  const review = {
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    creative_variant_id: body.creative_variant_id ?? null,
    review_name: body.review_name ?? "Auto risk review",
    review_status: "generated", risk_level: unsupported.length ? "high" : "medium",
    regulated_claims_present: unsupported.length > 0, unsupported_claims: unsupported,
    privacy_issues: [], targeting_issues: [], landing_page_issues: [],
    required_disclaimers: unsupported.length ? ["Add disclaimer for unverified claims"] : [],
    recommended_fixes: unsupported.length ? ["Remove or substantiate flagged claims"] : [],
    legal_review_required: unsupported.length > 0, founder_review_required: true,
    is_test_data: !!body.is_test_data,
  };
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, review, safety: SAFETY_FLAGS });
  const { data, error } = await a.admin.from("paid_media_risk_reviews").insert(review).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, risk_review_id: data.id, action: "risk_review_created", after_json: data });
  return json({ ok: true, review: data, safety: SAFETY_FLAGS });
});
