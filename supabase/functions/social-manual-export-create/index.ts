import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PHRASE = "CREATE SOCIAL MANUAL EXPORT";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_name, export_type = "generic_csv", batch_id, publish_job_ids, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !export_name) return json({ ok: false, error: "missing_fields" }, 400);

  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id);
  if (batch_id) q = q.eq("queue_batch_id", batch_id);
  else if (publish_job_ids?.length) q = q.in("id", publish_job_ids);
  const { data: jobs } = await q.limit(1000);
  const exportable = (jobs || []).filter((j: any) => j.status !== "blocked" && j.status !== "cancelled");

  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_export: exportable.length, phrase_required: PHRASE, no_records_mutated: true });
  }

  const payload = { rows: exportable.map((j: any) => ({ id: j.id, platform: j.platform, provider: j.provider, scheduled_for: j.scheduled_for, job_type: j.job_type })) };
  const { data: ex, error } = await a.admin.from("social_manual_export_batches").insert({
    business_id, export_name, export_type, export_status: "ready",
    queue_batch_id: batch_id ?? null, exported_rows: exportable.length, export_payload: payload, is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  if (exportable.length) {
    await a.admin.from("social_publish_jobs").update({ manual_export_status: "export_ready" }).in("id", exportable.map((j: any) => j.id));
  }
  await a.admin.from("social_publish_queue_audit").insert({
    business_id, queue_batch_id: batch_id ?? null, action: "manual_export_created", action_status: "recorded",
    after_json: ex ?? {}, is_test_data,
  });

  return json({ ok: true, export: ex, exported_rows: exportable.length, no_external_send: true });
});