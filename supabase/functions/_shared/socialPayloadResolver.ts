/**
 * Canonical server-side publish payload resolver.
 *
 * ONE resolver is used by preview, manual submit, retry and approval-driven
 * auto-dispatch, so what the founder previews is exactly what Buffer would
 * receive. Legacy jobs whose publish_payload only holds { source, source_id }
 * pointers are hydrated from the authoritative content / variant / calendar /
 * asset records. Nothing here regenerates or invents copy.
 */

import type { MediaAsset } from "./socialDistributionLogic.ts";

export interface ResolvedPayload {
  text: string;
  media: MediaAsset[];
  link_url: string | null;
  blockers: string[];
  sources: {
    content_item_id?: string | null;
    content_variant_id?: string | null;
    calendar_item_id?: string | null;
    asset_id?: string | null;
    approval_review_id?: string | null;
    hydrated_from: "snapshot" | "variant" | "content_item" | "calendar_item" | "none";
  };
}

/** Composes the final post text from approved fields only. */
export function composePostText(parts: {
  caption?: string | null;
  hook?: string | null;
  script?: string | null;
  title?: string | null;
  cta?: string | null;
  hashtags?: string | null;
}): string {
  const body = [parts.caption, parts.hook, parts.script, parts.title]
    .map((v) => (v ?? "").trim())
    .find((v) => v.length > 0) ?? "";
  const segments = [body];
  const cta = (parts.cta ?? "").trim();
  if (cta && !body.includes(cta)) segments.push(cta);
  const tags = (parts.hashtags ?? "").trim();
  if (tags && !body.includes(tags)) segments.push(tags);
  return segments.filter(Boolean).join("\n\n").trim();
}

const REVOKED_RIGHTS = ["revoked", "expired", "rejected", "blocked", "denied", "unknown"];

/** Rights / approval gate for a social_assets row. Never guesses. */
export function evaluateAssetRights(asset: any, business_id: string, now: Date = new Date()): string[] {
  if (!asset) return ["asset_not_found"];
  const blockers: string[] = [];
  if (asset.business_id && asset.business_id !== business_id) blockers.push("cross_business_asset");
  if (!asset.file_url) blockers.push("asset_missing_file_url");
  if (asset.approved_for_social === false) blockers.push("asset_not_approved_for_social");
  if (asset.public_use_allowed === false) blockers.push("asset_public_use_not_allowed");
  if (asset.commercial_use_allowed === false) blockers.push("asset_commercial_use_not_allowed");
  const rights = String(asset.rights_status ?? "").toLowerCase();
  if (rights && REVOKED_RIGHTS.includes(rights)) blockers.push("asset_rights_revoked");
  if (asset.rights_expiry_date) {
    const exp = new Date(`${asset.rights_expiry_date}T23:59:59Z`).getTime();
    if (!Number.isNaN(exp) && exp < now.getTime()) blockers.push("asset_rights_expired");
  }
  if (asset.consent_required === true && String(asset.consent_status ?? "").toLowerCase() !== "granted") {
    blockers.push("asset_consent_missing");
  }
  if (asset.is_test_data) blockers.push("asset_is_test_data");
  return blockers;
}

/** Maps a social_assets row into the distribution media asset shape. */
export function assetToMedia(asset: any): MediaAsset {
  return {
    url: String(asset.file_url),
    type: asset.asset_type ?? asset.asset_category ?? null,
    mime_type: asset.metadata?.mime_type ?? asset.metadata?.content_type ?? null,
    metadata: asset.metadata ?? null,
    title: asset.title ?? null,
  };
}

/** Authoritative approval verification against social_approval_reviews. */
export function evaluateApprovalReview(review: any, business_id: string): string[] {
  if (!review) return ["approval_review_missing"];
  const blockers: string[] = [];
  if (review.business_id !== business_id) blockers.push("cross_business_approval_review");
  if (String(review.review_status ?? "") !== "approved") blockers.push("approval_not_approved");
  if (!review.decided_at) blockers.push("approval_not_decided");
  if ((review.approval_blockers ?? []).length > 0) blockers.push("approval_blockers_present");
  const risk = String(review.risk_level ?? "").toLowerCase();
  if (risk === "high" || risk === "critical") blockers.push("approval_risk_too_high");
  if (review.is_test_data) blockers.push("approval_is_test_data");
  return blockers;
}

