import { supabase } from "@/integrations/supabase/client";

export interface DataQualitySnapshot {
  total_findings: number;
  open: number;
  approval_required: number;
  fixed: number;
  ignored: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  critical_open: number;
  high_open: number;
  duplicates: number;
  test_data: number;
  orphans: number;
  stale: number;
  revenue_integrity: number;
  repair_actions_pending: number;
  repair_irreversible_pending: number;
  quality_score: number;
  recommended_action: string;
}

const OPEN_FIX = ["open", "approval_required", "approved"];

export async function computeDataQualitySnapshot(): Promise<DataQualitySnapshot> {
  const sb: any = supabase as any;
  const [fRes, aRes] = await Promise.all([
    sb.from("data_quality_findings").select("id,finding_type,severity,fix_status"),
    sb.from("data_repair_actions").select("id,action_status,irreversible,founder_approval_required"),
  ]);
  const findings = fRes.data ?? [];
  const actions = aRes.data ?? [];

  const by_type: Record<string, number> = {};
  const by_severity: Record<string, number> = {};
  findings.forEach((f: any) => {
    by_type[f.finding_type] = (by_type[f.finding_type] ?? 0) + 1;
    by_severity[f.severity] = (by_severity[f.severity] ?? 0) + 1;
  });

  const open = findings.filter((f: any) => f.fix_status === "open").length;
  const approval_required = findings.filter((f: any) => f.fix_status === "approval_required").length;
  const fixed = findings.filter((f: any) => f.fix_status === "fixed").length;
  const ignored = findings.filter((f: any) => ["ignored", "false_positive"].includes(f.fix_status)).length;

  const isOpen = (f: any) => OPEN_FIX.includes(f.fix_status);
  const critical_open = findings.filter((f: any) => f.severity === "critical" && isOpen(f)).length;
  const high_open = findings.filter((f: any) => f.severity === "high" && isOpen(f)).length;

  const duplicates = findings.filter((f: any) => f.finding_type === "duplicate" && isOpen(f)).length;
  const test_data = findings.filter((f: any) => f.finding_type === "test_data" && isOpen(f)).length;
  const orphans = findings.filter((f: any) => f.finding_type === "orphan" && isOpen(f)).length;
  const stale = findings.filter((f: any) => f.finding_type === "stale" && isOpen(f)).length;
  const revenue_integrity = findings.filter((f: any) => ["invalid_amount"].includes(f.finding_type) && isOpen(f)).length;

  const repair_actions_pending = actions.filter((a: any) => ["draft", "approval_required", "approved"].includes(a.action_status)).length;
  const repair_irreversible_pending = actions.filter((a: any) => a.irreversible && ["draft", "approval_required", "approved"].includes(a.action_status)).length;

  // Quality score: starts at 100, deduct for open findings weighted by severity
  const sevWeight: Record<string, number> = { critical: 8, high: 4, medium: 1.5, low: 0.5 };
  const totalDeduction = findings.filter(isOpen).reduce((s: number, f: any) => s + (sevWeight[f.severity] ?? 1), 0);
  const quality_score = Math.max(0, Math.round(100 - totalDeduction));

  let recommended_action = "Data quality nominal. No live findings.";
  if (critical_open > 0) recommended_action = `${critical_open} critical finding(s) — review and approve repair actions immediately.`;
  else if (repair_irreversible_pending > 0) recommended_action = `${repair_irreversible_pending} irreversible repair action(s) drafted — founder approval required.`;
  else if (revenue_integrity > 0) recommended_action = `${revenue_integrity} revenue integrity issue(s) — confirmed revenue without payment evidence.`;
  else if (duplicates > 5) recommended_action = `${duplicates} duplicate record cluster(s) detected — schedule merge review.`;
  else if (test_data > 0) recommended_action = `${test_data} test-data record(s) leaking into live tables — relabel or archive.`;
  else if (orphans > 0) recommended_action = `${orphans} orphan record(s) — link to a parent or archive.`;
  else if (stale > 0) recommended_action = `${stale} stale record(s) — refresh or archive.`;
  else if (approval_required > 0) recommended_action = `${approval_required} finding(s) waiting on founder approval.`;
  else if (high_open > 0) recommended_action = `${high_open} high-severity finding(s) open.`;

  return {
    total_findings: findings.length,
    open, approval_required, fixed, ignored,
    by_type, by_severity,
    critical_open, high_open,
    duplicates, test_data, orphans, stale, revenue_integrity,
    repair_actions_pending, repair_irreversible_pending,
    quality_score,
    recommended_action,
  };
}

export const DQ_FINDING_LABEL: Record<string, string> = {
  duplicate: "Duplicate",
  stale: "Stale",
  orphan: "Orphan",
  test_data: "Test data",
  invalid_amount: "Invalid amount",
  missing_id: "Missing ID",
  schema_mismatch: "Schema mismatch",
  polluted_context: "Polluted context",
  suspicious: "Suspicious",
};

export const DQ_SEVERITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const DQ_STATUS_TONE: Record<string, string> = {
  open: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approval_required: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  fixed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ignored: "bg-muted text-muted-foreground border-border/50",
  false_positive: "bg-muted text-muted-foreground border-border/50",
};

export const DQ_ACTION_LABEL: Record<string, string> = {
  merge: "Merge",
  delete: "Delete",
  archive: "Archive",
  relabel_test: "Relabel as test",
  correct_amount: "Correct amount",
  link_record: "Link record",
  detach_context: "Detach cached context",
  manual_review: "Manual review",
};

export const DQ_ACTION_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  approval_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border/50",
};