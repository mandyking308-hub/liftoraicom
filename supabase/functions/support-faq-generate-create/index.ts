import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, source_id, faq_items, limit = 20, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  const items = Array.isArray(faq_items) && faq_items.length ? faq_items.slice(0, limit) :
    [{ question: "What is your refund policy?", answer: null, faq_category: "refund" },
     { question: "How do I cancel my subscription?", answer: null, faq_category: "cancellation" },
     { question: "How long does delivery take?", answer: null, faq_category: "delivery" }];
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("source_name").eq("business_id", business_id).eq("approved_for_support", true);
  const refs = (sources ?? []).map((s: any) => s.source_name);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: items, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CREATE SUPPORT FAQ ITEMS") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const rows = items.map((it: any, i: number) => ({
    business_id, source_id: source_id ?? null,
    question: it.question, answer: it.answer ?? null,
    faq_category: it.faq_category ?? "other",
    source_references: refs.slice(0, 3),
    missing_source_flags: refs.length ? [] : ["no_approved_source"],
    compliance_warnings: detectUnsupportedClaims(`${it.question} ${it.answer ?? ""}`),
    display_order: i,
  }));
  const { data, error } = await a.admin.from("support_faq_items").insert(rows).select();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, action: "faq_created", after_json: { count: data?.length } });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});