import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, classifyQuestion } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_intake_ids, limit = 25, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  let q = a.admin.from("support_question_intake").select("*").eq("business_id", business_id).limit(limit);
  if (Array.isArray(question_intake_ids) && question_intake_ids.length) q = q.in("id", question_intake_ids);
  else q = q.in("question_status", ["captured", "classified"]);
  const { data: rows } = await q;
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_triage: (rows ?? []).length, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "TRIAGE SUPPORT QUESTIONS") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const inserts: any[] = [];
  for (const r of rows ?? []) {
    const c = classifyQuestion(r.question_text);
    const escalate = c.risk_level === "high" || c.risk_level === "critical" || c.intent === "complaint" || c.intent === "dispute" || c.intent === "urgent_risk";
    inserts.push({
      business_id, question_intake_id: r.id,
      triage_status: escalate ? "escalated" : "triaged",
      category: c.category, intent: c.intent, urgency: c.urgency, risk_level: c.risk_level,
      recommended_agent: c.recommended_agent,
      recommended_next_action: escalate ? "create_escalation" : "draft_reply",
      source_truth_status: r.source_truth_status,
      confidence_score: r.source_truth_status === "source_found" ? 70 : 30,
      compliance_review_required: c.risk_flags.includes("privacy") || c.risk_flags.includes("medical") || c.risk_flags.includes("financial_advice"),
      legal_review_required: c.risk_flags.includes("legal_threat"),
    });
    await a.admin.from("support_question_intake").update({ question_status: escalate ? "escalated" : "classified" }).eq("id", r.id);
  }
  if (inserts.length) {
    const { data, error } = await a.admin.from("support_triage_reviews").insert(inserts).select();
    if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
    await a.admin.from("support_audit").insert({ business_id, action: "question_triaged", after_json: { count: data?.length } });
    return json({ ok: true, triaged: data, safety: SUPPORT_SAFETY });
  }
  return json({ ok: true, triaged: [], safety: SUPPORT_SAFETY });
});