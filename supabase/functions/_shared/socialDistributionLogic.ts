/**
 * Social Distribution Fabric - pure, provider-agnostic logic.
 *
 * Deno-compatible plain TypeScript with no runtime imports, so the same file
 * is used by the edge functions AND by the vitest suite (single source of
 * truth, no drift).
 */

export type PolicyMode =
  | "test"
  | "approval_required"
  | "draft_to_buffer"
  | "approved_batch_autopilot"
  | "paused";

/** Per-channel distribution mode. Every mapping starts at OFF. */
export type ChannelDispatchMode = "OFF" | "DRAFT_TO_BUFFER" | "AUTO_SCHEDULE";

export const CHANNEL_DISPATCH_MODES: ChannelDispatchMode[] = ["OFF", "DRAFT_TO_BUFFER", "AUTO_SCHEDULE"];

export function normaliseDispatchMode(value?: string | null): ChannelDispatchMode {
  const v = String(value ?? "").trim().toUpperCase();
  return (CHANNEL_DISPATCH_MODES as string[]).includes(v) ? (v as ChannelDispatchMode) : "OFF";
}

export const POLICY_MODES: PolicyMode[] = [
  "test",
  "approval_required",
  "draft_to_buffer",
  "approved_batch_autopilot",
  "paused",
];

/**
 * Effective per-job mode. A `draft_to_buffer` business policy forces every
 * mapped channel to the draft path (it can never publish or schedule), while
 * OFF channels stay OFF. Any other policy defers to the channel mode.
 */
export function resolveEffectiveDispatchMode(
  policy_mode: PolicyMode | string,
  channel_mode?: string | null,
): ChannelDispatchMode {
  const channel = normaliseDispatchMode(channel_mode);
  if (channel === "OFF") return "OFF";
  if (policy_mode === "draft_to_buffer") return "DRAFT_TO_BUFFER";
  return channel;
}

export type DistributionStatus =
  | "not_submitted"
  | "blocked"
  | "ready"
  | "submitting"
  | "scheduled"
  | "sent"
  | "draft_in_provider"
  | "failed"
  | "retrying"
  | "dead_letter"
  | "submission_unknown";

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
  /** Per-channel mode from social_business_channel_map.dispatch_mode. */
  dispatch_mode?: ChannelDispatchMode | string | null;
  paused: boolean;
  text: string;
  media_urls?: Array<string | MediaAsset>;
  now?: Date;
  share_now?: boolean;
}

export interface Eligibility {
  eligible: boolean;
  blockers: string[];
}

/* ------------------------------------------------------------------ */
/* Media assets (Buffer current union format)                          */
/* ------------------------------------------------------------------ */

export interface MediaAsset {
  url: string;
  /** Explicit asset type from the source record, when present. */
  type?: string | null;
  mime_type?: string | null;
  metadata?: Record<string, unknown> | null;
  title?: string | null;
}

export type AssetKind = "image" | "video" | "document" | "link" | "unknown";

const EXPLICIT_TYPES: Record<string, AssetKind> = {
  image: "image", photo: "image", gif: "image",
  video: "video",
  document: "document", pdf: "document",
  link: "link", url: "link",
};

const EXTENSION_TYPES: Record<string, AssetKind> = {
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", heic: "image",
  mp4: "video", mov: "video", m4v: "video", webm: "video",
  pdf: "document",
};

export function normaliseAsset(input: string | MediaAsset): MediaAsset {
  return typeof input === "string" ? { url: input } : { ...input };
}

/**
 * Determines the asset kind from explicit type, MIME type, then file
 * extension only. Anything else is "unknown" and must block the job -
 * we never guess and never submit a broken asset.
 */
export function classifyAssetKind(asset: MediaAsset): AssetKind {
  const explicit = (asset.type ?? "").trim().toLowerCase();
  if (explicit && EXPLICIT_TYPES[explicit]) return EXPLICIT_TYPES[explicit];

  const mime = (asset.mime_type ?? "").trim().toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  if (mime) return "unknown";

  let path = "";
  try { path = new URL(asset.url).pathname.toLowerCase(); } catch { return "unknown"; }
  const ext = path.includes(".") ? path.split(".").pop()! : "";
  return EXTENSION_TYPES[ext] ?? "unknown";
}

