import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, export_pack_id, article_id, faq_id, external_url, confirmation_notes, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_record: { export_pack_id, article_id, faq_id, external_url }, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CONFIRM SUPPORT CONTENT MANUALLY PUBLISHED") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const now = new Date().toISOString();
  const updates: any[] = [];
  if (export_pack_id) updates.push(a.admin.from("support_manual_export_packs").update({ export_status: "live_confirmed_external", confirmed_external_at: now, confirmed_external_by: a.user.email ?? a.user.id, metadata: { external_url, confirmation_notes } }).eq("id", export_pack_id));
  if (article_id) updates.push(a.admin.from("support_knowledge_articles").update({ publish_status: "manually_published_external" }).eq("id", article_id));
  if (faq_id) updates.push(a.admin.from("support_faq_items").update({ faq_status: "approved_internal", metadata: { external_url, manually_published: true } }).eq("id", faq_id));
  await Promise.all(updates);
  await a.admin.from("support_audit").insert({ business_id, export_pack_id, article_id, faq_id, action: "live_confirmation_recorded", after_json: { external_url, confirmation_notes } });
  return json({ ok: true, recorded: true, safety: SUPPORT_SAFETY });
});