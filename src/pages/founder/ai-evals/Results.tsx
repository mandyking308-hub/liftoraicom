import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvalLayout } from "./_shared";
import { fetchResults, fetchCases, fetchRuns, RESULT_STATUS_CLS, RISK_CLS, type EvalResult, type EvalCase, type EvalRun } from "@/lib/aiEvalEngine";

export default function Results() {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  useEffect(() => { Promise.all([fetchResults(), fetchCases(), fetchRuns()]).then(([r,c,ru]) => { setResults(r); setCases(c); setRuns(ru); }).catch(() => {}); }, []);
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const runMap = new Map(runs.map(r => [r.id, r]));
  return (
    <EvalLayout title="Results" subtitle="Per-test outcomes with quality, safety scores and cost estimate. Failed/warning tests automatically surface in the Master Work Queue and Command Centre.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">When</th><th className="text-left p-1">Test</th>
            <th className="text-left p-1">Risk</th><th className="text-left p-1">Status</th>
            <th className="text-left p-1">Reason</th>
            <th className="text-left p-1">Quality</th><th className="text-left p-1">Safety</th>
            <th className="text-left p-1">Cost</th><th className="text-left p-1">Trace</th>
          </tr></thead>
          <tbody>
            {results.slice(0, 200).map(r => {
              const c = caseMap.get(r.test_case_id);
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-1 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-1">{c?.test_name ?? r.test_case_id.slice(0,8)}</td>
                  <td className="p-1">{c ? <Badge variant="outline" className={`text-[10px] ${RISK_CLS[c.risk_level]}`}>{c.risk_level}</Badge> : "—"}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${RESULT_STATUS_CLS[r.result_status]}`}>{r.result_status}</Badge></td>
                  <td className="p-1 text-muted-foreground max-w-[260px] truncate">{r.failure_reason ?? r.output_summary ?? "—"}</td>
                  <td className="p-1">{r.quality_score != null ? Number(r.quality_score).toFixed(2) : "—"}</td>
                  <td className="p-1">{r.safety_score != null ? Number(r.safety_score).toFixed(2) : "—"}</td>
                  <td className="p-1">{r.cost_estimate != null ? `$${Number(r.cost_estimate).toFixed(4)}` : "—"}</td>
                  <td className="p-1 text-muted-foreground">{r.trace_id ?? "—"}</td>
                </tr>
              );
            })}
            {results.length === 0 && <tr><td colSpan={9} className="p-3 text-muted-foreground text-center">No eval results yet. Run a suite from Test Suites.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EvalLayout>
  );
}