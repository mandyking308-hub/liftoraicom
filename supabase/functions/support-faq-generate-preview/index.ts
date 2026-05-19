import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, source_id, category, limit = 20 } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("*").eq("business_id", business_id).eq("approved_for_support", true).limit(20);
  const has_sources = (sources ?? []).length > 0;
  const base = ["What is your refund policy?","How do I cancel?","What are your delivery times?","How do I get started?","How do I reset my password?","How can I contact support?"].slice(0, Math.min(limit, 6));
  const proposed = base.map((q) => ({
    question: q, answer: has_sources ? "Draft answer based on approved source — founder must verify." : null,
    faq_category: category ?? "other", source_references: (sources ?? []).map((s: any) => s.source_name).slice(0, 3),
    missing_source_flags: has_sources ? [] : ["no_approved_source"], compliance_warnings: detectUnsupportedClaims(q),
  }));
  return json({ ok: true, dry_run: true, proposed_faqs: proposed, has_approved_sources: has_sources, no_records_mutated: true, safety: SUPPORT_SAFETY });
});