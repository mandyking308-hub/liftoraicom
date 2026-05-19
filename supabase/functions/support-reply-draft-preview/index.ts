import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, classifyQuestion, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_intake_id, reply_type } = await req.json().catch(() => ({}));
  if (!business_id || !question_intake_id) return json({ ok: false, error: "business_id, question_intake_id required", safety: SUPPORT_SAFETY }, 400);
  const { data: q } = await a.admin.from("support_question_intake").select("*").eq("id", question_intake_id).maybeSingle();
  if (!q) return json({ ok: false, error: "question not found", safety: SUPPORT_SAFETY }, 404);
  const cls = classifyQuestion(q.question_text);
  const escalate = cls.risk_level === "high" || cls.risk_level === "critical" || cls.intent === "complaint" || cls.intent === "dispute";
  const body = escalate
    ? `Hi ${q.customer_name ?? "there"}, thank you for getting in touch — we hear you and we are looking into this carefully. A senior member of our team will respond personally. (HOLDING REPLY — founder approval required before sending.)`
    : `Hi ${q.customer_name ?? "there"}, thanks for reaching out. (Grounded answer placeholder — founder must verify against approved source truth.)`;
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("source_name").eq("business_id", business_id).eq("approved_for_support", true);
  const refs = (sources ?? []).map((s: any) => s.source_name);
  return json({
    ok: true, dry_run: true,
    preview: {
      reply_type: reply_type ?? (escalate ? "complaint_acknowledgement" : "support_answer"),
      subject_line: q.detected_category ? `Re: your ${q.detected_category} question` : "Re: your question",
      reply_body: body,
      source_references: refs.slice(0, 3),
      missing_source_flags: refs.length ? [] : ["no_approved_source"],
      compliance_warnings: detectUnsupportedClaims(body),
      risk_flags: cls.risk_flags,
      recommended_escalation: escalate,
    },
    external_send_allowed: false, no_records_mutated: true, safety: SUPPORT_SAFETY,
  });
});