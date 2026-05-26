import { supabase } from "@/integrations/supabase/client";

export type RiskType = "duplicate_account"|"suspicious_payment"|"chargeback_risk"|"refund_abuse"|"fake_seller"|"fake_buyer"|"abusive_message"|"spam"|"identity_mismatch"|"payout_risk"|"policy_violation"|"other";
export type RiskSeverity = "low"|"medium"|"high"|"critical";
export type RiskStatus = "open"|"review_required"|"action_required"|"resolved"|"false_positive"|"accepted";
export type ActionType = "watch"|"request_info"|"manual_review"|"block_message"|"suspend_account"|"hold_payout"|"cancel_order"|"refund_review"|"escalate"|"no_action";
export type ActionStatus = "draft"|"approval_required"|"approved"|"rejected"|"completed"|"cancelled";
export type AbuseFlagType = "abusive"|"spam"|"harassment"|"scam"|"suspicious_link"|"prohibited_content"|"other";

export interface RiskEvent {
  id: string;
  business_id: string | null;
  identity_profile_id: string | null;
  seller_id: string | null;
  customer_id: string | null;
  related_table: string | null;
  related_record_id: string | null;
  risk_type: RiskType;
  severity: RiskSeverity;
  risk_summary: string | null;
  evidence_summary: string | null;
  recommended_action: string | null;
  status: RiskStatus;
  created_at: string;
  updated_at: string;
  audit_metadata: Record<string, any>;
}

export interface ActionRec {
  id: string;
  trust_risk_event_id: string;
  action_type: ActionType;
  action_status: ActionStatus;
  founder_approval_required: boolean;
  created_at: string;
  updated_at: string;
  audit_metadata: Record<string, any>;
}

export interface AbuseFlag {
  id: string;
  communication_record_id: string;
  flag_type: AbuseFlagType;
  severity: RiskSeverity;
  flag_summary: string | null;
  created_at: string;
  audit_metadata: Record<string, any>;
}

const sb: any = supabase as any;

export async function listRiskEvents(filters?: { type?: RiskType; severity?: RiskSeverity; status?: RiskStatus; limit?: number }) {
  let q = sb.from("trust_risk_events").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.type) q = q.eq("risk_type", filters.type);
  if (filters?.severity) q = q.eq("severity", filters.severity);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return (data ?? []) as RiskEvent[];
}

export async function listActions(filters?: { status?: ActionStatus; limit?: number }) {
  let q = sb.from("trust_action_recommendations").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.status) q = q.eq("action_status", filters.status);
  const { data } = await q;
  return (data ?? []) as ActionRec[];
}

export async function listAbuseFlags(limit = 200) {
  const { data } = await sb.from("abuse_message_flags").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as AbuseFlag[];
}

export interface TrustSummary {
  totalEvents: number;
  open: number;
  reviewRequired: number;
  actionRequired: number;
  highSeverity: number;
  criticalSeverity: number;
  abuseFlags: number;
  actionsAwaitingApproval: number;
  approvedActionsCompleted: number;
  watchItems: string[];
}

export async function summariseTrustSafety(): Promise<TrustSummary> {
  const [evts, acts, flags] = await Promise.all([
    sb.from("trust_risk_events").select("severity,status").limit(2000),
    sb.from("trust_action_recommendations").select("action_status").limit(2000),
    sb.from("abuse_message_flags").select("severity").limit(1000),
  ]);
  const e = (evts.data ?? []) as Array<{ severity: RiskSeverity; status: RiskStatus }>;
  const a = (acts.data ?? []) as Array<{ action_status: ActionStatus }>;
  const f = (flags.data ?? []) as Array<{ severity: RiskSeverity }>;
  const high = e.filter(x => x.severity === "high").length;
  const critical = e.filter(x => x.severity === "critical").length;
  const open = e.filter(x => x.status === "open").length;
  const review = e.filter(x => x.status === "review_required").length;
  const action = e.filter(x => x.status === "action_required").length;
  const awaitingApproval = a.filter(x => x.action_status === "approval_required").length;
  const completed = a.filter(x => x.action_status === "completed").length;
  const watch: string[] = [];
  if (critical > 0) watch.push(`${critical} critical risk event(s)`);
  if (high > 0) watch.push(`${high} high-severity risk event(s)`);
  if (action > 0) watch.push(`${action} risk event(s) require action`);
  if (awaitingApproval > 0) watch.push(`${awaitingApproval} action(s) awaiting founder approval`);
  return { totalEvents: e.length, open, reviewRequired: review, actionRequired: action, highSeverity: high, criticalSeverity: critical, abuseFlags: f.length, actionsAwaitingApproval: awaitingApproval, approvedActionsCompleted: completed, watchItems: watch };
}

export function severityTone(s: RiskSeverity): "ok"|"warn"|"bad" {
  if (s === "critical" || s === "high") return "bad";
  if (s === "medium") return "warn";
  return "ok";
}
