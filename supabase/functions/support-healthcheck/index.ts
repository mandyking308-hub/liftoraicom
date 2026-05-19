import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id") ?? (await req.json().catch(() => ({})))?.business_id;
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  const count = async (t: string, filter?: (q: any) => any) => {
    let q: any = a.admin.from(t).select("id", { count: "exact", head: true }).eq("business_id", business_id);
    if (filter) q = filter(q);
    const { count: c } = await q; return c ?? 0;
  };
  const [knowledge_sources_total, approved_sources, articles_total, articles_needing_review,
    faq_items_total, faq_needing_review, support_questions_total, support_questions_needing_triage,
    reply_drafts_total, reply_drafts_needing_review, open_escalations, complaint_escalations,
    urgent_risk_escalations, quality_reviews_failed, manually_published_external_count
  ] = await Promise.all([
    count("support_knowledge_sources"),
    count("support_knowledge_sources", (q) => q.eq("approved_for_support", true)),
    count("support_knowledge_articles"),
    count("support_knowledge_articles", (q) => q.eq("approval_status", "draft")),
    count("support_faq_items"),
    count("support_faq_items", (q) => q.eq("approval_status", "draft")),
    count("support_question_intake"),
    count("support_question_intake", (q) => q.in("question_status", ["captured", "classified"])),
    count("support_reply_drafts"),
    count("support_reply_drafts", (q) => q.eq("reply_status", "draft")),
    count("support_escalations", (q) => q.in("escalation_status", ["open", "in_review"])),
    count("support_escalations", (q) => q.eq("escalation_type", "complaint")),
    count("support_escalations", (q) => q.eq("escalation_type", "urgent_risk")),
    count("support_quality_reviews", (q) => q.in("review_status", ["warning", "failed"])),
    count("support_knowledge_articles", (q) => q.eq("publish_status", "manually_published_external")),
  ]);
  const { data: missingRows } = await a.admin.from("support_question_intake").select("id").eq("business_id", business_id).eq("source_truth_status", "source_missing");
  return json({
    ok: true, business_id,
    knowledge_sources_total, approved_sources,
    articles_total, articles_needing_review,
    faq_items_total, faq_needing_review,
    support_questions_total, support_questions_needing_triage,
    reply_drafts_total, reply_drafts_needing_review,
    open_escalations, complaint_escalations, urgent_risk_escalations,
    quality_reviews_failed,
    missing_source_count: (missingRows ?? []).length,
    manually_published_external_count,
    external_api_calls_total: 0, customer_replies_sent_total: 0,
    live_chats_started_total: 0, tickets_created_externally_total: 0, fake_tickets_created_total: 0,
    no_external_action: true, safety: SUPPORT_SAFETY,
  });
});