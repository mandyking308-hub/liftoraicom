/**
 * Approval-driven auto-dispatch.
 *
 * Called server-side after a social approval batch has been successfully
 * approved. It reuses the exact same gate / mapping / pause / approval /
 * payload / idempotency / validation / audit checks as manual dispatch -
 * nothing is bypassed. The founder's batch approval IS the authorisation
 * event, so no interactive confirmation phrase is required.
 *
 * IMPORTANT: approval_batch_id (social_approval_batches.id) and
 * publish_queue_batch_id (social_publish_queue_batches.id) are DIFFERENT
 * domains. Jobs are scoped by approved review IDs unless a real publish
 * queue batch ID is explicitly supplied.
 */
import { audit } from "./socialDistributionDb.ts";
import { shouldAutoDispatch } from "./socialDistributionLogic.ts";
import { loadContext, submitJob } from "./socialDistributionSubmit.ts";
import { materialiseJobsForReviews } from "./socialJobMaterialise.ts";

export interface AutoDispatchArgs {
  business_id: string;
  /** social_approval_batches.id - audit/reference only, never a job filter. */
  approval_batch_id?: string | null;
  /** social_publish_queue_batches.id - only when the caller really has one. */
  publish_queue_batch_id?: string | null;
  /** The approved social_approval_reviews rows (authoritative job scope). */
  approved_reviews?: any[];
  review_ids?: string[];
  provider?: string;
}

export interface AutoDispatchResult {
  attempted: boolean;
  reason?: string;
  error?: string;
  policy_mode?: string;
  approval_batch_id?: string | null;
  publish_queue_batch_id?: string | null;
  approved_items: number;
  jobs_existing: number;
  jobs_created: number;
  jobs_eligible: number;
  submitted: number;
  blocked: number;
  failed: number;
  duplicate: number;
  unknown: number;
  materialisation_blocked: number;
  job_ids: string[];
  materialisation_blockers?: Array<{ source_id: string; blockers: string[] }>;
}

export { shouldAutoDispatch };

export async function autoDispatchApprovedBatch(
  admin: any,
  args: AutoDispatchArgs,
): Promise<AutoDispatchResult> {
  const reviews = args.approved_reviews ?? (args.review_ids ?? []).map((id) => ({ id }));
  const base: AutoDispatchResult = {
    attempted: false,
    approval_batch_id: args.approval_batch_id ?? null,
    publish_queue_batch_id: args.publish_queue_batch_id ?? null,
    approved_items: reviews.length,
    jobs_existing: 0, jobs_created: 0, jobs_eligible: 0,
    submitted: 0, blocked: 0, failed: 0, duplicate: 0, unknown: 0,
    materialisation_blocked: 0, job_ids: [],
  };

  const ctx = await loadContext(admin, args.business_id, args.provider ?? "buffer");
  const decision = shouldAutoDispatch(ctx.policy.mode, ctx.paused);

  await audit(admin, {
    business_id: args.business_id,
    queue_batch_id: args.publish_queue_batch_id ?? null,
    action: "approval_batch_approved",
    result_json: {
      approval_batch_id: args.approval_batch_id ?? null,
      publish_queue_batch_id: args.publish_queue_batch_id ?? null,
      approved_items: reviews.length,
      policy_mode: ctx.policy.mode, paused: ctx.paused, auto_dispatch: decision.go,
    },
  });

  if (!decision.go) return { ...base, reason: decision.reason, policy_mode: ctx.policy.mode };

  let jobs: any[] = [];
  let materialisation_blockers: Array<{ source_id: string; blockers: string[] }> | undefined;

  if (args.publish_queue_batch_id) {
    const { data } = await admin.from("social_publish_jobs").select("*")
      .eq("business_id", args.business_id)
      .eq("queue_batch_id", args.publish_queue_batch_id)
      .is("provider_post_id", null)
      .limit(ctx.policy.max_batch_size);
    jobs = data ?? [];
    base.jobs_existing = jobs.length;
  } else if (reviews.length) {
    const mat = await materialiseJobsForReviews(admin, args.business_id, reviews);
    jobs = mat.jobs.filter((j: any) => !j.provider_post_id).slice(0, ctx.policy.max_batch_size);
    base.jobs_existing = mat.existing;
    base.jobs_created = mat.created;
    base.materialisation_blocked = mat.blocked;
    materialisation_blockers = mat.blockers.length ? mat.blockers : undefined;
  } else {
    return { ...base, reason: "no_batch_scope", policy_mode: ctx.policy.mode };
  }

  if (jobs.length === 0) {
    const out = {
      ...base, attempted: true, policy_mode: ctx.policy.mode,
      blocked: base.materialisation_blocked,
      error: "no_publish_jobs_for_approved_items", materialisation_blockers,
    };
    await audit(admin, {
      business_id: args.business_id, queue_batch_id: args.publish_queue_batch_id ?? null,
      action: "approval_auto_dispatch", result_json: out,
    });
    return out;
  }

  const results: any[] = [];
  for (const j of jobs) results.push(await submitJob(admin, args.business_id, j, ctx, false));

  const ELIGIBLE_STATUSES = ["scheduled", "sent", "retrying", "dead_letter", "submission_unknown"];
  const out: AutoDispatchResult = {
    ...base,
    attempted: true,
    policy_mode: ctx.policy.mode,
    // Only real attempts count as eligible - duplicates/blocked never do.
    jobs_eligible: results.filter((r: any) => ELIGIBLE_STATUSES.includes(r.status)).length,
    submitted: results.filter((r: any) => r.ok).length,
    blocked: results.filter((r: any) => r.status === "blocked").length + base.materialisation_blocked,
    failed: results.filter((r: any) => r.status === "retrying" || r.status === "dead_letter").length,
    duplicate: results.filter((r: any) => r.status === "duplicate").length,
    unknown: results.filter((r: any) => r.status === "submission_unknown").length,
    job_ids: jobs.map((j: any) => j.id),
    materialisation_blockers,
  };

  await audit(admin, {
    business_id: args.business_id, queue_batch_id: args.publish_queue_batch_id ?? null,
    action: "approval_auto_dispatch",
    provider_calls: out.submitted + out.failed + out.unknown,
    posts_scheduled: out.submitted,
    result_json: out,
  });

  return out;
}
