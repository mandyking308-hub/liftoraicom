import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvalLayout } from "./_shared";
import { fetchResults, fetchCases, fetchSuites, RESULT_STATUS_CLS, RISK_CLS, type EvalResult, type EvalCase, type EvalSuite } from "@/lib/aiEvalEngine";

const SAFETY_TYPES = ["safety","prompt_injection","approval_bypass","context_guard","prohibited_claims"];

export default function Safety() {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [suites, setSuites] = useState<EvalSuite[]>([]);
  useEffect(() => { Promise.all([fetchResults(), fetchCases(), fetchSuites()]).then(([r,c,s]) => { setResults(r); setCases(c); setSuites(s); }).catch(() => {}); }, []);
  const safetySuites = new Set(suites.filter(s => SAFETY_TYPES.includes(s.suite_type)).map(s => s.id));
  const safetyCases = new Map(cases.filter(c => safetySuites.has(c.suite_id)).map(c => [c.id, c]));
  const safetyResults = results.filter(r => safetyCases.has(r.test_case_id));
  const failures = safetyResults.filter(r => r.result_status !== "pass");
  return (
    <EvalLayout title="Safety Regression Board" subtitle="Safety, prompt injection, approval bypass, context guard and prohibited-claim test outcomes. High/critical failures generate Command Centre warnings and recommended fixes.">
      <Card className="tech-card p-3 text-xs space-y-1">
        <p>Safety test cases: <span className="text-foreground font-semibold">{safetyCases.size}</span> · Recent safety results: <span className="text-foreground font-semibold">{safetyResults.length}</span> · Failures/warnings: <span className="text-foreground font-semibold">{failures.length}</span></p>
      </Card>
      <Card className="tech-card p-3">
        <p className="text-xs font-semibold mb-2">Failed/warning safety tests</p>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">When</th><th className="text-left p-1">Test</th>
            <th className="text-left p-1">Risk</th><th className="text-left p-1">Status</th>
            <th className="text-left p-1">Reason</th><th className="text-left p-1">Recommendation</th>
          </tr></thead>
          <tbody>
            {failures.slice(0, 200).map(r => {
              const c = safetyCases.get(r.test_case_id);
              const rec = recommend(r.result_status, c?.risk_level);
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-1 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-1">{c?.test_name ?? r.test_case_id.slice(0,8)}</td>
                  <td className="p-1">{c ? <Badge variant="outline" className={`text-[10px] ${RISK_CLS[c.risk_level]}`}>{c.risk_level}</Badge> : "—"}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${RESULT_STATUS_CLS[r.result_status]}`}>{r.result_status}</Badge></td>
                  <td className="p-1 text-muted-foreground max-w-[260px] truncate">{r.failure_reason ?? "—"}</td>
                  <td className="p-1 text-muted-foreground">{rec}</td>
                </tr>
              );
            })}
            {failures.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No safety failures recorded.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EvalLayout>
  );
}

function recommend(status: string, risk?: string) {
  if (status === "fail" && (risk === "critical" || risk === "high")) return "Pause agent · tighten system prompt · add guardrail";
  if (status === "fail") return "Refine prompt template and re-run within 24h";
  if (status === "warning") return "Add example to expected_behaviour and re-test";
  return "Monitor";
}