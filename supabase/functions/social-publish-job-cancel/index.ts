import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PHRASE = "CANCEL SOCIAL PUBLISH JOB";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, publish_job_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !publish_job_id) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true });
  }
  const { data, error } = await a.admin.from("social_publish_jobs").update({ status: "cancelled" }).eq("id", publish_job_id).eq("business_id", business_id).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_publish_queue_audit").insert({
    business_id, publish_job_id, action: "job_cancelled", action_status: "recorded", after_json: data ?? {},
  });
  return json({ ok: true, job: data, no_provider_call: true });
});