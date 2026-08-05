/**
 * Unattended distribution maintenance.
 *
 * Scheduler-only (x-dispatch-secret == SOCIAL_DISPATCH_SECRET, service-role
 * execution). Never accepts a founder browser token.
 *
 * Each run, per business with a live-ish policy:
 *  1. honours global / provider / business kill switches,
 *  2. retries a small bounded batch of retry-safe `retrying` jobs
 *     (`submission_unknown` is NEVER auto-retried),
 *  3. reconciles a bounded set of provider-side jobs.
 * Writes a heartbeat row so health can prove the runner is alive.
 */
import { corsHeaders, json } from "../_shared/socialAuth.ts";
import { requireScheduler } from "../_shared/socialDispatchAuth.ts";
import { loadContext, submitJob } from "../_shared/socialDistributionSubmit.ts";
import { audit } from "../_shared/socialDistributionDb.ts";
import { reconcileBusiness } from "../_shared/socialDistributionReconcile.ts";
import { resolveEffectiveDispatchMode, selectRetryDueJobs } from "../_shared/socialDistributionLogic.ts";

const MAX_BUSINESSES = 10;
const MAX_RETRIES_PER_BUSINESS = 10;
const MAX_RECONCILE_PER_BUSINESS = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = requireScheduler(req);
  if ("error" in a) return a.error;
  const admin = a.admin;

  let body: any = {};
  try { body = await req.json(); } catch { /* scheduler may send no body */ }
  const provider = body.provider ?? "buffer";
  const only_business_id: string | null = body.business_id ?? null;
  const startedAt = new Date().toISOString();

  let pq = admin.from("social_distribution_policies")
    .select("business_id, policy_mode")
    .eq("provider", provider)
    .in("policy_mode", ["approval_required", "draft_to_buffer", "approved_batch_autopilot"])
    .limit(MAX_BUSINESSES);
  if (only_business_id) pq = pq.eq("business_id", only_business_id);
  const { data: policies, error: policyError } = await pq;
  if (policyError) return json({ ok: false, error: policyError.message }, 500);

  const now = new Date();
  const perBusiness: any[] = [];
  const totals = { retried: 0, succeeded: 0, dead_lettered: 0, reconciled: 0, skipped: 0 };

  for (const p of policies ?? []) {
    const business_id = p.business_id as string;
    const ctx = await loadContext(admin, business_id, provider);
    if (ctx.paused) {
      totals.skipped++;
      perBusiness.push({ business_id, skipped: true, reason: "emergency_pause_active" });
      continue;
    }

    let retried = 0, succeeded = 0, deadLettered = 0;
    if (ctx.gate) {
      const { data: jobs } = await admin.from("social_publish_jobs")
        .select("*")
        .eq("business_id", business_id)
        .eq("distribution_status", "retrying")
        .is("provider_post_id", null)
        .limit(100);
      const due = selectRetryDueJobs(jobs ?? [], now, MAX_RETRIES_PER_BUSINESS);
      for (const job of due) {
        const mode = resolveEffectiveDispatchMode(ctx.policy.mode, "AUTO_SCHEDULE");
        const r = await submitJob(admin, business_id, job, ctx, false, {
          allowed_modes: mode === "DRAFT_TO_BUFFER" ? ["DRAFT_TO_BUFFER"] : ["AUTO_SCHEDULE", "DRAFT_TO_BUFFER"],
        });
        retried++;
        if (r.ok) succeeded++;
        if (r.status === "dead_letter") deadLettered++;
      }
    }

    const rec = await reconcileBusiness(admin, business_id, provider, MAX_RECONCILE_PER_BUSINESS);

    totals.retried += retried;
    totals.succeeded += succeeded;
    totals.dead_lettered += deadLettered;
    totals.reconciled += rec.updated ?? 0;

    const summary = {
      business_id,
      gate_unlocked: ctx.gate,
      retried, succeeded, dead_lettered: deadLettered,
      reconcile: { ok: rec.ok, checked: rec.checked, updated: rec.updated, error: rec.error ?? null },
    };
    perBusiness.push(summary);
    await audit(admin, {
      business_id, action: "distribution_maintenance_run",
      result_json: { ...summary, trigger_source: a.trigger_source },
    });
  }

  await admin.from("social_distribution_dispatch_runs").insert({
    provider,
    trigger_source: a.trigger_source,
    business_id: only_business_id,
    run_status: totals.dead_lettered > 0 ? "completed_with_errors" : "completed",
    jobs_considered: totals.retried,
    jobs_dispatched: totals.succeeded,
    jobs_failed: totals.dead_lettered,
    result_json: { kind: "maintenance", businesses: perBusiness, reconciled: totals.reconciled },
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return json({ ok: true, kind: "maintenance", trigger_source: a.trigger_source, totals, businesses: perBusiness });
});