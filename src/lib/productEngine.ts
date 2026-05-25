import { supabase } from "@/integrations/supabase/client";

export interface ProductSnapshot {
  features_total: number;
  features_in_build: number;
  features_qa: number;
  features_ready: number;
  bugs_open: number;
  bugs_critical_open: number;
  bugs_high_open: number;
  bugs_in_qa: number;
  releases_total: number;
  releases_draft: number;
  releases_qa: number;
  releases_awaiting_approval: number;
  releases_rolled_back: number;
  qa_pending: number;
  qa_failed: number;
  qa_blocked: number;
  known_issues: number;
  recommended_action: string;
}

const OPEN_BUG = ["new", "triaged", "in_fix", "qa"];
const OPEN_FEATURE_IN_BUILD = ["in_build"];

export async function computeProductSnapshot(): Promise<ProductSnapshot> {
  const sb: any = supabase as any;
  const [fRes, bRes, rRes, qRes] = await Promise.all([
    sb.from("product_features").select("id,feature_status"),
    sb.from("product_bugs").select("id,bug_status,severity"),
    sb.from("release_records").select("id,release_status,founder_approval_required,approved_at"),
    sb.from("qa_checklists").select("id,qa_status"),
  ]);
  const features = fRes.data ?? [];
  const bugs = bRes.data ?? [];
  const releases = rRes.data ?? [];
  const qa = qRes.data ?? [];

  const features_in_build = features.filter((f: any) => OPEN_FEATURE_IN_BUILD.includes(f.feature_status)).length;
  const features_qa = features.filter((f: any) => f.feature_status === "qa").length;
  const features_ready = features.filter((f: any) => f.feature_status === "ready").length;

  const bugs_open = bugs.filter((b: any) => OPEN_BUG.includes(b.bug_status)).length;
  const bugs_critical_open = bugs.filter((b: any) => b.severity === "critical" && OPEN_BUG.includes(b.bug_status)).length;
  const bugs_high_open = bugs.filter((b: any) => b.severity === "high" && OPEN_BUG.includes(b.bug_status)).length;
  const bugs_in_qa = bugs.filter((b: any) => b.bug_status === "qa").length;

  const releases_draft = releases.filter((r: any) => r.release_status === "draft").length;
  const releases_qa = releases.filter((r: any) => r.release_status === "qa").length;
  const releases_awaiting_approval = releases.filter((r: any) =>
    r.release_status === "approved" && !r.approved_at
  ).length + releases.filter((r: any) => r.release_status === "qa" && r.founder_approval_required).length;
  const releases_rolled_back = releases.filter((r: any) => r.release_status === "rolled_back").length;

  const qa_pending = qa.filter((q: any) => q.qa_status === "pending").length;
  const qa_failed = qa.filter((q: any) => q.qa_status === "fail").length;
  const qa_blocked = qa.filter((q: any) => q.qa_status === "blocked").length;

  // Known issues = released bugs still wont_fix or open bugs in released features
  const known_issues = bugs.filter((b: any) => b.bug_status === "wont_fix").length;

  let recommended_action = "Product roadmap quiet. No releases awaiting approval.";
  if (bugs_critical_open > 0) recommended_action = `${bugs_critical_open} critical bug(s) open — triage immediately. No deploys without founder approval.`;
  else if (releases_rolled_back > 0) recommended_action = `${releases_rolled_back} release(s) rolled back — review postmortem link and known issues.`;
  else if (qa_failed > 0) recommended_action = `${qa_failed} QA checklist(s) failing — block release until resolved.`;
  else if (qa_blocked > 0) recommended_action = `${qa_blocked} QA checklist(s) blocked — unblock before promotion.`;
  else if (releases_awaiting_approval > 0) recommended_action = `${releases_awaiting_approval} release(s) drafted and awaiting founder approval before production deploy.`;
  else if (bugs_high_open > 0) recommended_action = `${bugs_high_open} high-severity bug(s) open — schedule fix into next release.`;
  else if (features_ready > 0) recommended_action = `${features_ready} feature(s) ready — bundle into next release draft.`;
  else if (features_in_build > 0) recommended_action = `${features_in_build} feature(s) in build — Product QA Agent tracking progress.`;

  return {
    features_total: features.length,
    features_in_build,
    features_qa,
    features_ready,
    bugs_open,
    bugs_critical_open,
    bugs_high_open,
    bugs_in_qa,
    releases_total: releases.length,
    releases_draft,
    releases_qa,
    releases_awaiting_approval,
    releases_rolled_back,
    qa_pending,
    qa_failed,
    qa_blocked,
    known_issues,
    recommended_action,
  };
}

export const FEATURE_STATUS_TONE: Record<string, string> = {
  idea: "bg-muted text-muted-foreground border-border/50",
  planned: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_build: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  qa: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  released: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  paused: "bg-muted text-muted-foreground border-border/50",
  retired: "bg-muted text-muted-foreground border-border/50",
};

export const BUG_SEVERITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const BUG_STATUS_TONE: Record<string, string> = {
  new: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  triaged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_fix: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  qa: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  fixed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  released: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  wont_fix: "bg-muted text-muted-foreground border-border/50",
};

export const RELEASE_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  qa: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  released: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rolled_back: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border/50",
};

export const QA_STATUS_TONE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  pass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  fail: "bg-red-500/15 text-red-400 border-red-500/30",
  blocked: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};