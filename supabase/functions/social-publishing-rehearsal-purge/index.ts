import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PHRASE = "PURGE SOCIAL PUBLISHING TEST DATA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true });
  }
  const tables = ["social_publish_queue_audit","social_manual_export_batches","social_publish_jobs","social_publish_queue_batches","social_provider_connections","social_provider_execution_gates"];
  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { data } = await a.admin.from(t).delete().eq("business_id", business_id).eq("is_test_data", true).select("id");
    deleted[t] = data?.length ?? 0;
  }
  return json({ ok: true, deleted, safety: "only_is_test_data_true" });
});