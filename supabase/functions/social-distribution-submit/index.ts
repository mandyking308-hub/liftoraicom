import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { loadContext, submitJob } from "../_shared/socialDistributionSubmit.ts";
import { audit } from "../_shared/socialDistributionDb.ts";

const PHRASE = "DISTRIBUTE APPROVED BATCH";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, job_ids, batch_id, share_now = false, confirmation_phrase, dry_run = false } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!batch_id && !(Array.isArray(job_ids) && job_ids.length)) {
    return json({ ok: false, error: "job_ids_or_batch_id_required" }, 400);
  }
  if (dry_run) return json({ ok: true, dry_run: true, message: "Use social-distribution-preview for a full dry run." });
  if (confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", phrase_required: PHRASE }, 400);

  const ctx = await loadContext(a.admin, business_id);
  if (ctx.paused) return json({ ok: false, error: "emergency_pause_active" }, 409);

  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id).limit(ctx.policy.max_batch_size);
  if (batch_id) q = q.eq("queue_batch_id", batch_id);
  if (job_ids?.length) q = q.in("id", job_ids);
  const { data: jobs } = await q;
  if (!jobs?.length) return json({ ok: false, error: "no_jobs_found" }, 404);

  const results = [];
  for (const j of jobs) results.push(await submitJob(a.admin, business_id, j, ctx, share_now));

  await audit(a.admin, {
    business_id, queue_batch_id: batch_id ?? null, action: "distribution_batch_submit",
    provider_calls: results.filter((r) => r.status !== "blocked").length,
    posts_scheduled: results.filter((r) => r.status === "scheduled").length,
    result_json: { total: results.length, ok: results.filter((r) => r.ok).length },
  });

  return json({
    ok: true,
    submitted: results.filter((r) => r.ok).length,
    blocked: results.filter((r) => r.status === "blocked").length,
    failed: results.filter((r) => r.status === "retrying" || r.status === "dead_letter").length,
    results,
  });
});
