import { supabase } from "@/integrations/supabase/client";

export type JobCategory =
  | "daily" | "weekly" | "monthly" | "monitoring" | "reporting"
  | "ai_eval" | "finance" | "compliance" | "privacy" | "support"
  | "marketplace" | "system" | "other";

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "skipped";
export type FailureType = "timeout" | "provider" | "schema" | "permission" | "data" | "unknown";
export type Severity = "low" | "medium" | "high" | "critical";
export type FailureStatus = "open" | "acknowledged" | "resolved" | "ignored";

export interface JobDefinition {
  id: string;
  job_name: string;
  job_code: string;
  job_category: JobCategory;
  schedule_cron: string;
  timezone: string;
  owner_module: string | null;
  description: string | null;
  active: boolean;
  external_action_possible: boolean;
  external_action_allowed: boolean;
  founder_approval_required_for_external: boolean;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: string;
  job_definition_id: string;
  run_status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  output_summary: string | null;
  failure_reason: string | null;
  created_work_items_count: number;
  created_notifications_count: number;
  external_actions_attempted_count: number;
  external_actions_blocked_count: number;
  audit_metadata: any;
  created_at: string;
}

export interface JobFailure {
  id: string;
  job_definition_id: string;
  job_run_id: string | null;
  failure_type: FailureType;
  failure_summary: string | null;
  severity: Severity;
  recommended_action: string | null;
  status: FailureStatus;
  created_at: string;
  updated_at: string;
}

const T = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true || m?.tag === "LIVE_INTERNAL_TEST");

export async function fetchJobs(): Promise<JobDefinition[]> {
  const { data } = await (supabase as any)
    .from("scheduled_job_definitions").select("*").order("job_category").order("job_name");
  return (data ?? []) as JobDefinition[];
}
export async function fetchRuns(limit = 200): Promise<JobRun[]> {
  const { data } = await (supabase as any)
    .from("scheduled_job_runs").select("*")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as JobRun[];
}
export async function fetchFailures(): Promise<JobFailure[]> {
  const { data } = await (supabase as any)
    .from("scheduled_job_failures").select("*").order("created_at", { ascending: false });
  return (data ?? []) as JobFailure[];
}

export interface JobsSummary {
  jobs_total: number;
  jobs_active: number;
  jobs_inactive: number;
  jobs_failed_today: number;
  jobs_overdue: number;
  jobs_external_disabled: number;
  jobs_external_possible: number;
  open_failures: number;
  critical_failures: number;
  external_blocks_today: number;
  next_job_due: { code: string; name: string; in_minutes: number | null } | null;
  test_runs: number;
  recommended_action: string;
  top_alert: { kind: string; summary: string; severity: Severity } | null;
}

/** Naive next-due estimator. Parses simple `m h * * *` or `m h * * d` cron */
export function estimateNextDue(cron: string, tz = "Europe/London"): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [mStr, hStr, , , dowStr] = parts;
  const m = parseInt(mStr, 10);
  const h = parseInt(hStr, 10);
  if (isNaN(m) || isNaN(h)) return null;
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  if (dowStr && dowStr !== "*") {
    const target = parseInt(dowStr, 10);
    if (!isNaN(target)) {
      while (next.getDay() !== target) next.setDate(next.getDate() + 1);
    }
  }
  return next;
}

