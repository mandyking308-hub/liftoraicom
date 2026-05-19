import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, classifyQuestion } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, question_text, source_channel = "manual", customer_email, customer_handle, customer_name, crm_contact_id, conversation_id, is_test_data = false, dry_run = true, confirmation_phrase } = b;
  if (!business_id || !question_text) return json({ ok: false, error: "business_id, question_text required", safety: SUPPORT_SAFETY }, 400);
  const cls = classifyQuestion(question_text);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: { ...cls, question_text }, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CAPTURE SUPPORT QUESTION") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("id").eq("business_id", business_id).eq("approved_for_support", true).limit(1);
  const row = {
    business_id, source_channel, customer_email, customer_handle, customer_name, crm_contact_id, conversation_id,
    question_text, question_status: "captured",
    detected_intent: cls.intent, detected_category: cls.category, sentiment: cls.sentiment,
    urgency: cls.urgency, risk_level: cls.risk_level,
    crm_match_status: crm_contact_id ? "matched" : "unmatched",
    source_truth_status: (sources ?? []).length ? "source_found" : "source_missing",
    answerable_from_kb: (sources ?? []).length > 0,
    is_test_data,
    metadata: { risk_flags: cls.risk_flags, recommended_agent: cls.recommended_agent },
  };
  const { data, error } = await a.admin.from("support_question_intake").insert(row).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, question_intake_id: data.id, action: "question_captured", after_json: data, is_test_data });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});