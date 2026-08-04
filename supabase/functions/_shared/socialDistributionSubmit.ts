/** Shared submit pipeline used by social-distribution-submit and -retry. */
import { bufferGraphQL, bufferKeyPresent, CREATE_POST_MUTATION, readCreatePostResult } from "./bufferClient.ts";
import {
  buildCreatePostInput, buildDistributionIdempotencyKey, classifyProviderError,
  computeNextRetryAt, evaluateSubmission, MAX_ATTEMPTS, type PolicyMode,
} from "./socialDistributionLogic.ts";
import { audit, gateUnlocked, getConnection, getPolicy, isPaused, jobApproved, jobMedia, jobText, resolveChannel } from "./socialDistributionDb.ts";

export interface JobEvaluation {
  job_id: string;
  platform: string | null;
  scheduled_for: string | null;
  channel_id: string | null;
  channel_label: string | null;
  eligible: boolean;
  blockers: string[];
  idempotency_key: string | null;
  text_preview: string;
  media_count: number;
}

export async function loadContext(admin: any, business_id: string, provider = "buffer") {
  const [policy, connection, paused, gate] = await Promise.all([
    getPolicy(admin, business_id, provider),
    getConnection(admin, business_id, provider),
    isPaused(admin, business_id, provider),
    gateUnlocked(admin, business_id, provider),
  ]);
  return { policy, connection, paused, gate };
}

export async function evaluateJob(
  admin: any, business_id: string, job: any,
  ctx: { policy: { mode: PolicyMode; allow_share_now: boolean }; connection: any; paused: boolean; gate: boolean },
  share_now = false,
): Promise<JobEvaluation> {
  const { mapping, channel } = await resolveChannel(admin, business_id, job.platform);
  const text = jobText(job);
  const media = jobMedia(job);
  const evaluation = evaluateSubmission({
    job,
    business_id,
    channel,
    mapping_active: mapping ? !!mapping.active : undefined,
    mapping_business_id: mapping?.business_id ?? null,
    connection_present: !!ctx.connection && ctx.connection.connection_status !== "error",
    connection_organization_id: ctx.connection?.provider_organization_id ?? null,
    gate_unlocked: ctx.gate,
    approved: jobApproved(job),
    policy_mode: ctx.policy.mode,
    paused: ctx.paused,
    text,
    media_urls: media,
    share_now: share_now && ctx.policy.allow_share_now,
  });
  return {
    job_id: job.id,
    platform: job.platform ?? null,
    scheduled_for: job.scheduled_for ?? null,
    channel_id: channel?.id ?? null,
    channel_label: channel ? `${channel.service ?? "channel"}: ${channel.display_name ?? channel.name ?? channel.external_channel_id}` : null,
    eligible: evaluation.eligible,
    blockers: evaluation.blockers,
    idempotency_key: channel
      ? buildDistributionIdempotencyKey({ business_id, job_id: job.id, channel_id: channel.id, scheduled_for: share_now ? null : job.scheduled_for })
      : null,
    text_preview: text.slice(0, 140),
    media_count: media.length,
  };
}

