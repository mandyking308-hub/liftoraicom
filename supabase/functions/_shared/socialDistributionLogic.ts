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
}): Record<string, unknown> {
  const { assets } = buildAssets(args.mediaUrls ?? []);

  const input: Record<string, unknown> = {
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
