/**
 * Approval-driven auto-dispatch.
 *
 * Called server-side after a social approval batch has been successfully
 * approved. It reuses the exact same gate / mapping / pause / approval /
 * idempotency / validation / audit checks as manual dispatch - nothing is
 * bypassed. The only difference is that the founder's batch approval IS the
 * authorisation event, so no interactive confirmation phrase is required.
 */
import { audit } from "./socialDistributionDb.ts";
import { loadContext, submitJob } from "./socialDistributionSubmit.ts";

export interface AutoDispatchResult {
  attempted: boolean;
  reason?: string;
  policy_mode?: string;
  eligible: number;
  submitted: number;
  blocked: number;
  failed: number;
  duplicate: number;
  job_ids: string[];
}

export function shouldAutoDispatch(policyMode: string, paused: boolean): { go: boolean; reason?: string } {
  if (paused) return { go: false, reason: "emergency_pause_active" };
  if (policyMode !== "approved_batch_autopilot") return { go: false, reason: `policy_${policyMode}` };
  return { go: true };
}

export async function autoDispatchApprovedBatch(
  admin: any,
  args: { business_id: string; batch_id?: string | null; review_ids?: string[]; provider?: string },
): Promise<AutoDispatchResult> {
  const empty: AutoDispatchResult = {
    attempted: false, eligible: 0, submitted: 0, blocked: 0, failed: 0, duplicate: 0, job_ids: [],
  };
  const ctx = await loadContext(admin, args.business_id, args.provider ?? "buffer");
  const decision = shouldAutoDispatch(ctx.policy.mode, ctx.paused);

  await audit(admin, {
    business_id: args.business_id, queue_batch_id: args.batch_id ?? null,
    action: "approval_batch_approved",
    result_json: { policy_mode: ctx.policy.mode, paused: ctx.paused, auto_dispatch: decision.go },
  });

  if (!decision.go) return { ...empty, reason: decision.reason, policy_mode: ctx.policy.mode };

  let q = admin.from("social_publish_jobs").select("*")
    .eq("business_id", args.business_id)
    .is("provider_post_id", null)
    .limit(ctx.policy.max_batch_size);
  if (args.batch_id) q = q.eq("queue_batch_id", args.batch_id);
  else if (args.review_ids?.length) q = q.in("approval_review_id", args.review_ids);
  else return { ...empty, reason: "no_batch_scope", policy_mode: ctx.policy.mode };

  const { data: jobs } = await q;
  const list = jobs ?? [];

  const results = [];
  for (const j of list) results.push(await submitJob(admin, args.business_id, j, ctx, false));

  const out: AutoDispatchResult = {
    attempted: true,
    policy_mode: ctx.policy.mode,
    eligible: list.length,
    submitted: results.filter((r: any) => r.ok).length,
    blocked: results.filter((r: any) => r.status === "blocked").length,
    failed: results.filter((r: any) => r.status === "retrying" || r.status === "dead_letter").length,
    duplicate: results.filter((r: any) => r.status === "duplicate").length,
    job_ids: list.map((j: any) => j.id),
  };

  await audit(admin, {
    business_id: args.business_id, queue_batch_id: args.batch_id ?? null,
    action: "approval_auto_dispatch",
    provider_calls: out.submitted + out.failed,
    posts_scheduled: out.submitted,
    result_json: out,
  });

  return out;
}