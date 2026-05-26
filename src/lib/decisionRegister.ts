import { supabase } from "@/integrations/supabase/client";

export type DecisionType =
  | "approve" | "reject" | "choose_option" | "pause" | "scale" | "park"
  | "kill_review" | "spend" | "hire" | "legal_tax" | "product" | "pricing"
  | "customer" | "seller" | "partner" | "portfolio" | "other";

export type DecisionStatus =
  | "needed" | "recommended" | "founder_review" | "decided"
  | "implemented" | "deferred" | "cancelled";

export type DecisionEventType =
  | "created" | "option_added" | "recommended" | "decided"
  | "implemented" | "deferred" | "reopened" | "cancelled";

export type ReviewStatus = "pending" | "completed" | "cancelled";

export interface DecisionOption {
  key: string;
  label: string;
  reasoning?: string;
  estimated_impact?: string;
}

export interface FounderDecision {
  id: string;
  business_id: string | null;
  source_module: string | null;
  source_table: string | null;
  source_record_id: string | null;
  decision_title: string | null;
  decision_summary: string | null;
  decision_type: DecisionType;
  decision_status: DecisionStatus;
  recommended_option: string | null;
  options_json: DecisionOption[];
  financial_impact_summary: string | null;
  risk_summary: string | null;
  deadline: string | null;
  founder_decision: string | null;
  founder_decided_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
  // legacy fallbacks
  title?: string | null;
}

export interface DecisionEvent {
  id: string;
  decision_id: string;
  event_type: DecisionEventType;
  event_summary: string | null;
  created_by: string | null;
  audit_metadata: any;
  created_at: string;
}

export interface DecisionReviewReminder {
  id: string;
  decision_id: string;
  review_due_at: string;
  review_reason: string | null;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export const DECISION_TYPE_LABEL: Record<DecisionType, string> = {
  approve: "Approve", reject: "Reject", choose_option: "Choose option",
  pause: "Pause", scale: "Scale", park: "Park", kill_review: "Kill review",
  spend: "Spend", hire: "Hire", legal_tax: "Legal / tax", product: "Product",
  pricing: "Pricing", customer: "Customer", seller: "Seller", partner: "Partner",
  portfolio: "Portfolio", other: "Other",
};

export const DECISION_STATUS_META: Record<DecisionStatus, { label: string; cls: string }> = {
  needed:        { label: "Needed",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  recommended:   { label: "Recommended",    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  founder_review:{ label: "Founder review", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  decided:       { label: "Decided",        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  implemented:   { label: "Implemented",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  deferred:      { label: "Deferred",       cls: "bg-muted text-muted-foreground border-border/50" },
  cancelled:     { label: "Cancelled",      cls: "bg-muted text-muted-foreground border-border/50" },
};

export const IRREVERSIBLE_TYPES: DecisionType[] = ["kill_review", "legal_tax"];

export function isIrreversible(d: FounderDecision): boolean {
  if (d.audit_metadata?.irreversible === true) return true;
  return IRREVERSIBLE_TYPES.includes(d.decision_type);
}

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);

function normalise(row: any): FounderDecision {
  return {
    ...row,
    decision_title: row.decision_title ?? row.title ?? "(untitled decision)",
    decision_summary: row.decision_summary ?? row.finding ?? null,
    options_json: Array.isArray(row.options_json) ? row.options_json : [],
    financial_impact_summary: row.financial_impact_summary ?? row.cost_credit_impact ?? null,
    risk_summary: row.risk_summary ?? row.risk ?? null,
    recommended_option: row.recommended_option ?? row.recommendation ?? null,
    decision_status: row.decision_status ?? "needed",
    decision_type: row.decision_type ?? "other",
    audit_metadata: row.audit_metadata ?? {},
  };
}

export async function fetchDecisions(): Promise<FounderDecision[]> {
  const { data } = await (supabase as any)
    .from("founder_decisions").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(normalise);
}

export async function fetchDecisionEvents(): Promise<DecisionEvent[]> {
  const { data } = await (supabase as any)
    .from("founder_decision_events").select("*").order("created_at", { ascending: false });
  return (data ?? []) as DecisionEvent[];
}

export async function fetchReminders(): Promise<DecisionReviewReminder[]> {
  const { data } = await (supabase as any)
    .from("decision_review_reminders").select("*").order("review_due_at", { ascending: true });
  return (data ?? []) as DecisionReviewReminder[];
}

export interface DecisionSummary {
  total: number;
  open: number;
  needed: number;
  recommended: number;
  founder_review: number;
  decided: number;
  implemented: number;
  deferred: number;
  by_business: number;
  high_value: number;
  high_risk: number;
  irreversible_open: number;
  reminders_pending: number;
  reminders_overdue: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

function looksHighValue(d: FounderDecision): boolean {
  const t = (d.financial_impact_summary || "").toLowerCase();
  return /£\s?\d{3,}|\$\s?\d{3,}|\d{3,}\s?\/?mo|gmv|margin/.test(t);
}
function looksHighRisk(d: FounderDecision): boolean {
  const t = (d.risk_summary || "").toLowerCase();
  return t.includes("high") || t.includes("critical") || t.includes("destructive") || t.includes("penalt");
}

export function summarize(
  decisions: FounderDecision[],
  reminders: DecisionReviewReminder[],
): DecisionSummary {
  const live = decisions.filter(d => !isTest(d.audit_metadata));
  const all = decisions; // include test for visibility
  const open = all.filter(d => ["needed","recommended","founder_review"].includes(d.decision_status));
  const businesses = new Set(all.filter(d => d.business_id).map(d => d.business_id!));

  const now = Date.now();
  const pendingReminders = reminders.filter(r => r.review_status === "pending");
  const overdueReminders = pendingReminders.filter(r => new Date(r.review_due_at).getTime() < now);

  const irreversible_open = open.filter(isIrreversible).length;
  const high_value = open.filter(looksHighValue).length;
  const high_risk = open.filter(looksHighRisk).length;

  let top: DecisionSummary["top_alert"] = null;
  if (irreversible_open > 0)
    top = { kind: "irreversible", summary: `${irreversible_open} irreversible decision(s) awaiting founder`, severity: "critical" };
  else if (high_risk > 0)
    top = { kind: "high_risk", summary: `${high_risk} high-risk decision(s) open`, severity: "high" };
  else if (overdueReminders.length > 0)
    top = { kind: "overdue_review", summary: `${overdueReminders.length} decision review(s) overdue`, severity: "high" };
  else if (open.length > 0)
    top = { kind: "open", summary: `${open.length} open decision(s)`, severity: "medium" };

  return {
    total: all.length,
    open: open.length,
    needed: all.filter(d => d.decision_status === "needed").length,
    recommended: all.filter(d => d.decision_status === "recommended").length,
    founder_review: all.filter(d => d.decision_status === "founder_review").length,
    decided: all.filter(d => d.decision_status === "decided").length,
    implemented: all.filter(d => d.decision_status === "implemented").length,
    deferred: all.filter(d => d.decision_status === "deferred").length,
    by_business: businesses.size,
    high_value, high_risk, irreversible_open,
    reminders_pending: pendingReminders.length,
    reminders_overdue: overdueReminders.length,
    test_records: all.length - live.length,
    top_alert: top,
  };
}