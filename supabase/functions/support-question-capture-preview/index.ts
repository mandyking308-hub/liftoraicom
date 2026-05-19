import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, classifyQuestion } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_text, source_channel = "manual", customer_email, customer_handle, crm_contact_id } = await req.json().catch(() => ({}));
  if (!business_id || !question_text) return json({ ok: false, error: "business_id, question_text required", safety: SUPPORT_SAFETY }, 400);
  const cls = classifyQuestion(question_text);
  const { data: contact } = customer_email
    ? await a.admin.from("crm_contacts").select("id,name,email").eq("business_id", business_id).ilike("email", customer_email).maybeSingle()
    : { data: null } as any;
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("id").eq("business_id", business_id).eq("approved_for_support", true).limit(1);
  return json({
    ok: true, dry_run: true,
    classification: cls,
    crm_match: contact ?? null,
    source_truth_status: (sources ?? []).length ? "source_found" : "source_missing",
    risk_warnings: cls.risk_flags,
    no_records_mutated: true, safety: SUPPORT_SAFETY,
  });
});