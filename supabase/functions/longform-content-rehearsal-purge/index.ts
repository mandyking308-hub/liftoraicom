import { corsHeaders, json, requireFounder } from "../_shared/longformContentLogic.ts";
const PHRASE = "PURGE LONGFORM CONTENT TEST DATA";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true });
  const tables = ["longform_content_audit","longform_manual_export_packs","longform_content_gap_reviews","longform_repurposing_maps","newsletter_sequence_plans","longform_content_drafts","seo_content_briefs","longform_content_strategies"];
  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { data } = await a.admin.from(t).delete().eq("business_id", business_id).eq("is_test_data", true).select("id");
    deleted[t] = data?.length ?? 0;
  }
  return json({ ok: true, deleted, safety: "only_is_test_data_true" });
});