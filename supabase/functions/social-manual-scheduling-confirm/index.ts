import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
const PHRASE = "CONFIRM SOCIAL MANUAL SCHEDULING";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, export_row_ids, publish_job_ids, confirmation_notes, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, provider_calls: 0, posts_scheduled_externally: 0 });
  }
  if (export_batch_id) {
    await a.admin.from("social_manual_export_batches").update({
      manual_scheduling_status: "manually_scheduled",
      confirmed_scheduled_at: new Date().toISOString(),
      confirmed_scheduled_by: a.user.email ?? a.user.id,
      founder_notes: confirmation_notes ?? null,
    }).eq("id", export_batch_id).eq("business_id", business_id);
  }
  if (export_row_ids?.length) {
    await a.admin.from("social_scheduler_export_rows").update({ row_status: "manually_scheduled" }).in("id", export_row_ids).eq("business_id", business_id);
  } else if (export_batch_id) {
    await a.admin.from("social_scheduler_export_rows").update({ row_status: "manually_scheduled" }).eq("export_batch_id", export_batch_id).eq("business_id", business_id);
  }
  if (publish_job_ids?.length) {
    await a.admin.from("social_publish_jobs").update({ manual_export_status: "exported" }).in("id", publish_job_ids).eq("business_id", business_id);
  }
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id: export_batch_id ?? null, action: "manual_scheduling_confirmed", action_status: "recorded",
    result_json: { rows: export_row_ids?.length ?? null, jobs: publish_job_ids?.length ?? null, notes: confirmation_notes ?? null },
    provider_calls: 0, posts_scheduled_externally: 0, posts_published: 0,
  });
  return json({ ok: true, no_external_action: true, provider_calls: 0, posts_published: 0, posts_scheduled_externally: 0 });
});
