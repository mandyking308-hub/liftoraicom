import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, classifyQuestion } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_intake_id, limit = 25 } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  let q = a.admin.from("support_question_intake").select("*").eq("business_id", business_id).limit(limit);
  if (question_intake_id) q = q.eq("id", question_intake_id);
  else q = q.in("question_status", ["captured", "classified"]);
  const { data: rows } = await q;
  const previews = (rows ?? []).map((r: any) => {
    const c = classifyQuestion(r.question_text);
    return {
      question_intake_id: r.id, ...c,
      escalation_required: c.risk_level === "high" || c.risk_level === "critical" || c.intent === "complaint" || c.intent === "dispute",
      source_truth_status: r.source_truth_status,
    };
  });
  return json({ ok: true, dry_run: true, previews, no_records_mutated: true, safety: SUPPORT_SAFETY });
});