/** Re-checks the linked content record's live readiness state. */
export function evaluateContentReadiness(content: any, business_id: string): string[] {
  if (!content) return [];
  const blockers: string[] = [];
  if (content.business_id !== business_id) blockers.push("cross_business_content_item");
  if (content.publish_readiness && content.publish_readiness !== "approved_internal") {
    blockers.push(`content_publish_readiness_${content.publish_readiness}`);
  }
  if (content.compliance_status === "blocked") blockers.push("content_compliance_blocked");
  if (["failed", "rejected", "blocked"].includes(String(content.quality_status ?? ""))) {
    blockers.push("content_quality_failed");
  }
  if (["rejected", "paused", "blocked", "needs_edit", "needs_review", "draft"].includes(String(content.approval_status ?? ""))) {
    blockers.push(`content_approval_${content.approval_status}`);
  }
  if (content.is_test_data) blockers.push("content_is_test_data");
  return blockers;
}

export function evaluateVariantReadiness(variant: any, business_id: string): string[] {
  if (!variant) return [];
  const blockers: string[] = [];
  if (variant.business_id !== business_id) blockers.push("cross_business_variant");
  const st = String(variant.approval_status ?? "");
  if (st && !["approved", "approved_internal", "ready", "ready_for_queue"].includes(st)) {
    blockers.push(`variant_approval_${st}`);
  }
  if ((variant.approval_blockers ?? []).length > 0) blockers.push("variant_approval_blockers");
  if (variant.is_test_data) blockers.push("variant_is_test_data");
  return blockers;
}

export function evaluateCalendarReadiness(cal: any, business_id: string): string[] {
  if (!cal) return [];
  const blockers: string[] = [];
  if (cal.business_id !== business_id) blockers.push("cross_business_calendar_item");
  const ap = String(cal.approval_status ?? "");
  if (ap && !["approved", "approved_internal"].includes(ap)) blockers.push(`calendar_approval_${ap}`);
  if (cal.queue_readiness && cal.queue_readiness !== "ready_for_queue") {
    blockers.push(`calendar_queue_readiness_${cal.queue_readiness}`);
  }
  if (cal.compliance_status === "blocked") blockers.push("calendar_compliance_blocked");
  if (cal.is_test_data) blockers.push("calendar_is_test_data");
  return blockers;
}

async function fetchOne(admin: any, table: string, id: string | null | undefined) {
  if (!id) return null;
  const { data } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/** Recognised legacy publish_payload pointer sources -> authoritative table. */
const LEGACY_SOURCE_TABLES: Record<string, "social_content_items" | "social_content_variants" | "social_calendar_items"> = {
  content_item: "social_content_items",
  content_variant: "social_content_variants",
  calendar_item: "social_calendar_items",
};

/** HTTPS-only, non-local link validation. */
export function isValidLinkUrl(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) return false;
  if (parsed.hostname.startsWith("127.") || parsed.hostname === "0.0.0.0") return false;
  return true;
}

/**
 * Resolves the exact caption + media Buffer would receive for a job.
 * A stored snapshot (publish_payload.snapshot_version) supplies the text;
 * live readiness/rights are ALWAYS re-checked against current records.
 */
