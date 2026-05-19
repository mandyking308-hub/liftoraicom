import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, export_name, export_type = "manual_copy_pack", article_ids = [], faq_ids = [], dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !export_name) return json({ ok: false, error: "business_id, export_name required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: { export_name, export_type, article_ids, faq_ids }, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CREATE SUPPORT MANUAL EXPORT") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const [{ data: articles }, { data: faqs }] = await Promise.all([
    article_ids.length ? a.admin.from("support_knowledge_articles").select("*").in("id", article_ids) : Promise.resolve({ data: [] } as any),
    faq_ids.length ? a.admin.from("support_faq_items").select("*").in("id", faq_ids) : Promise.resolve({ data: [] } as any),
  ]);
  const row = {
    business_id, export_name, export_type, export_status: "ready",
    article_ids, faq_ids,
    export_payload: { articles: articles ?? [], faqs: faqs ?? [] },
    operator_instructions: "Copy/paste into your external support tool. No automated publish.",
    helpcentre_instructions: "Verify with approved source truth before publishing.",
    validation_status: "passed",
  };
  const { data, error } = await a.admin.from("support_manual_export_packs").insert(row).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, export_pack_id: data.id, action: "manual_export_created", after_json: { id: data.id } });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});