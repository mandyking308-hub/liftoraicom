import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
const TABLES = ["support_knowledge_sources","support_knowledge_articles","support_faq_items","support_question_intake","support_reply_drafts","support_triage_reviews","support_escalations","support_quality_reviews","support_manual_export_packs","support_audit"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, confirmation_phrase, dry_run = true } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_purge: TABLES, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "PURGE SUPPORT TEST DATA") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const results: Record<string, number> = {};
  for (const t of TABLES) {
    const { count } = await a.admin.from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    results[t] = count ?? 0;
  }
  await a.admin.from("support_audit").insert({ business_id, action: "test_data_purged", result_json: results });
  return json({ ok: true, purged: results, safety: SUPPORT_SAFETY });
});