export async function resolveJobPayload(
  admin: any,
  business_id: string,
  job: any,
  now: Date = new Date(),
): Promise<ResolvedPayload> {
  const blockers: string[] = [];
  const payload = job.publish_payload ?? {};

  // True legacy rows may only carry { source, source_id } pointers.
  let pointerVariantId: string | null = null;
  let pointerContentId: string | null = null;
  let pointerCalendarId: string | null = null;
  const hasFk = !!(job.content_variant_id || job.content_item_id || job.calendar_item_id);
  const pointerSource = typeof payload.source === "string" ? payload.source : null;
  const pointerId = typeof payload.source_id === "string" ? payload.source_id : null;
  if (!hasFk && pointerSource) {
    const table = LEGACY_SOURCE_TABLES[pointerSource];
    if (!table || !pointerId) {
      blockers.push("unsupported_legacy_source");
    } else if (table === "social_content_variants") pointerVariantId = pointerId;
    else if (table === "social_content_items") pointerContentId = pointerId;
    else pointerCalendarId = pointerId;
  }

  const [variant, content, calendar] = await Promise.all([
    fetchOne(admin, "social_content_variants", job.content_variant_id ?? pointerVariantId),
    fetchOne(admin, "social_content_items", job.content_item_id ?? pointerContentId),
    fetchOne(admin, "social_calendar_items", job.calendar_item_id ?? pointerCalendarId),
  ]);

  blockers.push(...evaluateVariantReadiness(variant, business_id));
  blockers.push(...evaluateContentReadiness(content, business_id));
  blockers.push(...evaluateCalendarReadiness(calendar, business_id));

  const primary = variant ?? content;
  const hydrated_from: ResolvedPayload["sources"]["hydrated_from"] =
    payload.snapshot_version ? "snapshot" : variant ? "variant" : content ? "content_item" : calendar ? "calendar_item" : "none";

  let text = "";
  if (payload.snapshot_version && typeof payload.text === "string") {
    text = String(payload.text).trim();
  } else if (primary) {
    text = composePostText({
      caption: primary.caption,
      hook: primary.hook,
      script: primary.script ?? primary.script_text,
      title: primary.title,
      cta: primary.cta,
      hashtags: primary.hashtags,
    });
  }
  if (!text) blockers.push("empty_content");

  const link_url: string | null = (payload.snapshot_version ? payload.link_url : null)
    ?? variant?.link_url ?? content?.link_url ?? null;

  // For snapshot jobs the snapshot's own asset reference wins, so media is
  // never silently lost when the live content row no longer exposes asset_id.
  const asset_id = payload.snapshot_version
    ? (payload.asset_id ?? variant?.asset_id ?? content?.asset_id ?? calendar?.asset_id ?? null)
    : (variant?.asset_id ?? content?.asset_id ?? calendar?.asset_id ?? payload.asset_id ?? null);
  const media: MediaAsset[] = [];
  if (asset_id) {
    const asset = await fetchOne(admin, "social_assets", asset_id);
    const rightsBlockers = evaluateAssetRights(asset, business_id, now);
    if (rightsBlockers.length) blockers.push(...rightsBlockers);
    else media.push(assetToMedia(asset));
  } else if (payload.snapshot_version && Array.isArray(payload.media) && payload.media.length > 0) {
    blockers.push("snapshot_asset_reference_missing");
  }

  // Link handling must be truthful: never silently drop an unusable or
  // unsupported link attachment.
  if (typeof link_url === "string" && link_url.trim()) {
    if (!isValidLinkUrl(link_url.trim())) blockers.push("invalid_link_url");
    else if (media.length > 0) blockers.push("mixed_link_and_media_unsupported");
  }

  return {
    text,
    media,
    link_url: link_url ?? null,
    blockers: Array.from(new Set(blockers)),
    sources: {
      content_item_id: job.content_item_id ?? pointerContentId ?? null,
      content_variant_id: job.content_variant_id ?? pointerVariantId ?? null,
      calendar_item_id: job.calendar_item_id ?? pointerCalendarId ?? null,
      asset_id,
      approval_review_id: job.approval_review_id ?? null,
      hydrated_from,
    },
  };
}

/** Authoritative approval check shared by preview, manual and auto dispatch. */
export async function resolveApproval(
  admin: any,
  business_id: string,
  job: any,
): Promise<{ approved: boolean; blockers: string[] }> {
  if (!job.approval_review_id) return { approved: false, blockers: ["approval_review_missing"] };
  const review = await fetchOne(admin, "social_approval_reviews", job.approval_review_id);
  const blockers = evaluateApprovalReview(review, business_id);
  return { approved: blockers.length === 0, blockers };
}

/** Immutable snapshot stored when a publish job is created. */
export function buildPayloadSnapshot(args: {
  text: string;
  media: MediaAsset[];
  link_url?: string | null;
  source: string;
  source_id: string;
  asset_id?: string | null;
}): Record<string, unknown> {
  return {
    snapshot_version: 1,
    snapshot_at: new Date().toISOString(),
    text: args.text,
    media: args.media,
    link_url: args.link_url ?? null,
    asset_id: args.asset_id ?? null,
    source: args.source,
    source_id: args.source_id,
  };
}
