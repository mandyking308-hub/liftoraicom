import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildCsv, ExportType } from "../_shared/socialSchedulerBridge.ts";
const PHRASE = "GENERATE SOCIAL SCHEDULER CSV";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !export_batch_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: batch } = await a.admin.from("social_manual_export_batches").select("*").eq("id", export_batch_id).maybeSingle();
  if (!batch) return json({ ok: false, error: "batch_not_found" }, 404);
  const { data: rows } = await a.admin.from("social_scheduler_export_rows").select("*").eq("export_batch_id", export_batch_id).eq("business_id", business_id).neq("row_status", "blocked").order("sort_order");
  const exportType = (batch.export_type ?? "metricool_csv") as ExportType;
  const csv = buildCsv(rows || [], exportType);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, csv_preview: csv.split("\n").slice(0,30).join("\n"), row_count: rows?.length ?? 0, no_records_mutated: true });
  }
  await a.admin.from("social_manual_export_batches").update({
    csv_text: csv, download_ready: true, export_status: "generated",
    export_payload: { ...(batch.export_payload ?? {}), csv_rows: rows?.length ?? 0 },
  }).eq("id", export_batch_id);
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id, action: "export_download_ready", action_status: "recorded",
    result_json: { row_count: rows?.length ?? 0 }, provider_calls: 0,
  });
  return json({ ok: true, csv, row_count: rows?.length ?? 0, no_external_send: true, no_external_upload: true, provider_calls: 0 });
});
