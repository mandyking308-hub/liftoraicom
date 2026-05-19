import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
const PHRASE = "PURGE SOCIAL SCHEDULER EXPORT TEST DATA";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true });
  }
  const r1 = await a.admin.from("social_scheduler_export_rows").delete().eq("business_id", business_id).eq("is_test_data", true);
  const r2 = await a.admin.from("social_operator_scheduling_tasks").delete().eq("business_id", business_id).eq("is_test_data", true);
  const r3 = await a.admin.from("social_scheduler_export_audit").delete().eq("business_id", business_id).eq("is_test_data", true);
  const r4 = await a.admin.from("social_manual_export_batches").delete().eq("business_id", business_id).eq("is_test_data", true);
  return json({ ok: true, deleted: { rows: r1.count, tasks: r2.count, audit: r3.count, batches: r4.count }, no_real_data_deleted: true });
});
