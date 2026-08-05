/**
 * Automatic Buffer dispatcher.
 *
 * Processes due, approved publish jobs in small batches for businesses whose
 * policy allows autopilot and whose mapped channel is AUTO_SCHEDULE.
 * Every safety check (pause/kill switch, execution gate, approval, mapping,
 * asset rules, idempotency claim) runs inside submitJob — nothing is bypassed.
 *
 * Auth: founder/admin JWT, or x-dispatch-secret == SOCIAL_DISPATCH_SECRET.
 */
import { corsHeaders, json } from "../_shared/socialAuth.ts";
import { requireFounderOrScheduler } from "../_shared/socialDispatchAuth.ts";
import { loadContext, submitJob } from "../_shared/socialDistributionSubmit.ts";
import { audit } from "../_shared/socialDistributionDb.ts";
import { selectDueJobs, shouldAutoDispatch } from "../_shared/socialDistributionLogic.ts";

const MAX_BUSINESSES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounderOrScheduler(req);
  if ("error" in a) return a.error;
  const admin = a.admin;

  let body: any = {};
  try { body = await req.json(); } catch { /* scheduler may send no body */ }
  const provider = body.provider ?? "buffer";
  const only_business_id: string | null = body.business_id ?? null;
  const dry_run = !!body.dry_run;
  const startedAt = new Date().toISOString();

  // Businesses that have explicitly opted into autopilot.
  let pq = admin.from("social_distribution_policies")
    .select("business_id, policy_mode, max_batch_size")
    .eq("provider", provider)
    .eq("policy_mode", "approved_batch_autopilot")
    .limit(MAX_BUSINESSES);
  if (only_business_id) pq = pq.eq("business_id", only_business_id);
  const { data: policies, error: policyError } = await pq;
  if (policyError) return json({ ok: false, error: policyError.message }, 500);

  const now = new Date();
  const perBusiness: any[] = [];
  const totals = { considered: 0, dispatched: 0, blocked: 0, failed: 0, duplicate: 0, unknown: 0, skipped: 0 };

  for (const p of policies ?? []) {
    const business_id = p.business_id as string;
    const ctx = await loadContext(admin, business_id, provider);
    const decision = shouldAutoDispatch(ctx.policy.mode, ctx.paused);
    if (!decision.go) {
      perBusiness.push({ business_id, skipped: true, reason: decision.reason });
      continue;
    }
    if (!ctx.gate) {
      perBusiness.push({ business_id, skipped: true, reason: "execution_gate_locked" });
      continue;
    }

    const { data: jobs } = await admin.from("social_publish_jobs")
      .select("*")
      .eq("business_id", business_id)
      .is("provider_post_id", null)
      .order("scheduled_for", { ascending: true })
      .limit(200);

    const due = selectDueJobs(jobs ?? [], now, ctx.policy.max_batch_size);
    totals.considered += due.length;

    const results: any[] = [];
    for (const job of due) {
      if (dry_run) { results.push({ job_id: job.id, status: "dry_run" }); continue; }
      results.push(await submitJob(admin, business_id, job, ctx, false, { require_auto_schedule: true }));
    }

    const count = (s: string) => results.filter((r) => r.status === s).length;
    const summary = {
      business_id,
      considered: due.length,
      dispatched: results.filter((r) => r.ok).length,
      blocked: count("blocked"),
      failed: count("retrying") + count("dead_letter"),
      duplicate: count("duplicate"),
      unknown: count("submission_unknown"),
      skipped: count("skipped"),
      job_ids: due.map((j: any) => j.id),
    };
    totals.dispatched += summary.dispatched;
    totals.blocked += summary.blocked;
    totals.failed += summary.failed;
    totals.duplicate += summary.duplicate;
    totals.unknown += summary.unknown;
    totals.skipped += summary.skipped;
    perBusiness.push(summary);

    if (!dry_run) {
      await audit(admin, {
        business_id, action: "distribution_dispatch_run",
        provider_calls: summary.dispatched + summary.failed + summary.unknown,
        posts_scheduled: summary.dispatched,
        result_json: { ...summary, trigger_source: a.trigger_source },
      });
    }
  }

  const failedRun = totals.failed > 0 || totals.unknown > 0;
  if (!dry_run) {
    await admin.from("social_distribution_dispatch_runs").insert({
      provider,
      trigger_source: a.trigger_source,
      business_id: only_business_id,
      run_status: failedRun ? "completed_with_errors" : "completed",
      jobs_considered: totals.considered,
      jobs_dispatched: totals.dispatched,
      jobs_blocked: totals.blocked,
      jobs_failed: totals.failed,
      jobs_duplicate: totals.duplicate,
      jobs_unknown: totals.unknown,
      result_json: { businesses: perBusiness },
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  }

  return json({ ok: true, dry_run, trigger_source: a.trigger_source, totals, businesses: perBusiness });
});