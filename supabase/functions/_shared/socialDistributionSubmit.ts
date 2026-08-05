/** Shared submit pipeline used by preview, manual submit, retry and auto-dispatch. */
import { bufferGraphQL, bufferKeyPresent, CREATE_POST_MUTATION, readCreatePostResult } from "./bufferClient.ts";
import {
  buildCreatePostInput, buildDistributionIdempotencyKey, classifySubmissionOutcome,
  computeNextRetryAt, evaluateSubmission, MAX_ATTEMPTS, normaliseDispatchMode,
  type ChannelDispatchMode, type MediaAsset, type PolicyMode,
} from "./socialDistributionLogic.ts";
import { audit, gateUnlocked, getConnection, getPolicy, isPaused, resolveChannel } from "./socialDistributionDb.ts";
import { resolveApproval, resolveJobPayload, type ResolvedPayload } from "./socialPayloadResolver.ts";

export interface JobEvaluation {
  job_id: string;
  platform: string | null;
  scheduled_for: string | null;
  channel_id: string | null;
  external_channel_id: string | null;
  channel_label: string | null;
  dispatch_mode: ChannelDispatchMode;
  save_to_draft: boolean;
  eligible: boolean;
  blockers: string[];
  idempotency_key: string | null;
  /** Exact final caption that would be sent to Buffer. */
  text: string;
  text_preview: string;
  media: MediaAsset[];
  media_count: number;
  link_url: string | null;
  hydrated_from: ResolvedPayload["sources"]["hydrated_from"];
  /** The exact CreatePostInput Buffer would receive (null when not eligible). */
  provider_input: Record<string, unknown> | null;
}

export interface DistributionContext {
  policy: { mode: PolicyMode; allow_share_now: boolean; max_batch_size: number };
  connection: any;
  paused: boolean;
  gate: boolean;
}

export async function loadContext(admin: any, business_id: string, provider = "buffer"): Promise<DistributionContext> {
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
  ctx: DistributionContext,
  share_now = false,
): Promise<JobEvaluation> {
  const [{ mapping, channel }, payload, approval] = await Promise.all([
    resolveChannel(admin, business_id, job.platform),
    resolveJobPayload(admin, business_id, job),
    resolveApproval(admin, business_id, job),
  ]);

  const shareNow = share_now && ctx.policy.allow_share_now;
  const dispatch_mode = normaliseDispatchMode(mapping?.dispatch_mode);
  const save_to_draft = dispatch_mode === "DRAFT_TO_BUFFER";
  const evaluation = evaluateSubmission({
    job,
    business_id,
    channel,
    mapping_active: mapping ? !!mapping.active : undefined,
    mapping_business_id: mapping?.business_id ?? null,
    dispatch_mode: mapping ? dispatch_mode : undefined,
    connection_present: !!ctx.connection && ctx.connection.connection_status !== "error",
    connection_organization_id: ctx.connection?.provider_organization_id ?? null,
    gate_unlocked: ctx.gate,
    approved: approval.approved,
    policy_mode: ctx.policy.mode,
    paused: ctx.paused,
    text: payload.text,
    media_urls: payload.media,
    share_now: shareNow,
  });

  const blockers = Array.from(new Set([
    ...evaluation.blockers,
    ...payload.blockers,
    ...(approval.approved ? [] : approval.blockers),
  ]));

  const externalChannelId = channel?.external_channel_id ? String(channel.external_channel_id).trim() : "";
  if (channel && !externalChannelId) blockers.push("provider_channel_id_missing");

  const eligible = blockers.length === 0;
  const idempotency_key = channel
    ? buildDistributionIdempotencyKey({
        business_id, job_id: job.id, channel_id: channel.id,
        scheduled_for: shareNow ? null : job.scheduled_for,
      })
    : null;

  return {
    job_id: job.id,
    platform: job.platform ?? null,
    scheduled_for: job.scheduled_for ?? null,
    channel_id: channel?.id ?? null,
    external_channel_id: externalChannelId || null,
    channel_label: channel ? `${channel.service ?? "channel"}: ${channel.display_name ?? channel.name ?? channel.external_channel_id}` : null,
    dispatch_mode,
    save_to_draft,
    eligible,
    blockers,
    idempotency_key,
    text: payload.text,
    text_preview: payload.text.slice(0, 280),
    media: payload.media,
    media_count: payload.media.length,
    link_url: payload.link_url,
    hydrated_from: payload.sources.hydrated_from,
    provider_input: eligible && externalChannelId
      ? buildCreatePostInput({
          channelId: externalChannelId,
          text: payload.text,
          dueAt: job.scheduled_for,
          shareNow,
          mediaUrls: payload.media,
          linkAttachment: payload.link_url ? { url: payload.link_url } : null,
          saveToDraft: save_to_draft,
        })
      : null,
  };
}

