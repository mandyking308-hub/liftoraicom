export function makeIdempotencyKey(parts: Array<string | undefined | null>): string {
  const joined = parts.map((p) => p ?? "_").join("|");
  // Simple deterministic hash via SubtleCrypto-free fallback
  let h = 0;
  for (let i = 0; i < joined.length; i++) h = ((h << 5) - h + joined.charCodeAt(i)) | 0;
  return `idem_${Math.abs(h).toString(36)}_${joined.length.toString(36)}`;
}

export type EligibilityCheck = {
  eligible: boolean;
  blockers: string[];
  source: "content_item" | "calendar_item";
  source_id: string;
  business_id: string;
  platform?: string | null;
  provider?: string | null;
  scheduled_for?: string | null;
  content_item_id?: string | null;
  calendar_item_id?: string | null;
  content_variant_id?: string | null;
  campaign_plan_id?: string | null;
  content_pack_id?: string | null;
  approval_review_id?: string | null;
  job_type: string;
  provider_capability_required?: string | null;
  reason_summary?: string;
};

function inferCapability(platform: string | null | undefined, contentType: string | null | undefined): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("reel")) return "can_publish_reels";
  if (ct.includes("short")) return "can_publish_shorts";
  if (ct.includes("story")) return "can_publish_stories";
  if (ct.includes("carousel")) return "can_publish_carousels";
  return "can_publish_posts";
}

export function evaluateContentItem(row: any): EligibilityCheck {
  const blockers: string[] = [];
  if (!row.business_id) blockers.push("missing_business_id");
  if (!row.platform) blockers.push("missing_platform");
  if (!row.provider) blockers.push("missing_provider");
  if (!row.caption && !row.script && !row.hook && !row.title) blockers.push("missing_body");
  if (row.publish_readiness && row.publish_readiness !== "approved_internal") blockers.push(`publish_readiness_${row.publish_readiness}`);
  if (row.compliance_status === "blocked") blockers.push("compliance_blocked");
  if (row.asset_readiness_status === "missing_required") blockers.push("asset_missing");
  if (row.approval_status && ["rejected","paused","blocked","needs_edit","needs_review","draft"].includes(row.approval_status)) {
    blockers.push(`approval_${row.approval_status}`);
  }
  if (row.calendar_status === "rescheduled_pending" || row.calendar_status === "cancelled") {
    blockers.push(`calendar_${row.calendar_status}`);
  }
  const capability = inferCapability(row.platform, row.content_type);
  return {
    eligible: blockers.length === 0,
    blockers,
    source: "content_item",
    source_id: row.id,
    business_id: row.business_id,
    platform: row.platform,
    provider: row.provider,
    scheduled_for: row.planned_at || (row.scheduled_date ? `${row.scheduled_date}T${row.scheduled_time || "09:00:00"}Z` : null),
    content_item_id: row.id,
    calendar_item_id: row.calendar_item_id || null,
    campaign_plan_id: row.campaign_plan_id || null,
    content_pack_id: row.pack_id || null,
    approval_review_id: row.founder_approval_review_id || null,
    job_type: row.content_type || "post",
    provider_capability_required: capability,
  };
}

export function evaluateCalendarItem(row: any, contentRow: any | null): EligibilityCheck {
  const blockers: string[] = [];
  if (!row.business_id) blockers.push("missing_business_id");
  if (!row.platform) blockers.push("missing_platform");
  if (!row.provider) blockers.push("missing_provider");
  if (row.queue_readiness && row.queue_readiness !== "ready_for_queue") blockers.push(`queue_readiness_${row.queue_readiness}`);
  if (row.approval_status && row.approval_status !== "approved_internal") blockers.push(`calendar_approval_${row.approval_status}`);
  if (row.compliance_status === "blocked") blockers.push("compliance_blocked");
  if (row.asset_status === "missing_required") blockers.push("asset_missing");
  if (contentRow) {
    const sub = evaluateContentItem(contentRow);
    blockers.push(...sub.blockers.map((b) => `content:${b}`));
  }
  const capability = inferCapability(row.platform, contentRow?.content_type);
  return {
    eligible: blockers.length === 0,
    blockers,
    source: "calendar_item",
    source_id: row.id,
    business_id: row.business_id,
    platform: row.platform,
    provider: row.provider,
    scheduled_for: row.planned_date ? `${row.planned_date}T${row.planned_time || "09:00:00"}Z` : null,
    content_item_id: row.content_item_id || contentRow?.id || null,
    calendar_item_id: row.id,
    content_variant_id: row.content_variant_id || null,
    campaign_plan_id: row.campaign_plan_id || null,
    content_pack_id: row.content_pack_id || null,
    approval_review_id: row.founder_approval_review_id || null,
    job_type: contentRow?.content_type || "post",
    provider_capability_required: capability,
  };
}

export function buildJobIdempotencyKey(e: EligibilityCheck): string {
  return makeIdempotencyKey([
    e.business_id,
    e.content_item_id || "",
    e.calendar_item_id || "",
    e.platform || "",
    e.provider || "",
    e.scheduled_for || "",
    e.job_type || "",
  ]);
}