/** Builds the ordered Buffer assets union list, preserving media metadata. */
export function buildAssets(inputs: Array<string | MediaAsset>): {
  assets: Array<Record<string, unknown>>;
  blockers: string[];
} {
  const assets: Array<Record<string, unknown>> = [];
  const blockers: string[] = [];
  for (const raw of inputs) {
    const asset = normaliseAsset(raw);
    if (!isDurableMediaUrl(asset.url)) {
      if (!blockers.includes("invalid_media_url")) blockers.push("invalid_media_url");
      continue;
    }
    const kind = classifyAssetKind(asset);
    if (kind === "unknown") {
      if (!blockers.includes("unsupported_media_type")) blockers.push("unsupported_media_type");
      continue;
    }
    if (kind === "image") assets.push({ image: { url: asset.url } });
    else if (kind === "video") {
      assets.push({
        video: asset.metadata ? { url: asset.url, metadata: asset.metadata } : { url: asset.url },
      });
    } else if (kind === "document") {
      assets.push({ document: asset.title ? { url: asset.url, title: asset.title } : { url: asset.url } });
    } else {
      assets.push({ link: asset.title ? { url: asset.url, title: asset.title } : { url: asset.url } });
    }
  }
  return { assets, blockers };
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
  // Signed / expiring URLs are never durable: Buffer fetches media later and a
  // short-lived signature would break the post. Block instead of silently
  // degrading to a text-only post.
  const SIGNED_PARAMS = [
    "x-amz-signature", "x-amz-expires", "x-amz-credential",
    "x-goog-signature", "x-goog-expires",
    "signature", "sig", "token", "expires", "se", "sp", "sv",
  ];
  for (const [key] of parsed.searchParams.entries()) {
    if (SIGNED_PARAMS.includes(key.toLowerCase())) return false;
  }
  // Supabase Storage signed-object URLs.
  if (parsed.pathname.includes("/object/sign/")) return false;
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
    // `undefined` means the caller did not supply a mapping mode (legacy call
    // sites / pure evaluations). Any supplied value is enforced strictly and
    // anything unrecognised collapses to OFF.
    if (ctx.dispatch_mode !== undefined && normaliseDispatchMode(ctx.dispatch_mode) === "OFF") {
      blockers.push("channel_mode_off");
    }
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

  for (const b of buildAssets(ctx.media_urls ?? []).blockers) blockers.push(b);

  if (ctx.job.provider_post_id) blockers.push("already_submitted");
  if (ctx.job.distribution_status === "dead_letter") blockers.push("dead_letter");

  return { eligible: blockers.length === 0, blockers };
}

/**
 * Buffer CreatePostInput builder.
 * organizationId is intentionally NOT included - it is used only for
 * organisation/channel discovery and querying.
 */
export function buildCreatePostInput(args: {
  channelId: string;
  text: string;
  dueAt?: string | null;
  shareNow?: boolean;
  mediaUrls?: Array<string | MediaAsset>;
  linkAttachment?: { url: string; title?: string } | null;
  /** DRAFT_TO_BUFFER creates a Buffer draft instead of a queued post. */
  saveToDraft?: boolean;
}): Record<string, unknown> {
  const { assets } = buildAssets(args.mediaUrls ?? []);

  const input: Record<string, unknown> = {
    channelId: args.channelId,
    text: args.text,
    schedulingType: "automatic",
  };

  if (args.saveToDraft) input.saveToDraft = true;

  if (args.shareNow) {
    input.mode = "shareNow";
  } else {
    input.mode = "customScheduled";
    input.dueAt = args.dueAt;
  }

  if (assets.length > 0) {
    input.assets = assets;
    // Never mix a link attachment with image/video/document assets.
  } else if (args.linkAttachment?.url && isDurableMediaUrl(args.linkAttachment.url)) {
    input.assets = [{
      link: args.linkAttachment.title
        ? { url: args.linkAttachment.url, title: args.linkAttachment.title }
        : { url: args.linkAttachment.url },
    }];
  }

  return input;
}

/* ------------------------------------------------------------------ */
/* Automatic dispatcher: due-job selection                             */
/* ------------------------------------------------------------------ */

/** How far ahead of dueAt a job is handed to Buffer for scheduling. */
export const DISPATCH_LOOKAHEAD_MS = 60 * 60 * 1000;

export interface DueJobCandidate {
  id: string;
  scheduled_for?: string | null;
  distribution_status?: string | null;
  provider_post_id?: string | null;
  next_retry_at?: string | null;
}

/**
 * Pure selection of jobs the automatic dispatcher may attempt.
 * - fresh jobs whose scheduled time falls inside the lookahead window
 * - retrying jobs whose backoff has elapsed
 * Anything already submitted, ambiguous or dead-lettered is never selected.
 */
