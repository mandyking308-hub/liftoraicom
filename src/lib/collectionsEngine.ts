import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type CollectionStatus = "open"|"in_recovery"|"paused"|"recovered"|"written_off";
export type RiskTier = "low"|"medium"|"high"|"critical";
export type FailedStatus = "open"|"scheduled"|"recovered"|"abandoned";
export type ActionStatus = "recommended"|"approved"|"executed"|"cancelled"|"blocked";
export type DraftStatus = "pending"|"approved"|"sent"|"rejected";

export interface OverdueInvoice {
  id: string; business_name: string|null; invoice_reference: string; customer_label: string|null;
  amount_outstanding: number; currency: string; due_date: string|null; days_overdue: number;
  risk_tier: RiskTier; collection_status: CollectionStatus; founder_review_required: boolean;
  notes: string|null; is_test_data: boolean; trace_id: string|null;
  created_at: string; updated_at: string;
}
export interface FailedPayment {
  id: string; business_name: string|null; invoice_reference: string|null; amount: number;
  currency: string; provider: string|null; failure_code: string|null; failure_reason: string|null;
  attempt_count: number; last_attempt_at: string|null; retry_recommendation: string;
  recovery_status: FailedStatus; requires_external_action: boolean; approved_to_retry: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string; updated_at: string;
}
export interface RecoveryAction {
  id: string; business_name: string|null; invoice_reference: string|null;
  action_type: string; action_status: ActionStatus; requires_approval: boolean;
  requires_external_action: boolean; rationale: string|null; trace_id: string|null;
  is_test_data: boolean; created_at: string;
}
export interface ReminderDraft {
  id: string; business_name: string|null; invoice_reference: string|null; channel: string;
  tone: string; draft_subject: string|null; draft_body: string;
  approval_status: DraftStatus; requires_external_send: boolean; is_test_data: boolean;
  trace_id: string|null; created_at: string;
}
export interface PaymentPlan {
  id: string; business_name: string|null; invoice_reference: string|null; total_amount: number;
  currency: string; instalment_count: number; cadence: string; first_instalment_date: string|null;
  plan_status: string; requires_approval: boolean; is_test_data: boolean; trace_id: string|null;
  created_at: string;
}
export interface ServiceHoldRec {
  id: string; business_name: string|null; customer_label: string|null; hold_scope: string;
  justification: string; risk_score: number; hold_status: string; founder_decision: string|null;
  executed: boolean; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface WriteoffDecision {
  id: string; business_name: string|null; invoice_reference: string|null; amount: number;
  currency: string; recommendation: string; reason: string|null; founder_decision: string|null;
  applied: boolean; is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listOverdue(): Promise<OverdueInvoice[]> {
  const { data } = await sb.from("collections_overdue_invoices").select("*").order("days_overdue",{ascending:false}).limit(500);
  return (data ?? []) as OverdueInvoice[];
}
export async function listFailed(): Promise<FailedPayment[]> {
  const { data } = await sb.from("collections_failed_payments").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as FailedPayment[];
}
export async function listActions(): Promise<RecoveryAction[]> {
  const { data } = await sb.from("collections_recovery_actions").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as RecoveryAction[];
}
export async function listReminders(): Promise<ReminderDraft[]> {
  const { data } = await sb.from("collections_reminder_drafts").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ReminderDraft[];
}
export async function listPlans(): Promise<PaymentPlan[]> {
  const { data } = await sb.from("collections_payment_plans").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as PaymentPlan[];
}
export async function listServiceHolds(): Promise<ServiceHoldRec[]> {
  const { data } = await sb.from("collections_service_hold_recommendations").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ServiceHoldRec[];
}
export async function listWriteoffs(): Promise<WriteoffDecision[]> {
  const { data } = await sb.from("collections_writeoff_decisions").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as WriteoffDecision[];
}

export interface CollectionsSummary {
  overdueOpen: number;
  overdueAmount: number;
  failedOpen: number;
  failedAmount: number;
  highRisk: number;
  remindersPending: number;
  actionsPendingApproval: number;
  paymentPlansProposed: number;
  serviceHoldsRecommended: number;
  writeoffsRecommended: number;
  watchItems: string[];
}

export async function summariseCollections(): Promise<CollectionsSummary> {
  const [overdue, failed, actions, drafts, plans, holds, writeoffs] = await Promise.all([
    listOverdue(), listFailed(), listActions(), listReminders(), listPlans(), listServiceHolds(), listWriteoffs(),
  ]);
  const overdueOpen = overdue.filter(o => o.collection_status === "open" || o.collection_status === "in_recovery").length;
  const overdueAmount = overdue.filter(o => o.collection_status !== "recovered" && o.collection_status !== "written_off")
    .reduce((s,o) => s + Number(o.amount_outstanding||0), 0);
  const failedOpen = failed.filter(f => f.recovery_status === "open" || f.recovery_status === "scheduled").length;
  const failedAmount = failed.filter(f => f.recovery_status !== "recovered" && f.recovery_status !== "abandoned")
    .reduce((s,f) => s + Number(f.amount||0), 0);
  const highRisk = overdue.filter(o => o.risk_tier === "high" || o.risk_tier === "critical").length;
  const remindersPending = drafts.filter(d => d.approval_status === "pending").length;
  const actionsPendingApproval = actions.filter(a => a.action_status === "recommended" && a.requires_approval).length;
  const paymentPlansProposed = plans.filter(p => p.plan_status === "proposed").length;
  const serviceHoldsRecommended = holds.filter(h => h.hold_status === "recommended").length;
  const writeoffsRecommended = writeoffs.filter(w => !w.founder_decision).length;
  const watch: string[] = [];
  if (highRisk > 0) watch.push(`${highRisk} high-risk overdue invoice(s)`);
  if (failedOpen > 0) watch.push(`${failedOpen} failed payment(s) awaiting recovery decision`);
  if (remindersPending > 0) watch.push(`${remindersPending} reminder draft(s) awaiting approval`);
  if (serviceHoldsRecommended > 0) watch.push(`${serviceHoldsRecommended} service hold(s) recommended`);
  if (writeoffsRecommended > 0) watch.push(`${writeoffsRecommended} write-off decision(s) pending`);
  return {
    overdueOpen, overdueAmount, failedOpen, failedAmount, highRisk,
    remindersPending, actionsPendingApproval, paymentPlansProposed,
    serviceHoldsRecommended, writeoffsRecommended, watchItems: watch,
  };
}

export function fmtMoney(n: number, ccy = "GBP") {
  try { return new Intl.NumberFormat("en-GB",{style:"currency",currency:ccy,maximumFractionDigits:0}).format(n||0); }
  catch { return `${ccy} ${Math.round(n||0)}`; }
}