export function summarize(jobs: JobDefinition[], runs: JobRun[], failures: JobFailure[]): JobsSummary {
  const liveJobs = jobs;
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const failedToday = runs.filter(r =>
    r.run_status === "failed" && r.started_at && new Date(r.started_at).getTime() > dayAgo
  );
  const externalBlocksToday = runs
    .filter(r => r.started_at && new Date(r.started_at).getTime() > dayAgo)
    .reduce((a, r) => a + (r.external_actions_blocked_count || 0), 0);

  const lastRunByJob = new Map<string, JobRun>();
  for (const r of runs) {
    const cur = lastRunByJob.get(r.job_definition_id);
    if (!cur || new Date(r.started_at || r.created_at) > new Date(cur.started_at || cur.created_at)) {
      lastRunByJob.set(r.job_definition_id, r);
    }
  }

  // Overdue: active job whose next-due estimator says it should have fired >2h ago
  const now = Date.now();
  let overdue = 0;
  let nextDue: JobsSummary["next_job_due"] = null;
  let nextDueAt = Infinity;
  for (const j of liveJobs) {
    if (!j.active) continue;
    const next = estimateNextDue(j.schedule_cron, j.timezone);
    if (!next) continue;
    const last = lastRunByJob.get(j.id);
    const lastStarted = last?.started_at ? new Date(last.started_at).getTime() : 0;
    // overdue if scheduled time has passed by >2h and no recent run since previous slot
    const prev = new Date(next.getTime() - 24 * 3600 * 1000);
    if (prev.getTime() < now - 2 * 3600 * 1000 && lastStarted < prev.getTime()) overdue++;
    const ms = next.getTime();
    if (ms < nextDueAt) {
      nextDueAt = ms;
      nextDue = { code: j.job_code, name: j.job_name, in_minutes: Math.round((ms - now) / 60000) };
    }
  }

  const openFailures = failures.filter(f => f.status === "open").length;
  const criticalFailures = failures.filter(f => f.status === "open" && f.severity === "critical").length;

  let top: JobsSummary["top_alert"] = null;
  if (criticalFailures > 0)
    top = { kind: "critical_failure", summary: `${criticalFailures} critical job failure(s) open`, severity: "critical" };
  else if (failedToday.length > 0)
    top = { kind: "failed_today", summary: `${failedToday.length} job failure(s) in last 24h`, severity: "high" };
  else if (overdue > 0)
    top = { kind: "overdue", summary: `${overdue} active job(s) overdue`, severity: "medium" };
  else if (externalBlocksToday > 0)
    top = { kind: "external_blocked", summary: `${externalBlocksToday} external action(s) blocked by policy`, severity: "low" };

  let recommended = "All scheduled jobs healthy.";
  if (criticalFailures > 0) recommended = "Investigate critical failures and acknowledge.";
  else if (failedToday.length > 0) recommended = "Review failed runs and retry if safe.";
  else if (overdue > 0) recommended = "Check overdue jobs — confirm scheduler is healthy.";

  return {
    jobs_total: liveJobs.length,
    jobs_active: liveJobs.filter(j => j.active).length,
    jobs_inactive: liveJobs.filter(j => !j.active).length,
    jobs_failed_today: failedToday.length,
    jobs_overdue: overdue,
    jobs_external_disabled: liveJobs.filter(j => j.external_action_possible && !j.external_action_allowed).length,
    jobs_external_possible: liveJobs.filter(j => j.external_action_possible).length,
    open_failures: openFailures,
    critical_failures: criticalFailures,
    external_blocks_today: externalBlocksToday,
    next_job_due: nextDue,
    test_runs: runs.filter(r => T(r.audit_metadata)).length,
    recommended_action: recommended,
    top_alert: top,
  };
}

export const STATUS_META: Record<RunStatus, { label: string; cls: string }> = {
  queued:    { label: "Queued",    cls: "bg-muted text-muted-foreground border-border/50" },
  running:   { label: "Running",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  completed: { label: "Completed", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed:    { label: "Failed",    cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border/50" },
  skipped:   { label: "Skipped",   cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

export const CATEGORY_LABEL: Record<JobCategory, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", monitoring: "Monitoring",
  reporting: "Reporting", ai_eval: "AI Eval", finance: "Finance",
  compliance: "Compliance", privacy: "Privacy", support: "Support",
  marketplace: "Marketplace", system: "System", other: "Other",
};

export async function toggleJobActive(id: string, active: boolean) {
  return (supabase as any).from("scheduled_job_definitions").update({ active }).eq("id", id);
}

/**
 * Manual internal run — records a queued/completed run row only. Does NOT
 * execute any external side-effects. Job logic still owns external policy.
 */
export async function manualRunInternal(job: JobDefinition, note?: string) {
  const startedAt = new Date().toISOString();
  const summary = note?.trim() || `Manual internal run of ${job.job_name}.`;
  return (supabase as any).from("scheduled_job_runs").insert({
    job_definition_id: job.id,
    run_status: "completed",
    started_at: startedAt,
    completed_at: startedAt,
    duration_ms: 0,
    output_summary: `[manual-internal] ${summary} No external action attempted.`,
    audit_metadata: { tag: "LIVE_INTERNAL_TEST", live_internal_test: true, manual: true },
  });
}