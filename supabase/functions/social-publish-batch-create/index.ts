import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PHRASE = "CREATE SOCIAL PUBLISH BATCH";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, batch_name, batch_type, publish_job_ids, provider, platform, scheduled_for, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !batch_name || !batch_type) return json({ ok: false, error: "missing_fields" }, 400);
  if (!Array.isArray(publish_job_ids) || publish_job_ids.length === 0) return json({ ok: false, error: "publish_job_ids_required" }, 400);

  const { data: jobs } = await a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id).in("id", publish_job_ids);
  const ready = (jobs || []).filter((j: any) => j.status !== "blocked" && j.status !== "cancelled");
  const blocked = (jobs || []).filter((j: any) => j.status === "blocked");

  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_include: ready.length, blocked: blocked.length, phrase_required: PHRASE, no_records_mutated: true });
  }

  const { data: batch, error } = await a.admin.from("social_publish_queue_batches").insert({
    business_id, batch_name, batch_type, batch_status: "approved_internal",
    provider, platform, scheduled_for, job_count: ready.length, ready_count: ready.length, blocked_count: blocked.length, is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  if (batch?.id && ready.length) {
    await a.admin.from("social_publish_jobs").update({ queue_batch_id: batch.id, status: "queued" }).in("id", ready.map((r: any) => r.id));
  }
  await a.admin.from("social_publish_queue_audit").insert({
    business_id, queue_batch_id: batch?.id, action: "batch_created", action_status: "recorded",
    provider, platform, after_json: batch ?? {}, is_test_data,
  });

  return json({ ok: true, batch, included: ready.length, blocked_excluded: blocked.length, no_provider_call: true });
});