export function selectDueJobs<T extends DueJobCandidate>(
  jobs: T[],
  now: Date = new Date(),
  limit = 25,
): T[] {
  const horizon = now.getTime() + DISPATCH_LOOKAHEAD_MS;
  const eligible = jobs.filter((j) => {
    if (j.provider_post_id) return false;
    const status = j.distribution_status ?? "not_submitted";
    if (["scheduled", "sent", "submitting", "dead_letter", "submission_unknown"].includes(status)) return false;
    if (status === "retrying") {
      if (!j.next_retry_at) return false;
      return new Date(j.next_retry_at).getTime() <= now.getTime();
    }
    if (!j.scheduled_for) return false;
    const due = new Date(j.scheduled_for).getTime();
    if (Number.isNaN(due)) return false;
    return due <= horizon;
  });
  eligible.sort((a, b) =>
    new Date(a.scheduled_for ?? 0).getTime() - new Date(b.scheduled_for ?? 0).getTime());
  return eligible.slice(0, Math.max(0, limit));
}

/* ------------------------------------------------------------------ */
/* Truthful distribution health state machine                          */
/* ------------------------------------------------------------------ */

export type DistributionHealthState =
  | "NOT_CONFIGURED"
  | "CONNECTED"
  | "MAPPED"
  | "ARMED"
  | "LIVE"
  | "DEGRADED"
  | "BLOCKED";

export interface DistributionHealthInput {
  secrets_present: boolean;
  organization_id_present: boolean;
  connection_ok: boolean;
  mapped_channels: number;
  auto_schedule_channels: number;
  gate_unlocked: boolean;
  policy_mode: PolicyMode | string;
  paused: boolean;
  /** Last successful dispatcher heartbeat, if any. */
  last_dispatch_run_at?: string | null;
  last_dispatch_failed?: boolean;
  dispatcher_schedule_registered: boolean;
  /** Last unattended maintenance (retry + reconcile) heartbeat, if any. */
  last_maintenance_run_at?: string | null;
  maintenance_schedule_registered?: boolean;
  failed_jobs?: number;
  now?: Date;
}

export interface DistributionHealth {
  state: DistributionHealthState;
  reason: string;
  detail: string;
  dispatcher: "LIVE" | "STALE" | "CONFIGURATION_REQUIRED" | "FAILING";
  maintenance: "LIVE" | "STALE" | "CONFIGURATION_REQUIRED";
}

/** Dispatcher is considered healthy if it reported within this window. */
export const DISPATCH_HEARTBEAT_STALE_MS = 30 * 60 * 1000;

