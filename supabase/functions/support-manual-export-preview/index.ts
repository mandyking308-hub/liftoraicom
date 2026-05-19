import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, export_type = "manual_copy_pack", article_ids = [], faq_ids = [] } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  const [{ data: articles }, { data: faqs }] = await Promise.all([
    article_ids.length ? a.admin.from("support_knowledge_articles").select("*").in("id", article_ids) : Promise.resolve({ data: [] } as any),
    faq_ids.length ? a.admin.from("support_faq_items").select("*").in("id", faq_ids) : Promise.resolve({ data: [] } as any),
  ]);
  const warnings: string[] = [];
  (articles ?? []).forEach((x: any) => { if ((x.missing_source_flags ?? []).length) warnings.push(`article_${x.id}_missing_source`); });
  (faqs ?? []).forEach((x: any) => { if ((x.missing_source_flags ?? []).length) warnings.push(`faq_${x.id}_missing_source`); });
  return json({
    ok: true, dry_run: true,
    preview: {
      export_type, article_count: (articles ?? []).length, faq_count: (faqs ?? []).length,
      operator_instructions: "Copy the FAQ / article text into your support tool (Zendesk / Intercom / website FAQ page) manually. Liftor will never publish externally.",
      helpcentre_instructions: "Paste each article into a new help-centre entry. Verify wording against your approved sources before publishing.",
      validation_warnings: warnings,
    },
    no_records_mutated: true, external_api_calls: 0, customer_replies_sent: 0, safety: SUPPORT_SAFETY,
  });
});