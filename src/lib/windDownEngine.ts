import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type PlanMode = "pause" | "park" | "retire" | "close" | "sell" | "transfer" | "archive";
export type PlanStatus = "draft" | "approved" | "in_progress" | "complete" | "blocked";
export type Approval = "pending" | "approved" | "rejected";

export interface WindDownPlan {
  id: string; business_name: string; mode: PlanMode; reason: string|null;
  target_date: string|null; status: PlanStatus; requires_external_actions: boolean;
  approval_status: Approval; founder_decision: string|null; risk_notes: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ChecklistItem {
  id: string; plan_id: string|null; category: string; task: string; detail: string|null;
  owner: string|null; requires_approval: boolean; status: string; risk_level: string;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface CustomerOffboarding {
  id: string; plan_id: string|null; customer_label: string; obligation_type: string;
  refund_due: number; currency: string; notice_required: boolean; notice_status: string;
  data_export_required: boolean; data_export_status: string; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface VendorCancellation {
  id: string; plan_id: string|null; vendor_name: string; service: string|null;
  monthly_cost: number; currency: string; notice_period_days: number;
  earliest_cancel_date: string|null; cancellation_status: string; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ContractTermination {
  id: string; plan_id: string|null; counterparty: string; contract_type: string;
  termination_clause_summary: string|null; notice_period_days: number; penalty_amount: number;
  currency: string; termination_status: string; legal_reviewed: boolean; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface DataRetention {
  id: string; plan_id: string|null; dataset: string; policy: string;
  retain_until: string|null; archive_location: string|null; action: string; status: string;
  audit_trail_preserved: boolean; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface LegalReview {
  id: string; plan_id: string|null; review_type: string; topic: string;
  adviser: string|null; question: string|null; recommendation: string|null;
  status: string; feeds_decision_register: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listPlans(): Promise<WindDownPlan[]> {
  const { data } = await sb.from("winddown_plans").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as WindDownPlan[];
}
export async function listChecklist(): Promise<ChecklistItem[]> {
  const { data } = await sb.from("winddown_checklist_items").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as ChecklistItem[];
}
export async function listCustomerOffboarding(): Promise<CustomerOffboarding[]> {
  const { data } = await sb.from("winddown_customer_offboarding").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as CustomerOffboarding[];
}
export async function listVendorCancellations(): Promise<VendorCancellation[]> {
  const { data } = await sb.from("winddown_vendor_cancellations").select("*").order("monthly_cost",{ascending:false}).limit(1000);
  return (data ?? []) as VendorCancellation[];
}
export async function listContractTerminations(): Promise<ContractTermination[]> {
  const { data } = await sb.from("winddown_contract_terminations").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as ContractTermination[];
}
export async function listDataRetention(): Promise<DataRetention[]> {
  const { data } = await sb.from("winddown_data_retention").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as DataRetention[];
}
export async function listLegalReviews(): Promise<LegalReview[]> {
  const { data } = await sb.from("winddown_legal_reviews").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as LegalReview[];
}

export interface WindDownSummary {
  plansTotal: number; plansActive: number; pendingApproval: number;
  checklistOpen: number; checklistHighRisk: number;
  refundsDue: number; customersPending: number;
  vendorsPending: number; monthlyVendorBurn: number;
  contractsPending: number; legalReviewsOpen: number;
  datasetsPending: number; watchItems: string[];
}

export function fmtMoney(n: number, ccy = "GBP"): string {
  try { return new Intl.NumberFormat("en-GB",{style:"currency",currency:ccy,maximumFractionDigits:0}).format(n); }
  catch { return `£${n.toFixed(0)}`; }
}

export async function summariseWindDown(): Promise<WindDownSummary> {
  const [plans, checklist, customers, vendors, contracts, data, legal] = await Promise.all([
    listPlans(), listChecklist(), listCustomerOffboarding(),
    listVendorCancellations(), listContractTerminations(), listDataRetention(), listLegalReviews()
  ]);
  const pendingApproval = plans.filter(p => p.approval_status === "pending" && p.requires_external_actions).length;
  const checklistOpen = checklist.filter(c => c.status !== "complete").length;
  const checklistHighRisk = checklist.filter(c => c.risk_level === "high" && c.status !== "complete").length;
  const refundsDue = customers.reduce((a,c)=>a+Number(c.refund_due||0),0);
  const customersPending = customers.filter(c => c.notice_status === "pending_approval" || c.data_export_status === "pending_approval").length;
  const vendorsPending = vendors.filter(v => v.cancellation_status === "pending_approval").length;
  const monthlyVendorBurn = vendors.reduce((a,v)=>a+Number(v.monthly_cost||0),0);
  const contractsPending = contracts.filter(c => !c.legal_reviewed || c.termination_status === "pending_legal_review").length;
  const legalReviewsOpen = legal.filter(l => l.status === "pending").length;
  const datasetsPending = data.filter(d => d.status === "pending_approval").length;
  const watch: string[] = [];
  if (pendingApproval) watch.push(`${pendingApproval} wind-down plan(s) awaiting founder approval`);
  if (customersPending) watch.push(`${customersPending} customer offboarding step(s) awaiting approval`);
  if (vendorsPending) watch.push(`${vendorsPending} vendor cancellation(s) awaiting approval — £${monthlyVendorBurn.toFixed(0)}/mo at stake`);
  if (contractsPending) watch.push(`${contractsPending} contract termination(s) awaiting legal review`);
  if (datasetsPending) watch.push(`${datasetsPending} dataset(s) awaiting retention/archive decision`);
  if (legalReviewsOpen) watch.push(`${legalReviewsOpen} legal/tax/adviser review(s) outstanding`);
  if (checklistHighRisk) watch.push(`${checklistHighRisk} high-risk checklist item(s) open`);
  if (refundsDue > 0) watch.push(`£${refundsDue.toFixed(0)} customer refunds queued — release requires founder approval`);
  return {
    plansTotal: plans.length,
    plansActive: plans.filter(p => p.status === "in_progress").length,
    pendingApproval, checklistOpen, checklistHighRisk,
    refundsDue, customersPending,
    vendorsPending, monthlyVendorBurn,
    contractsPending, legalReviewsOpen, datasetsPending,
    watchItems: watch,
  };
}