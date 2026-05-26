import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvalLayout } from "./_shared";
import { fetchRuns, fetchSuites, RUN_STATUS_CLS, SUITE_TYPE_LABEL, type EvalRun, type EvalSuite } from "@/lib/aiEvalEngine";

export default function Regression() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [suites, setSuites] = useState<EvalSuite[]>([]);
  useEffect(() => { Promise.all([fetchRuns(), fetchSuites()]).then(([r,s]) => { setRuns(r); setSuites(s); }).catch(() => {}); }, []);
  const suiteMap = new Map(suites.map(s => [s.id, s]));
  return (
    <EvalLayout title="Regression Board" subtitle="History of suite runs. Compare current and prior runs to detect regressions in quality, safety or behaviour.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">When</th><th className="text-left p-1">Suite</th>
            <th className="text-left p-1">Type</th><th className="text-left p-1">Status</th>
            <th className="text-left p-1">Total</th><th className="text-left p-1">Pass</th>
            <th className="text-left p-1">Warn</th><th className="text-left p-1">Fail</th>
          </tr></thead>
          <tbody>
            {runs.map(r => {
              const s = suiteMap.get(r.suite_id);
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-1 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-1">{s?.suite_name ?? r.suite_id.slice(0,8)}</td>
                  <td className="p-1 text-muted-foreground">{s ? SUITE_TYPE_LABEL[s.suite_type] : "—"}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${RUN_STATUS_CLS[r.run_status]}`}>{r.run_status}</Badge></td>
                  <td className="p-1">{r.total_tests}</td>
                  <td className="p-1">{r.passed_tests}</td>
                  <td className="p-1">{r.warning_tests}</td>
                  <td className="p-1">{r.failed_tests}</td>
                </tr>
              );
            })}
            {runs.length === 0 && <tr><td colSpan={8} className="p-3 text-muted-foreground text-center">No runs yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EvalLayout>
  );
}