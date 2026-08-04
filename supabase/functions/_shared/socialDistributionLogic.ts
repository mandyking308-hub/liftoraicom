/**
 * Social Distribution Fabric - pure, provider-agnostic logic.
 *
 * Deno-compatible plain TypeScript with no runtime imports, so the same file
 * is used by the edge functions AND by the vitest suite (single source of
 * truth, no drift).
 */

export type PolicyMode = "test" | "approval_required" | "approved_batch_autopilot" | "paused";

export const POLICY_MODES: PolicyMode[] = [
  "test",
  "approval_required",
  "approved_batch_autopilot",
  "paused",
];

export type DistributionStatus =
  | "not_submitted"
  | "blocked"
  | "ready"
  | "submitting"
  | "scheduled"
  | "sent"
  | "failed"
  | "retrying"
  | "dead_letter";

export interface ChannelRow {
  id: string;
  external_channel_id: string;
  service?: string | null;
  display_name?: string | null;
  is_queue_paused?: boolean | null;
  is_disconnected?: boolean | null;
  is_locked?: boolean | null;
}

export interface JobRow {
  id: string;
  business_id: string;
  platform?: string | null;
  provider?: string | null;
  status?: string | null;
  scheduled_for?: string | null;
  distribution_status?: string | null;
  provider_post_id?: string | null;
  attempt_count?: number | null;
  publish_payload?: Record<string, unknown> | null;
  founder_final_approval_required?: boolean | null;
  execution_gate_status?: string | null;
  is_test_data?: boolean | null;
}

export interface SubmissionContext {
  job: JobRow;
  business_id: string;
  channel?: ChannelRow | null;
  mapping_active?: boolean;
  mapping_business_id?: string | null;
  connection_present: boolean;
  connection_organization_id?: string | null;
  gate_unlocked: boolean;
  approved: boolean;
  policy_mode: PolicyMode;
  paused: boolean;
  text: string;
  media_urls?: string[];
  now?: Date;
  share_now?: boolean;
}

export interface Eligibility {
  eligible: boolean;
  blockers: string[];
}

const MIN_LEAD_MS = 60_000; // Buffer needs a future dueAt

export function isDurableMediaUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) return false;
  if (parsed.hostname.startsWith("127.") || parsed.hostname === "0.0.0.0") return false;
  const exp = parsed.searchParams.get("Expires") || parsed.searchParams.get("expires");
  if (exp && /^\d+$/.test(exp)) {
    const ms = exp.length <= 10 ? Number(exp) * 1000 : Number(exp);
    if (ms < Date.now()) return false;
  }
  return true;
}

/** Deterministic idempotency key - repeated clicks can never duplicate a post. */
export function buildDistributionIdempotencyKey(parts: {
  business_id: string;
  job_id: string;
  channel_id: string;
  scheduled_for?: string | null;
}): string {
  const joined = [
    parts.business_id,
    parts.job_id,
    parts.channel_id,
    parts.scheduled_for ?? "share_now",
  ].join("|");
  let h = 0;
  for (let i = 0; i < joined.length; i++) h = ((h << 5) - h + joined.charCodeAt(i)) | 0;
  return `dist_${Math.abs(h).toString(36)}_${joined.length.toString(36)}`;
}

