import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS, genericOutline, complianceWarnings, detectUnsupportedClaims } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE LONGFORM CONTENT DRAFT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, draft_title, draft_type = "blog_post", dry_run = true, confirmation_phrase, is_test_data = false, ...rest } = body;
  if (!business_id || !draft_title) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  }
  const topic = rest.topic ?? draft_title;
  const claimsSource = `${draft_title} ${rest.draft_body ?? ""} ${rest.primary_goal ?? ""}`;
  const row = {
    business_id, draft_title, draft_type,
    strategy_id: rest.strategy_id ?? null,
    seo_brief_id: rest.seo_brief_id ?? null,
    campaign_plan_id: rest.campaign_plan_id ?? null,
    funnel_strategy_id: rest.funnel_strategy_id ?? null,
    lead_magnet_id: rest.lead_magnet_id ?? null,
    target_audience: rest.target_audience ?? null,
    primary_goal: rest.primary_goal ?? null,
    draft_body: rest.draft_body ?? null,
    excerpt: rest.excerpt ?? null,
    meta_title: rest.meta_title ?? null,
    meta_description: rest.meta_description ?? null,
    suggested_slug: rest.suggested_slug ?? null,
    suggested_cta: rest.suggested_cta ?? null,
    suggested_destination_url: rest.suggested_destination_url ?? null,
    section_json: rest.section_json ?? genericOutline(draft_type, topic),
    faq_json: rest.faq_json ?? [],
    source_notes: rest.source_notes ?? null,
    evidence_notes: rest.evidence_notes ?? null,
    claims_to_verify: rest.claims_to_verify ?? [],
    unsupported_claims: rest.unsupported_claims ?? detectUnsupportedClaims(claimsSource),
    proof_placeholders: rest.proof_placeholders ?? ["[CUSTOMER_STORY_PLACEHOLDER]","[STATISTIC_PLACEHOLDER]"],
    compliance_warnings: rest.compliance_warnings ?? complianceWarnings(draft_type),
    copy_risk_flags: rest.copy_risk_flags ?? [],
    originality_notes: rest.originality_notes ?? "Do not copy competitor copy.",
    is_test_data,
  };
  const { data, error } = await a.admin.from("longform_content_drafts").insert(row).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, draft_id: data?.id, strategy_id: row.strategy_id, action: "draft_created", after_json: data ?? {}, is_test_data });
  return json({ ok: true, draft: data, safety: SAFETY_FLAGS });
});