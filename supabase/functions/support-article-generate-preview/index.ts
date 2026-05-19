import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, article_type = "help_article", source_id, customer_question } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("source_name").eq("business_id", business_id).eq("approved_for_support", true);
  const refs = (sources ?? []).map((s: any) => s.source_name);
  const title = customer_question ? `Help: ${String(customer_question).slice(0, 80)}` : `${article_type.replace(/_/g, " ")} draft`;
  const preview = {
    article_title: title, article_type,
    customer_question: customer_question ?? null,
    short_answer: "Short, plain-language answer (founder to verify).",
    full_answer: "Full grounded answer with caveats; do not invent policy. Escalate if uncertain.",
    step_by_step: ["Acknowledge the question","Restate it clearly","Provide grounded answer","Link to source / next step","Offer escalation path"],
    source_references: refs.slice(0, 3),
    missing_source_flags: refs.length ? [] : ["no_approved_source"],
    compliance_warnings: detectUnsupportedClaims(customer_question ?? title),
  };
  return json({ ok: true, dry_run: true, preview, no_records_mutated: true, safety: SUPPORT_SAFETY });
});