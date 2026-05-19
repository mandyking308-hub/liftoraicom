import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { validateRow } from "../_shared/socialSchedulerBridge.ts";
const PHRASE = "VALIDATE SOCIAL SCHEDULER EXPORT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !export_batch_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: rows } = await a.admin.from("social_scheduler_export_rows").select("*").eq("export_batch_id", export_batch_id).eq("business_id", business_id);
  const results = (rows || []).map((r: any) => ({ id: r.id, ...validateRow(r) }));
  const failed = results.filter((r) => r.status === "failed").length;
  const warning = results.filter((r) => r.status === "warning").length;
  const passed = results.filter((r) => r.status === "passed").length;
  const overall = failed ? "failed" : warning ? "warning" : "passed";
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, overall, failed, warning, passed, results: results.slice(0,50), no_records_mutated: true });
  }
  for (const r of results) {
    await a.admin.from("social_scheduler_export_rows").update({
      validation_status: r.status, validation_errors: r.errors, validation_warnings: r.warnings,
      row_status: r.status === "failed" ? "blocked" : "ready",
    }).eq("id", r.id);
  }
  await a.admin.from("social_manual_export_batches").update({ validation_status: overall, blocked_rows: failed, row_count: results.length }).eq("id", export_batch_id);
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id, action: "export_validated", action_status: "recorded",
    result_json: { overall, failed, warning, passed }, provider_calls: 0,
  });
  return json({ ok: true, overall, failed, warning, passed, no_external_action: true });
});