export function evaluateSubmission(ctx: SubmissionContext): Eligibility {
  const blockers: string[] = [];
  const now = ctx.now ?? new Date();

  if (ctx.paused) blockers.push("emergency_pause_active");
  if (ctx.policy_mode === "paused") blockers.push("policy_paused");
  if (ctx.policy_mode === "test") blockers.push("policy_test_mode");
  if (!ctx.connection_present) blockers.push("provider_not_connected");
  if (!ctx.connection_organization_id) blockers.push("provider_organization_missing");
  if (!ctx.gate_unlocked) blockers.push("execution_gate_locked");
  if (!ctx.approved) blockers.push("not_approved");
  if (ctx.job.business_id !== ctx.business_id) blockers.push("business_mismatch");
  if (ctx.job.is_test_data) blockers.push("test_data_job");

  if (!ctx.channel) {
    blockers.push("channel_not_mapped");
  } else {
    if (ctx.mapping_active === false) blockers.push("channel_mapping_inactive");
    if (ctx.mapping_business_id && ctx.mapping_business_id !== ctx.business_id) {
      blockers.push("cross_business_channel_mapping");
    }
    if (ctx.channel.is_disconnected) blockers.push("channel_disconnected");
    if (ctx.channel.is_locked) blockers.push("channel_locked");
    if (ctx.channel.is_queue_paused) blockers.push("channel_queue_paused");
  }

  const text = (ctx.text || "").trim();
  if (!text) blockers.push("empty_content");
  if (text.length > 5000) blockers.push("content_too_long");

  if (!ctx.share_now) {
    if (!ctx.job.scheduled_for) {
      blockers.push("missing_scheduled_time");
    } else {
      const due = new Date(ctx.job.scheduled_for).getTime();
      if (Number.isNaN(due)) blockers.push("invalid_scheduled_time");
      else if (due <= now.getTime() + MIN_LEAD_MS) blockers.push("scheduled_time_in_past");
    }
  }

  for (const url of ctx.media_urls ?? []) {
    if (!isDurableMediaUrl(url)) {
      blockers.push("invalid_media_url");
      break;
    }
  }

  if (ctx.job.provider_post_id) blockers.push("already_submitted");
  if (ctx.job.distribution_status === "dead_letter") blockers.push("dead_letter");

  return { eligible: blockers.length === 0, blockers };
}

/** Buffer CreatePostInput builder (current assets array format). */
export function buildCreatePostInput(args: {
  organizationId: string;
  channelId: string;
  text: string;
  dueAt?: string | null;
  shareNow?: boolean;
  mediaUrls?: string[];
  linkAttachment?: { url: string; title?: string } | null;
}): Record<string, unknown> {
  const assets = (args.mediaUrls ?? []).filter(isDurableMediaUrl).map((url) => ({
    source: { url },
  }));

  const input: Record<string, unknown> = {
    organizationId: args.organizationId,
    channelId: args.channelId,
    text: args.text,
    schedulingType: "automatic",
  };

  if (args.shareNow) {
    input.mode = "shareNow";
  } else {
    input.mode = "customScheduled";
    input.dueAt = args.dueAt;
  }

  if (assets.length > 0) {
    input.assets = assets;
    // Never mix linkAttachment metadata with non-empty assets.
  } else if (args.linkAttachment?.url) {
    input.linkAttachment = args.linkAttachment;
  }

  return input;
}

export type ErrorClass = "transient" | "hard";

const HARD_CODES = [
  "unauthorized",
  "forbidden",
  "invalid",
  "validation",
  "not_found",
  "channel_disconnected",
  "channel_locked",
  "bad request",
  "unauthenticated",
];

export function classifyProviderError(message: string, httpStatus?: number): ErrorClass {
  if (httpStatus === 429) return "transient";
  if (httpStatus && httpStatus >= 500) return "transient";
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) return "hard";
  const m = (message || "").toLowerCase();
  if (HARD_CODES.some((c) => m.includes(c))) return "hard";
  if (m.includes("timeout") || m.includes("rate limit") || m.includes("temporar") || m.includes("network")) {
    return "transient";
  }
  return "transient";
}

export const MAX_ATTEMPTS = 5;

/** Exponential backoff with a 60s base, capped at 1h. */
export function computeNextRetryAt(attemptCount: number, from: Date = new Date()): Date | null {
  if (attemptCount >= MAX_ATTEMPTS) return null;
  const delayMs = Math.min(60_000 * Math.pow(2, Math.max(0, attemptCount - 1)), 3_600_000);
  return new Date(from.getTime() + delayMs);
}

export function summariseStatuses(jobs: Array<{ distribution_status?: string | null }>) {
  const totals: Record<string, number> = {
    blocked: 0, ready: 0, not_submitted: 0, submitting: 0,
    scheduled: 0, sent: 0, failed: 0, retrying: 0, dead_letter: 0,
  };
  for (const j of jobs) {
    const k = j.distribution_status ?? "not_submitted";
    totals[k] = (totals[k] ?? 0) + 1;
  }
  return totals;
}
