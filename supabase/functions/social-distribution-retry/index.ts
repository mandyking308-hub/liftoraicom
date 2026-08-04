import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { loadContext, submitJob } from "../_shared/socialDistributionSubmit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, job_ids } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const ctx = await loadContext(a.admin, business_id);
  if (ctx.paused) return json({ ok: false, error: "emergency_pause_active" }, 409);

  let q = a.admin.from("social_publish_jobs").select("*")
    .eq("business_id", business_id).eq("distribution_status", "retrying")
    .is("provider_post_id", null).limit(50);
  if (Array.isArray(job_ids) && job_ids.length) q = q.in("id", job_ids);
  const { data: jobs } = await q;

  const now = Date.now();
  const due = (jobs ?? []).filter((j: any) => !j.next_retry_at || new Date(j.next_retry_at).getTime() <= now);
  const waiting = (jobs ?? []).length - due.length;

  const results = [];
  for (const j of due) results.push(await submitJob(a.admin, business_id, j, ctx, false));

  return json({
    ok: true, retried: results.length, waiting_for_backoff: waiting,
    succeeded: results.filter((r) => r.ok).length,
    dead_lettered: results.filter((r) => r.status === "dead_letter").length,
    results,
  });
});
