import { supabase } from "@/integrations/supabase/client";

export type SopType = "sales"|"support"|"onboarding"|"delivery"|"finance"|"privacy"|"incident"|"refund"|"marketplace"|"seller_onboarding"|"legal"|"technical"|"weekly_review"|"other";
export type SopStatus = "draft"|"review_required"|"approved"|"retired";
export type VersionStatus = "draft"|"review_required"|"approved"|"superseded"|"retired";
export type UsageType = "prompt_context"|"checklist"|"rule_source"|"escalation"|"manual_reference";
export type ReviewReason = "scheduled"|"stale"|"conflict"|"incident"|"compliance"|"founder_request"|"module_change";
export type ReviewStatus = "pending"|"in_progress"|"approved"|"changes_needed"|"retired";
export type Severity = "low"|"medium"|"high"|"critical";
export type ResolutionStatus = "open"|"review_required"|"resolved"|"ignored";

export interface SopDocument {
  id: string; business_id: string|null; sop_name: string; sop_type: SopType;
  current_version_id: string|null; sop_status: SopStatus; owner: string|null;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface SopVersion {
  id: string; sop_id: string; version_number: number; version_status: VersionStatus;
  content_summary: string|null; content_body: string|null;
  approved_by: string|null; approved_at: string|null; effective_from: string|null;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface SopAgentUsage {
  id: string; sop_id: string; agent_key: string; business_id: string|null;
  usage_type: UsageType; active: boolean; created_at: string; updated_at: string;
}
export interface SopReviewTask {
  id: string; sop_id: string; review_reason: ReviewReason; review_status: ReviewStatus;
  due_at: string|null; assigned_to: string|null; created_at: string; updated_at: string;
}
export interface SopConflict {
  id: string; business_id: string|null; sop_a_id: string; sop_b_id: string;
  conflict_summary: string|null; severity: Severity; resolution_status: ResolutionStatus;
  created_at: string; updated_at: string;
}

export const SOP_TYPE_LABEL: Record<SopType,string> = {
  sales:"Sales", support:"Support", onboarding:"Onboarding", delivery:"Delivery",
  finance:"Finance", privacy:"Privacy", incident:"Incident", refund:"Refund",
  marketplace:"Marketplace", seller_onboarding:"Seller onboarding",
  legal:"Legal", technical:"Technical", weekly_review:"Weekly review", other:"Other",
};

export const STATUS_META: Record<SopStatus, { label: string; cls: string }> = {
  draft:            { label:"Draft",            cls:"bg-muted text-muted-foreground border-border/50" },
  review_required:  { label:"Review required",  cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved:         { label:"Approved",         cls:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  retired:          { label:"Retired",          cls:"bg-muted text-muted-foreground border-border/50" },
};

export const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  low:      { label:"Low",      cls:"bg-blue-500/15 text-blue-300 border-blue-500/30" },
  medium:   { label:"Medium",   cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  high:     { label:"High",     cls:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  critical: { label:"Critical", cls:"bg-red-500/15 text-red-300 border-red-500/30" },
};

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);

export async function fetchSops(): Promise<SopDocument[]> {
  const { data } = await (supabase as any).from("sop_documents").select("*").order("created_at",{ascending:false});
  return (data ?? []) as SopDocument[];
}
export async function fetchVersions(): Promise<SopVersion[]> {
  const { data } = await (supabase as any).from("sop_versions").select("*").order("created_at",{ascending:false});
  return (data ?? []) as SopVersion[];
}
export async function fetchUsage(): Promise<SopAgentUsage[]> {
  const { data } = await (supabase as any).from("sop_agent_usage").select("*").order("created_at",{ascending:false});
  return (data ?? []) as SopAgentUsage[];
}
export async function fetchReviews(): Promise<SopReviewTask[]> {
  const { data } = await (supabase as any).from("sop_review_tasks").select("*").order("due_at",{ascending:true});
  return (data ?? []) as SopReviewTask[];
}
export async function fetchConflicts(): Promise<SopConflict[]> {
  const { data } = await (supabase as any).from("sop_conflicts").select("*").order("created_at",{ascending:false});
  return (data ?? []) as SopConflict[];
}

export interface SopSummary {
  sops: number; approved: number; draft: number; review_required: number; retired: number;
  versions: number; approved_versions: number;
  reviews_pending: number; reviews_overdue: number;
  conflicts_open: number; conflicts_critical: number;
  agents_using: number; agents_using_unapproved: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: Severity } | null;
}

export function summarize(
  sops: SopDocument[], versions: SopVersion[], reviews: SopReviewTask[],
  conflicts: SopConflict[], usage: SopAgentUsage[]
): SopSummary {
  const liveSops = sops.filter(s => !isTest(s.audit_metadata));
  const approved = liveSops.filter(s => s.sop_status === "approved").length;
  const draft = liveSops.filter(s => s.sop_status === "draft").length;
  const review_required = liveSops.filter(s => s.sop_status === "review_required").length;
  const retired = liveSops.filter(s => s.sop_status === "retired").length;

  const liveVersions = versions.filter(v => !isTest(v.audit_metadata));
  const approved_versions = liveVersions.filter(v => v.version_status === "approved").length;

  const now = Date.now();
  const reviews_pending = reviews.filter(r => r.review_status === "pending" || r.review_status === "in_progress").length;
  const reviews_overdue = reviews.filter(r => (r.review_status === "pending" || r.review_status === "in_progress") && r.due_at && new Date(r.due_at).getTime() < now).length;

  const conflicts_open = conflicts.filter(c => c.resolution_status === "open" || c.resolution_status === "review_required").length;
  const conflicts_critical = conflicts.filter(c => (c.resolution_status === "open" || c.resolution_status === "review_required") && c.severity === "critical").length;

  const approvedIds = new Set(liveSops.filter(s => s.sop_status === "approved").map(s => s.id));
  const activeUsage = usage.filter(u => u.active);
  const agents_using = new Set(activeUsage.map(u => u.agent_key)).size;
  const agents_using_unapproved = activeUsage.filter(u => !approvedIds.has(u.sop_id)).length;

  const test = sops.filter(s => isTest(s.audit_metadata)).length
    + versions.filter(v => isTest(v.audit_metadata)).length;

  let top: SopSummary["top_alert"] = null;
  if (conflicts_critical > 0) top = { kind:"conflict", summary:`${conflicts_critical} critical SOP conflict(s) open`, severity:"critical" };
  else if (reviews_overdue > 0) top = { kind:"overdue", summary:`${reviews_overdue} review task(s) overdue`, severity:"high" };
  else if (agents_using_unapproved > 0) top = { kind:"unapproved_usage", summary:`${agents_using_unapproved} agent reference(s) point at non-approved SOPs`, severity:"high" };
  else if (conflicts_open > 0) top = { kind:"conflict_open", summary:`${conflicts_open} SOP conflict(s) open`, severity:"medium" };
  else if (reviews_pending > 0) top = { kind:"pending", summary:`${reviews_pending} review task(s) pending`, severity:"low" };

  return {
    sops: liveSops.length, approved, draft, review_required, retired,
    versions: liveVersions.length, approved_versions,
    reviews_pending, reviews_overdue,
    conflicts_open, conflicts_critical,
    agents_using, agents_using_unapproved,
    test_records: test, top_alert: top,
  };
}

/** Detect duplicate-name SOPs in the same business as candidate conflicts (in-memory helper). */
export function detectNameConflicts(sops: SopDocument[]) {
  const seen = new Map<string, SopDocument[]>();
  for (const s of sops) {
    const key = `${s.business_id ?? "_"}::${s.sop_type}::${s.sop_name.trim().toLowerCase()}`;
    const arr = seen.get(key) ?? []; arr.push(s); seen.set(key, arr);
  }
  return [...seen.values()].filter(a => a.length > 1);
}