export async function submitJob(
  admin: any, business_id: string, job: any,
  ctx: DistributionContext,
  share_now = false,
  opts: { require_auto_schedule?: boolean } = {},
) {
  const ev = await evaluateJob(admin, business_id, job, ctx, share_now);
  if (opts.require_auto_schedule && ev.dispatch_mode !== "AUTO_SCHEDULE") {
    await audit(admin, {
      business_id, publish_job_id: job.id, action: "distribution_skipped_not_auto_schedule",
      result_json: { dispatch_mode: ev.dispatch_mode },
    });
    return { job_id: job.id, ok: false, status: "skipped", blockers: ["channel_mode_not_auto_schedule"] };
  }
  if (!ev.eligible || !ev.channel_id || !ev.idempotency_key || !ev.external_channel_id || !ev.provider_input) {
    const blockers = ev.blockers.length ? ev.blockers : ["provider_channel_id_missing"];
    await admin.from("social_publish_jobs").update({
      distribution_status: "blocked", last_error: blockers.join(","),
    }).eq("id", job.id);
    await audit(admin, { business_id, publish_job_id: job.id, action: "distribution_blocked", result_json: { blockers } });
    return { job_id: job.id, ok: false, status: "blocked", blockers };
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

  // The provider input is the exact object shown by preview - no drift.
  const res = await bufferGraphQL(CREATE_POST_MUTATION, { input: ev.provider_input });
  const attempt = (job.attempt_count ?? 0) + 1;

  if (!res.ok) {
    return await handleFailure(admin, business_id, job.id, {
      message: res.errorMessage ?? "provider_error",
      httpStatus: res.status,
      phase: res.phase ?? "transport",
      attempt,
    });
  }
  const parsed = readCreatePostResult(res.data);
  if (parsed.error || !parsed.postId) {
    return await handleFailure(admin, business_id, job.id, {
      message: parsed.error ?? "no_post_id_returned",
      httpStatus: res.status,
      // Buffer answered; a MutationError means nothing was created.
      phase: parsed.error ? "response" : "transport",
      attempt,
    });
  }

  const scheduled = share_now ? "sent" : "scheduled";
  await admin.from("social_publish_jobs").update({
    distribution_status: ev.save_to_draft ? "draft_in_provider" : scheduled,
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
    posts_scheduled: share_now || ev.save_to_draft ? 0 : 1, provider_calls: 1,
    result_json: { provider_post_id: parsed.postId, provider_status: parsed.status ?? null, dispatch_mode: ev.dispatch_mode },
  });
  return {
    job_id: job.id, ok: true,
    status: ev.save_to_draft ? "draft_in_provider" : scheduled,
    provider_post_id: parsed.postId,
  };
}

export async function handleFailure(
  admin: any, business_id: string, job_id: string,
  args: { message: string; httpStatus?: number; phase: "preflight" | "transport" | "response"; attempt: number },
) {
  const outcome = classifySubmissionOutcome({ phase: args.phase, httpStatus: args.httpStatus, message: args.message });

  if (outcome.ambiguous) {
    // Buffer may already have created the post. Keep the idempotency claim so
    // nothing auto-retries; reconciliation or the founder resolves it.
    await admin.from("social_publish_jobs").update({
      distribution_status: "submission_unknown",
      last_error: args.message,
      next_retry_at: null,
      dead_letter_reason: `ambiguous:${args.message}`,
      dead_lettered_at: new Date().toISOString(),
      external_execution_attempted: true,
      external_execution_at: new Date().toISOString(),
    }).eq("id", job_id);
    await audit(admin, {
      business_id, publish_job_id: job_id, action: "distribution_submission_unknown",
      error_message: args.message, provider_calls: 1,
      result_json: { phase: args.phase, http_status: args.httpStatus ?? null, requires_reconciliation: true },
    });
    return { job_id, ok: false, status: "submission_unknown", error: args.message, error_class: outcome.error_class };
  }

  const dead = outcome.error_class === "hard" || args.attempt >= MAX_ATTEMPTS;
  const next = !dead && outcome.error_class === "transient" ? computeNextRetryAt(args.attempt) : null;
  await admin.from("social_publish_jobs").update({
    distribution_status: dead ? "dead_letter" : "retrying",
    last_error: args.message,
    next_retry_at: next ? next.toISOString() : null,
    dead_letter_reason: dead ? `${outcome.error_class}:${args.message}` : null,
    dead_lettered_at: dead ? new Date().toISOString() : null,
    // Provably nothing was created, so releasing the key is safe.
    distribution_idempotency_key: null,
  }).eq("id", job_id);
  await audit(admin, {
    business_id, publish_job_id: job_id, action: dead ? "distribution_dead_letter" : "distribution_failed",
    error_message: args.message, result_json: { error_class: outcome.error_class, phase: args.phase, attempt: args.attempt, reason: outcome.reason },
  });
  return { job_id, ok: false, status: dead ? "dead_letter" : "retrying", error: args.message, error_class: outcome.error_class };
}
