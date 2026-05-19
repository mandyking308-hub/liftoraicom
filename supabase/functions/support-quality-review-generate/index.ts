import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, reply_draft_id, article_id, faq_id, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  let target_text = ""; let refs: string[] = []; let missing: string[] = [];
  if (reply_draft_id) {
    const { data } = await a.admin.from("support_reply_drafts").select("*").eq("id", reply_draft_id).maybeSingle();
    if (data) { target_text = data.reply_body ?? ""; refs = data.source_references ?? []; missing = data.missing_source_flags ?? []; }
  } else if (article_id) {
    const { data } = await a.admin.from("support_knowledge_articles").select("*").eq("id", article_id).maybeSingle();
    if (data) { target_text = `${data.short_answer ?? ""} ${data.full_answer ?? ""}`; refs = data.source_references ?? []; missing = data.missing_source_flags ?? []; }
  } else if (faq_id) {
    const { data } = await a.admin.from("support_faq_items").select("*").eq("id", faq_id).maybeSingle();
    if (data) { target_text = `${data.question} ${data.answer ?? ""}`; refs = data.source_references ?? []; missing = data.missing_source_flags ?? []; }
  }
  const unsupported = detectUnsupportedClaims(target_text);
  const grounding = refs.length ? 70 : 20;
  const source_truth = missing.length ? 20 : 80;
  const compliance = unsupported.length === 0 ? 80 : 40;
  const passed = grounding >= 60 && source_truth >= 60 && compliance >= 60 && unsupported.length === 0;
  const review = {
    business_id, reply_draft_id, article_id, faq_id,
    review_status: passed ? "passed_internal" : (unsupported.length || missing.length ? "warning" : "generated"),
    grounding_score: grounding, tone_score: 70, clarity_score: 70, compliance_score: compliance, source_truth_score: source_truth,
    unsupported_claims: unsupported, missing_sources: missing,
    compliance_warnings: unsupported.length ? ["review_promise_language"] : [],
    recommended_edits: unsupported.length ? ["remove unsupported claims","add source reference"] : [],
    passed_internal: passed,
  };
  if (dry_run !== false) return json({ ok: true, dry_run: true, preview: review, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "GENERATE SUPPORT QUALITY REVIEW") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data, error } = await a.admin.from("support_quality_reviews").insert(review).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, reply_draft_id, article_id, faq_id, action: "quality_review_created", after_json: data });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});