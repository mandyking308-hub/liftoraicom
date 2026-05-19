import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { eligibleJob } from "../_shared/socialSchedulerBridge.ts";
const PHRASE = "CREATE SOCIAL SCHEDULER EXPORT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_name, export_type = "metricool_csv", publish_job_ids, queue_batch_id, date_range_start, date_range_end, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !export_name) return json({ ok: false, error: "missing_fields" }, 400);
  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id);
  if (queue_batch_id) q = q.eq("queue_batch_id", queue_batch_id);
  if (publish_job_ids?.length) q = q.in("id", publish_job_ids);
  if (date_range_start) q = q.gte("scheduled_for", date_range_start);
  if (date_range_end) q = q.lte("scheduled_for", date_range_end);
  const { data: jobs } = await q.limit(500);
  const eligible = (jobs || []).filter((j: any) => eligibleJob(j).eligible);
  const blocked = (jobs || []).length - eligible.length;
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_create_rows: eligible.length, blocked, phrase_required: PHRASE, no_records_mutated: true, provider_calls: 0, posts_scheduled_externally: 0 });
  }
  const { data: batch, error: bErr } = await a.admin.from("social_manual_export_batches").insert({
    business_id, export_name, export_type, export_status: "ready",
    queue_batch_id: queue_batch_id ?? null,
    date_range_start: date_range_start ?? null, date_range_end: date_range_end ?? null,
    exported_rows: eligible.length, row_count: eligible.length, blocked_rows: blocked,
    export_payload: { source: "social-scheduler-export-create" }, is_test_data,
  }).select().maybeSingle();
  if (bErr || !batch) return json({ ok: false, error: bErr?.message ?? "batch_failed" }, 500);
  const rowsPayload = eligible.map((j: any, idx: number) => {
    const sched = j.scheduled_for ? new Date(j.scheduled_for) : null;
    const p = j.publish_payload ?? {};
    return {
      business_id, export_batch_id: batch.id, publish_job_id: j.id,
      content_item_id: j.content_item_id ?? null,
      platform: j.platform, provider: j.provider,
      scheduled_date: sched ? sched.toISOString().slice(0,10) : null,
      scheduled_time: sched ? sched.toISOString().slice(11,19) : null,
      timezone: "Europe/London",
      caption: p.caption ?? p.text ?? "", title: p.title ?? "",
      link_url: p.link_url ?? null, media_url: p.media_url ?? null,
      row_status: "ready", sort_order: idx, is_test_data,
      csv_row_json: { job_id: j.id },
    };
  });
  if (rowsPayload.length) await a.admin.from("social_scheduler_export_rows").insert(rowsPayload);
  await a.admin.from("social_publish_jobs").update({ manual_export_status: "export_ready" }).in("id", eligible.map((j: any) => j.id));
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id: batch.id, action: "export_batch_created", action_status: "recorded",
    after_json: { rows: rowsPayload.length }, provider_calls: 0, posts_scheduled_externally: 0, is_test_data,
  });
  return json({ ok: true, export_batch: batch, rows_created: rowsPayload.length, blocked_jobs: blocked, no_external_action: true, provider_calls: 0, posts_scheduled_externally: 0 });
});