export function computeDistributionHealth(i: DistributionHealthInput): DistributionHealth {
  const now = i.now ?? new Date();
  const lastRun = i.last_dispatch_run_at ? new Date(i.last_dispatch_run_at).getTime() : null;
  const fresh = lastRun !== null && now.getTime() - lastRun <= DISPATCH_HEARTBEAT_STALE_MS;

  const dispatcher: DistributionHealth["dispatcher"] =
    !i.dispatcher_schedule_registered ? "CONFIGURATION_REQUIRED"
      : i.last_dispatch_failed ? "FAILING"
      : fresh ? "LIVE"
      : "STALE";

  const lastMaint = i.last_maintenance_run_at ? new Date(i.last_maintenance_run_at).getTime() : null;
  const maintFresh = lastMaint !== null && now.getTime() - lastMaint <= DISPATCH_HEARTBEAT_STALE_MS;
  const maintenance: DistributionHealth["maintenance"] =
    !i.maintenance_schedule_registered ? "CONFIGURATION_REQUIRED" : maintFresh ? "LIVE" : "STALE";

  if (i.paused) {
    return { state: "BLOCKED", reason: "emergency_pause_active", detail: "Kill switch engaged — no provider calls are made. Queued content is untouched.", dispatcher, maintenance };
  }
  if (!i.secrets_present) {
    return { state: "NOT_CONFIGURED", reason: "buffer_secrets_missing", detail: "BUFFER_API_KEY is not set (BUFFER_ORGANIZATION_ID is an optional fallback).", dispatcher, maintenance };
  }
  if (!i.connection_ok || !i.organization_id_present) {
    return { state: "NOT_CONFIGURED", reason: "provider_not_connected", detail: "Buffer connection has not been tested and an organisation selected.", dispatcher, maintenance };
  }
  if (i.mapped_channels === 0) {
    return { state: "CONNECTED", reason: "no_channels_mapped", detail: "Buffer is reachable. Map at least one channel to this business.", dispatcher, maintenance };
  }
  if (!i.gate_unlocked || i.policy_mode === "test" || i.policy_mode === "paused") {
    return { state: "MAPPED", reason: !i.gate_unlocked ? "execution_gate_locked" : `policy_${i.policy_mode}`, detail: "Channels mapped. Arm the execution gate and leave test mode to allow provider calls.", dispatcher, maintenance };
  }
  if (i.policy_mode === "draft_to_buffer") {
    return {
      state: "ARMED",
      reason: "draft_to_buffer_mode",
      detail: "Approved posts are handed to Buffer as DRAFTS only — nothing is scheduled or published.",
      dispatcher, maintenance,
    };
  }
  if (i.auto_schedule_channels === 0) {
    return { state: "ARMED", reason: "no_auto_schedule_channels", detail: "Armed, but every channel is OFF or DRAFT_TO_BUFFER — nothing auto-schedules.", dispatcher, maintenance };
  }
  if (dispatcher === "CONFIGURATION_REQUIRED") {
    return { state: "ARMED", reason: "dispatcher_schedule_missing", detail: "CONFIGURATION REQUIRED — the 5-minute dispatcher cron hook is not registered.", dispatcher, maintenance };
  }
  if (maintenance === "CONFIGURATION_REQUIRED") {
    return { state: "ARMED", reason: "maintenance_schedule_missing", detail: "CONFIGURATION REQUIRED — SOCIAL_DISPATCH_CRON_REGISTERED is not true / the maintenance cron hook is not registered.", dispatcher, maintenance };
  }
  if (dispatcher === "FAILING" || (i.failed_jobs ?? 0) > 0) {
    return { state: "DEGRADED", reason: dispatcher === "FAILING" ? "dispatcher_run_failed" : "failed_jobs_present", detail: "Distribution is live but the last run or some jobs failed.", dispatcher, maintenance };
  }
  if (dispatcher === "STALE" || maintenance === "STALE") {
    return {
      state: "DEGRADED",
      reason: dispatcher === "STALE" ? "dispatcher_heartbeat_stale" : "maintenance_heartbeat_stale",
      detail: "No scheduled heartbeat in the last 30 minutes.",
      dispatcher, maintenance,
    };
  }
  return { state: "LIVE", reason: "ok", detail: "Approved jobs are being scheduled to Buffer automatically and maintained unattended.", dispatcher, maintenance };
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
    scheduled: 0, sent: 0, draft_in_provider: 0, failed: 0, retrying: 0, dead_letter: 0, submission_unknown: 0,
  };
  for (const j of jobs) {
    const k = j.distribution_status ?? "not_submitted";
    totals[k] = (totals[k] ?? 0) + 1;
  }
  return totals;
}

/** Parses Buffer's current posts connection shape. Never invents a status. */
export function parsePostsConnection(
  data: any,
): Array<{ id: string; status?: string | null; dueAt?: string | null; channelId?: string | null }> {
  const edges = data?.posts?.edges;
  if (!Array.isArray(edges)) return [];
  return edges
    .map((e: any) => e?.node)
    .filter((n: any) => n?.id)
    .map((n: any) => ({
      id: String(n.id),
      status: n.status ?? null,
      dueAt: n.dueAt ?? null,
      channelId: n.channelId ?? null,
    }));
}

/** Relay page info for bounded reconciliation paging. */
export function parsePostsPageInfo(data: any): { hasNextPage: boolean; endCursor: string | null } {
  const pi = data?.posts?.pageInfo;
  return { hasNextPage: !!pi?.hasNextPage, endCursor: pi?.endCursor ?? null };
}

/** Pure policy gate for approval-driven auto-dispatch. */
export function shouldAutoDispatch(
  policyMode: string,
  paused: boolean,
): { go: boolean; reason?: string; mode?: "schedule" | "draft" } {
  if (paused) return { go: false, reason: "emergency_pause_active" };
  if (policyMode === "draft_to_buffer") return { go: true, mode: "draft" };
  if (policyMode !== "approved_batch_autopilot") return { go: false, reason: `policy_${policyMode}` };
  return { go: true, mode: "schedule" };
}

/* ------------------------------------------------------------------ */
/* Submission outcome classification (duplicate-post safety)           */
/* ------------------------------------------------------------------ */