export async function submitJob(
  admin: any, business_id: string, job: any,
  ctx: { policy: { mode: PolicyMode; allow_share_now: boolean }; connection: any; paused: boolean; gate: boolean },
  share_now = false,
) {
  const ev = await evaluateJob(admin, business_id, job, ctx, share_now);
  if (!ev.eligible || !ev.channel_id || !ev.idempotency_key) {
    await admin.from("social_publish_jobs").update({
      distribution_status: "blocked", last_error: ev.blockers.join(","),
    }).eq("id", job.id);
    await audit(admin, { business_id, publish_job_id: job.id, action: "distribution_blocked", result_json: { blockers: ev.blockers } });
    return { job_id: job.id, ok: false, status: "blocked", blockers: ev.blockers };
  }

  if (!bufferKeyPresent()) {
    await admin.from("social_publish_jobs").update({ distribution_status: "blocked", last_error: "buffer_api_key_missing" }).eq("id", job.id);
    return { job_id: job.id, ok: false, status: "blocked", blockers: ["buffer_api_key_missing"] };
  }

  // Idempotency: atomically claim the job via an RPC that updates exactly one
  // unclaimed row and reports whether the claim succeeded. Two simultaneous
  // clicks or approval events can never both reach Buffer.
  const { data: claimed, error: claimError } = await admin.rpc("social_claim_distribution_job", {
    p_job_id: job.id,
    p_business_id: business_id,
    p_idempotency_key: ev.idempotency_key,
    p_channel_id: ev.channel_id,
  });
  if (claimError || claimed !== true) {
    await audit(admin, {
      business_id, publish_job_id: job.id, action: "distribution_claim_rejected",
      result_json: { reason: claimError?.message ?? "already_claimed" },
    });
    return { job_id: job.id, ok: false, status: "duplicate", blockers: ["idempotency_conflict"], error: claimError?.message ?? "already_claimed" };
  }

  const { data: channelRow } = await admin.from("social_provider_channels").select("external_channel_id").eq("id", ev.channel_id).maybeSingle();
  const input = buildCreatePostInput({
    channelId: channelRow?.external_channel_id,
    text: jobText(job),
    dueAt: job.scheduled_for,
    shareNow: share_now && ctx.policy.allow_share_now,
    mediaUrls: jobMedia(job),
  });

  const res = await bufferGraphQL(CREATE_POST_MUTATION, { input });
  const attempt = (job.attempt_count ?? 0) + 1;

  if (!res.ok) {
    return await handleFailure(admin, business_id, job.id, res.errorMessage ?? "provider_error", res.status, attempt);
  }
  const parsed = readCreatePostResult(res.data);
  if (parsed.error || !parsed.postId) {
    return await handleFailure(admin, business_id, job.id, parsed.error ?? "no_post_id_returned", res.status, attempt);
  }

  const scheduled = share_now ? "sent" : "scheduled";
  await admin.from("social_publish_jobs").update({
    distribution_status: scheduled,
    provider_post_id: parsed.postId,
    provider_status: parsed.status ?? null,
    provider_response_summary: { post_id: parsed.postId, status: parsed.status ?? null, due_at: parsed.dueAt ?? null },
    submitted_at: new Date().toISOString(),
    published_at: share_now ? new Date().toISOString() : null,
    external_execution_attempted: true,
    external_execution_at: new Date().toISOString(),
    last_error: null,
    next_retry_at: null,
  }).eq("id", job.id);

  await audit(admin, {
    business_id, publish_job_id: job.id, action: "distribution_submitted",
    posts_scheduled: share_now ? 0 : 1, provider_calls: 1,
    result_json: { provider_post_id: parsed.postId, provider_status: parsed.status ?? null },
  });
  return { job_id: job.id, ok: true, status: scheduled, provider_post_id: parsed.postId };
}

async function handleFailure(admin: any, business_id: string, job_id: string, message: string, httpStatus: number, attempt: number) {
  const cls = classifyProviderError(message, httpStatus);
  const next = cls === "transient" ? computeNextRetryAt(attempt) : null;
  const dead = cls === "hard" || attempt >= MAX_ATTEMPTS;
  await admin.from("social_publish_jobs").update({
    distribution_status: dead ? "dead_letter" : "retrying",
    last_error: message,
    next_retry_at: next ? next.toISOString() : null,
    dead_letter_reason: dead ? `${cls}:${message}` : null,
    dead_lettered_at: dead ? new Date().toISOString() : null,
    // A failed submit must release the key so a corrected retry can run.
    distribution_idempotency_key: null,
  }).eq("id", job_id);
  await audit(admin, {
    business_id, publish_job_id: job_id, action: dead ? "distribution_dead_letter" : "distribution_failed",
    error_message: message, result_json: { error_class: cls, attempt },
  });
  return { job_id, ok: false, status: dead ? "dead_letter" : "retrying", error: message, error_class: cls };
}
