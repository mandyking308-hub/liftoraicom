import { supabase } from "@/integrations/supabase/client";

export type SuiteType =
  | "agent_quality" | "safety" | "context_guard" | "cost"
  | "prompt_injection" | "prohibited_claims" | "approval_bypass"
  | "business_specific" | "regression";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RunStatus = "queued" | "running" | "passed" | "failed" | "warning" | "cancelled";
export type ResultStatus = "pass" | "fail" | "warning" | "skipped";

export interface EvalSuite {
  id: string; suite_name: string; suite_type: SuiteType;
  business_id: string|null; agent_key: string|null; active: boolean;
  created_at: string; updated_at: string;
}
export interface EvalCase {
  id: string; suite_id: string; test_name: string; test_prompt: string;
  expected_behaviour: string|null; prohibited_behaviour: string|null;
  business_id: string|null; agent_key: string|null; risk_level: RiskLevel;
  active: boolean; created_at: string; updated_at: string;
}
export interface EvalRun {
  id: string; suite_id: string; run_status: RunStatus;
  started_at: string|null; completed_at: string|null;
  total_tests: number; passed_tests: number; failed_tests: number; warning_tests: number;
  created_at: string; audit_metadata: any;
}
export interface EvalResult {
  id: string; run_id: string; test_case_id: string; result_status: ResultStatus;
  output_summary: string|null; failure_reason: string|null;
  quality_score: number|null; safety_score: number|null; cost_estimate: number|null;
  trace_id: string|null; created_at: string; audit_metadata: any;
}

export const SUITE_TYPE_LABEL: Record<SuiteType, string> = {
  agent_quality: "Agent quality", safety: "Safety", context_guard: "Context guard",
  cost: "Cost", prompt_injection: "Prompt injection", prohibited_claims: "Prohibited claims",
  approval_bypass: "Approval bypass", business_specific: "Business specific", regression: "Regression",
};
export const RUN_STATUS_CLS: Record<RunStatus, string> = {
  queued:    "bg-muted text-muted-foreground border-border/50",
  running:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  passed:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed:    "bg-red-500/15 text-red-300 border-red-500/30",
  warning:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  cancelled: "bg-muted text-muted-foreground border-border/50",
};
export const RESULT_STATUS_CLS: Record<ResultStatus, string> = {
  pass:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  fail:    "bg-red-500/15 text-red-300 border-red-500/30",
  warning: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  skipped: "bg-muted text-muted-foreground border-border/50",
};
export const RISK_CLS: Record<RiskLevel, string> = {
  low:      "bg-muted text-muted-foreground border-border/50",
  medium:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  high:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
};

export async function fetchSuites(): Promise<EvalSuite[]> {
  const { data } = await (supabase as any).from("ai_eval_test_suites").select("*").order("created_at",{ascending:false});
  return (data ?? []) as EvalSuite[];
}
export async function fetchCases(): Promise<EvalCase[]> {
  const { data } = await (supabase as any).from("ai_eval_test_cases").select("*").order("created_at",{ascending:false});
  return (data ?? []) as EvalCase[];
}
export async function fetchRuns(): Promise<EvalRun[]> {
  const { data } = await (supabase as any).from("ai_eval_runs").select("*").order("created_at",{ascending:false}).limit(200);
  return (data ?? []) as EvalRun[];
}
export async function fetchResults(): Promise<EvalResult[]> {
  const { data } = await (supabase as any).from("ai_eval_results").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as EvalResult[];
}

export interface EvalSummary {
  suites: number; active_suites: number; cases: number;
  runs: number; last_run: EvalRun|null;
  total_pass: number; total_fail: number; total_warning: number;
  critical_failures: number; safety_failures: number;
  avg_quality: number|null; avg_safety: number|null; total_cost: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function summarize(
  suites: EvalSuite[], cases: EvalCase[], runs: EvalRun[], results: EvalResult[],
): EvalSummary {
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const pass = results.filter(r => r.result_status === "pass").length;
  const fail = results.filter(r => r.result_status === "fail").length;
  const warn = results.filter(r => r.result_status === "warning").length;
  const safetySuiteIds = new Set(suites.filter(s => ["safety","prompt_injection","approval_bypass","context_guard","prohibited_claims"].includes(s.suite_type)).map(s => s.id));
  const safetyCaseIds = new Set(cases.filter(c => safetySuiteIds.has(c.suite_id)).map(c => c.id));
  const criticalFail = results.filter(r => r.result_status === "fail" && caseMap.get(r.test_case_id)?.risk_level === "critical").length;
  const safetyFail = results.filter(r => r.result_status === "fail" && safetyCaseIds.has(r.test_case_id)).length;
  const qVals = results.map(r => r.quality_score).filter((v): v is number => typeof v === "number");
  const sVals = results.map(r => r.safety_score).filter((v): v is number => typeof v === "number");
  const avgQ = qVals.length ? qVals.reduce((a,b)=>a+b,0)/qVals.length : null;
  const avgS = sVals.length ? sVals.reduce((a,b)=>a+b,0)/sVals.length : null;
  const totalCost = results.reduce((a,r) => a + (Number(r.cost_estimate) || 0), 0);

  let top: EvalSummary["top_alert"] = null;
  if (criticalFail > 0) top = { kind: "critical_fail", summary: `${criticalFail} critical-risk eval(s) failed`, severity: "critical" };
  else if (safetyFail > 0) top = { kind: "safety_fail", summary: `${safetyFail} safety eval failure(s)`, severity: "high" };
  else if (fail > 0) top = { kind: "fail", summary: `${fail} test(s) failing`, severity: "medium" };
  else if (warn > 0) top = { kind: "warn", summary: `${warn} test(s) returning warnings`, severity: "low" };

  return {
    suites: suites.length, active_suites: suites.filter(s => s.active).length, cases: cases.length,
    runs: runs.length, last_run: runs[0] ?? null,
    total_pass: pass, total_fail: fail, total_warning: warn,
    critical_failures: criticalFail, safety_failures: safetyFail,
    avg_quality: avgQ, avg_safety: avgS, total_cost: totalCost,
    top_alert: top,
  };
}

/** Heuristic offline evaluator. Inspects expected vs prohibited keywords against a simulated output. */
export function heuristicEvaluate(c: EvalCase, simulatedOutput: string): { status: ResultStatus; reason: string; quality: number; safety: number } {
  const out = simulatedOutput.toLowerCase();
  let safety = 1, quality = 0.8, status: ResultStatus = "pass", reason = "matched expected behaviour";
  if (c.prohibited_behaviour) {
    const tokens = c.prohibited_behaviour.toLowerCase().split(/[,;]/).map(t => t.trim()).filter(Boolean);
    for (const tok of tokens) {
      if (tok && out.includes(tok)) {
        return { status: "fail", reason: `Output contains prohibited token: "${tok}"`, quality: 0.2, safety: 0.1 };
      }
    }
  }
  if (c.expected_behaviour) {
    const tokens = c.expected_behaviour.toLowerCase().split(/[,;]/).map(t => t.trim()).filter(Boolean);
    const matched = tokens.filter(t => t && out.includes(t)).length;
    quality = tokens.length ? matched / tokens.length : 0.8;
    if (matched === 0) { status = "warning"; reason = "Did not echo expected behaviour cues"; safety = 0.7; }
  }
  return { status, reason, quality, safety };
}