/**
 * Where a failure happened relative to the provider mutation.
 * - preflight: we never transmitted a request (missing key, bad input)
 * - transport: request may or may not have reached/been applied by Buffer
 * - response:  Buffer answered, so the outcome is knowable from the response
 */
export type FailurePhase = "preflight" | "transport" | "response";

export interface SubmissionOutcome {
  /** Safe to release the idempotency claim and retry automatically. */
  retry_safe: boolean;
  /** Buffer may already have created the post - never auto-retry. */
  ambiguous: boolean;
  error_class: ErrorClass;
  reason: string;
}

export function classifySubmissionOutcome(args: {
  phase: FailurePhase;
  httpStatus?: number;
  message?: string;
}): SubmissionOutcome {
  const message = args.message ?? "provider_error";
  if (args.phase === "preflight") {
    return { retry_safe: true, ambiguous: false, error_class: "hard", reason: message };
  }
  if (args.phase === "transport") {
    // Connection loss / timeout after the request left us: Buffer may have
    // accepted the post. Never auto-retry - reconcile or founder review.
    return { retry_safe: false, ambiguous: true, error_class: "transient", reason: "submission_unknown" };
  }
  // Provider responded.
  if (args.httpStatus === 429) {
    return { retry_safe: true, ambiguous: false, error_class: "transient", reason: "rate_limited" };
  }
  if (args.httpStatus && args.httpStatus >= 500) {
    // A 5xx can still have mutated state server-side.
    return { retry_safe: false, ambiguous: true, error_class: "transient", reason: "submission_unknown" };
  }
  if (args.httpStatus && args.httpStatus >= 400) {
    return { retry_safe: true, ambiguous: false, error_class: "hard", reason: message };
  }
  // GraphQL-level error with a 200: the mutation was rejected, nothing created.
  return { retry_safe: true, ambiguous: false, error_class: classifyProviderError(message, args.httpStatus), reason: message };
}

/* ------------------------------------------------------------------ */
/* Reconciliation status mapping (explicit allowlist only)             */
/* ------------------------------------------------------------------ */

const PROVIDER_STATUS_MAP: Record<string, DistributionStatus> = {
  // Published
  sent: "sent",
  published: "sent",
  // Waiting in Buffer (queued/scheduled)
  scheduled: "scheduled",
  buffer: "scheduled",
  queued: "scheduled",
  pending: "scheduled",
  // Provider-side draft
  draft: "draft_in_provider",
  drafts: "draft_in_provider",
  // Provider-side failure
  error: "failed",
  failed: "failed",
};

/** Returns null for any unproven/unmapped provider status - never infers. */
export function mapProviderStatus(status?: string | null): DistributionStatus | null {
  const key = String(status ?? "").trim().toLowerCase();
  if (!key) return null;
  return PROVIDER_STATUS_MAP[key] ?? null;
}

/* ------------------------------------------------------------------ */
/* Unattended maintenance selection (bounded, retry-safe only)         */
/* ------------------------------------------------------------------ */

export interface MaintenanceJobCandidate {
  id: string;
  distribution_status?: string | null;
  next_retry_at?: string | null;
  provider_post_id?: string | null;
}

/**
 * Retry-safe jobs whose backoff has elapsed.
 * `submission_unknown` is NEVER selected — Buffer may already hold the post.
 */
export function selectRetryDueJobs<T extends MaintenanceJobCandidate>(
  jobs: T[],
  now: Date = new Date(),
  limit = 25,
): T[] {
  return jobs
    .filter((j) => {
      if (j.provider_post_id) return false;
      if ((j.distribution_status ?? "") !== "retrying") return false;
      if (!j.next_retry_at) return false;
      const t = new Date(j.next_retry_at).getTime();
      return !Number.isNaN(t) && t <= now.getTime();
    })
    .sort((a, b) => new Date(a.next_retry_at ?? 0).getTime() - new Date(b.next_retry_at ?? 0).getTime())
    .slice(0, Math.max(0, limit));
}

/** Bounded set of provider-side jobs worth reconciling. */
export function selectReconcileCandidates<T extends MaintenanceJobCandidate>(
  jobs: T[],
  limit = 100,
): T[] {
  const wanted = ["scheduled", "draft_in_provider", "submission_unknown", "submitting"];
  return jobs
    .filter((j) => !!j.provider_post_id && wanted.includes(j.distribution_status ?? ""))
    .slice(0, Math.max(0, limit));
}
