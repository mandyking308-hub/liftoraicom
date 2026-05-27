import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type PlanStatus = "draft" | "approved" | "running" | "complete" | "blocked";
export type Approval = "pending" | "approved" | "rejected";
export type Recommendation = "keep" | "scale" | "retest" | "retire";

export interface ExperimentPlan {
  id: string; business_name: string|null; channel: string|null; product_or_offer: string|null;
  hypothesis: string; success_metric: string; audience: string|null; risk_level: string;
  status: PlanStatus; requires_external_launch: boolean; approval_status: Approval;
  founder_decision: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentVariant {
  id: string; plan_id: string|null; label: string; description: string|null;
  is_control: boolean; traffic_split: number; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentMetric {
  id: string; plan_id: string|null; metric_name: string; metric_type: string;
  target_value: number|null; unit: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentResult {
  id: string; plan_id: string|null; variant_id: string|null; metric_name: string;
  observed_value: number; sample_size: number; lift_pct: number|null; significance: number|null;
  notes: string|null; source: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentWinner {
  id: string; plan_id: string|null; variant_id: string|null; winning_hypothesis: string;
  recommendation: Recommendation; confidence: number; requires_external_rollout: boolean;
  founder_decision: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentFailure {
  id: string; plan_id: string|null; failure_reason: string; detail: string|null;
  recommendation: Recommendation; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ExperimentLearning {
  id: string; plan_id: string|null; topic: string; learning: string;
  applies_to: string|null; feeds_into: string|null; confidence: number; applied: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listPlans(): Promise<ExperimentPlan[]> {
  const { data } = await sb.from("experiment_plans").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentPlan[];
}
export async function listVariants(): Promise<ExperimentVariant[]> {
  const { data } = await sb.from("experiment_variants").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentVariant[];
}
export async function listMetrics(): Promise<ExperimentMetric[]> {
  const { data } = await sb.from("experiment_metrics").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentMetric[];
}
export async function listResults(): Promise<ExperimentResult[]> {
  const { data } = await sb.from("experiment_results").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentResult[];
}
export async function listWinners(): Promise<ExperimentWinner[]> {
  const { data } = await sb.from("experiment_winners").select("*").order("confidence",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentWinner[];
}
export async function listFailures(): Promise<ExperimentFailure[]> {
  const { data } = await sb.from("experiment_failures").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentFailure[];
}
export async function listLearnings(): Promise<ExperimentLearning[]> {
  const { data } = await sb.from("experiment_learnings").select("*").order("confidence",{ascending:false}).limit(500);
  return (data ?? []) as ExperimentLearning[];
}

export interface ExperimentSummary {
  plansTotal: number; plansDraft: number; plansApproved: number; plansRunning: number;
  pendingApproval: number; winnersPending: number; learningsApplied: number; learningsTotal: number;
  failures: number; watchItems: string[];
}

export async function summariseExperiments(): Promise<ExperimentSummary> {
  const [plans, winners, learnings, failures] = await Promise.all([listPlans(), listWinners(), listLearnings(), listFailures()]);
  const pendingApproval = plans.filter(p => p.approval_status === "pending" && p.requires_external_launch).length;
  const winnersPending = winners.filter(w => w.requires_external_rollout && !w.founder_decision).length;
  const learningsApplied = learnings.filter(l => l.applied).length;
  const watch: string[] = [];
  if (pendingApproval) watch.push(`${pendingApproval} experiment plan(s) awaiting founder approval before external launch`);
  if (winnersPending) watch.push(`${winnersPending} winning hypothesis ready to scale — awaiting founder approval`);
  if (failures.length) watch.push(`${failures.length} failed experiment(s) logged — review before retest`);
  return {
    plansTotal: plans.length,
    plansDraft: plans.filter(p=>p.status==="draft").length,
    plansApproved: plans.filter(p=>p.status==="approved").length,
    plansRunning: plans.filter(p=>p.status==="running").length,
    pendingApproval, winnersPending,
    learningsApplied, learningsTotal: learnings.length,
    failures: failures.length,
    watchItems: watch,
  };
}