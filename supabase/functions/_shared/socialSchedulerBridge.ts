// Shared helpers for the Social Scheduler Bridge / Manual Export layer.
// Strictly internal — never call provider APIs.

export type ExportType =
  | "metricool_csv"
  | "buffer_csv"
  | "hootsuite_csv"
  | "generic_csv"
  | "operator_pack"
  | "manual_copy_pack"
  | "other";

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '""');
  return /[",]/.test(s) ? `"${s}"` : s;
}

export function metricoolHeaders(): string[] {
  return ["platform", "date", "time", "timezone", "text", "media_url", "link_url", "title", "notes", "content_id", "publish_job_id"];
}

export function genericHeaders(): string[] {
  return ["platform", "scheduled_at", "caption", "hashtags", "cta", "link_url", "media_url", "asset_reference", "campaign", "status", "notes"];
}

export function buildCsv(rows: any[], type: ExportType): string {
  const headers = type === "metricool_csv" ? metricoolHeaders() : genericHeaders();
  const lines = [headers.join(",")];
  for (const r of rows) {
    if (type === "metricool_csv") {
      lines.push([
        csvEscape(r.platform),
        csvEscape(r.scheduled_date),
        csvEscape(r.scheduled_time),
        csvEscape(r.timezone),
        csvEscape(r.caption),
        csvEscape(r.media_url),
        csvEscape(r.link_url),
        csvEscape(r.title),
        csvEscape(r.notes ?? ""),
        csvEscape(r.content_item_id),
        csvEscape(r.publish_job_id),
      ].join(","));
    } else {
      const scheduledAt = r.scheduled_date && r.scheduled_time ? `${r.scheduled_date}T${r.scheduled_time}` : (r.scheduled_date ?? "");
      lines.push([
        csvEscape(r.platform),
        csvEscape(scheduledAt),
        csvEscape(r.caption),
        csvEscape(r.hashtags),
        csvEscape(r.cta ?? ""),
        csvEscape(r.link_url),
        csvEscape(r.media_url),
        csvEscape(r.asset_id ?? ""),
        csvEscape(r.campaign ?? ""),
        csvEscape(r.row_status ?? ""),
        csvEscape(r.notes ?? ""),
      ].join(","));
    }
  }
  return lines.join("\n");
}

export function validateRow(row: any): { status: "passed" | "warning" | "failed"; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!row.platform) errors.push("missing_platform");
  if (!row.caption && !row.title) errors.push("missing_caption_or_title");
  if (!row.scheduled_date) warnings.push("missing_scheduled_date");
  if (!row.scheduled_time) warnings.push("missing_scheduled_time");
  if (!row.media_url && row.platform && ["instagram", "tiktok", "youtube"].includes(String(row.platform).toLowerCase())) {
    warnings.push("missing_media_for_visual_platform");
  }
  if (row.caption && String(row.caption).length > 2200) warnings.push("caption_long_for_some_platforms");
  const status = errors.length ? "failed" : warnings.length ? "warning" : "passed";
  return { status, errors, warnings };
}

export function eligibleJob(job: any): { eligible: boolean; reason?: string } {
  if (!job) return { eligible: false, reason: "missing_job" };
  if (job.status === "blocked" || job.status === "cancelled") return { eligible: false, reason: "job_blocked_or_cancelled" };
  const okStates = new Set(["queued", "provider_locked", "export_ready", "approved_internal", "ready"]);
  if (job.status && !okStates.has(job.status)) {
    // soft eligibility: allow if manual_export_status known
    if (!job.manual_export_status) return { eligible: false, reason: `job_status_${job.status}_not_eligible` };
  }
  return { eligible: true };
}

export function operatorChecklist(): any[] {
  return [
    { step: "open_export", label: "Open export / download CSV" },
    { step: "check_account", label: "Check the correct platform/account is selected in scheduler" },
    { step: "upload_media", label: "Upload media files manually" },
    { step: "paste_caption", label: "Paste caption text" },
    { step: "confirm_datetime", label: "Confirm date / time / timezone" },
    { step: "verify_link_cta", label: "Verify link and CTA" },
    { step: "confirm_in_scheduler", label: "Confirm post is scheduled inside scheduler" },
    { step: "mark_in_liftor", label: "Return to Liftor and mark as manually scheduled" },
  ];
}