import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvalLayout } from "./_shared";
import { fetchResults, fetchCases, fetchSuites, type EvalResult, type EvalCase, type EvalSuite } from "@/lib/aiEvalEngine";

export default function Agents() {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [suites, setSuites] = useState<EvalSuite[]>([]);
  useEffect(() => { Promise.all([fetchResults(), fetchCases(), fetchSuites()]).then(([r,c,s]) => { setResults(r); setCases(c); setSuites(s); }).catch(() => {}); }, []);
  const rows = useMemo(() => {
    const caseMap = new Map(cases.map(c => [c.id, c]));
    const suiteMap = new Map(suites.map(s => [s.id, s]));
    const byAgent = new Map<string, { pass: number; warn: number; fail: number; q: number[]; s: number[] }>();
    for (const r of results) {
      const c = caseMap.get(r.test_case_id);
      const agent = c?.agent_key ?? suiteMap.get(c?.suite_id ?? "")?.agent_key ?? "(unassigned)";
      const a = byAgent.get(agent) ?? { pass:0, warn:0, fail:0, q:[], s:[] };
      if (r.result_status === "pass") a.pass++; else if (r.result_status === "fail") a.fail++; else if (r.result_status === "warning") a.warn++;
      if (typeof r.quality_score === "number") a.q.push(Number(r.quality_score));
      if (typeof r.safety_score === "number") a.s.push(Number(r.safety_score));
      byAgent.set(agent, a);
    }
    return Array.from(byAgent.entries()).map(([agent, x]) => ({
      agent, ...x,
      avgQ: x.q.length ? x.q.reduce((a,b)=>a+b,0)/x.q.length : null,
      avgS: x.s.length ? x.s.reduce((a,b)=>a+b,0)/x.s.length : null,
    })).sort((a,b) => b.fail - a.fail);
  }, [results, cases, suites]);
  return (
    <EvalLayout title="Agent Quality" subtitle="Aggregate quality and safety per agent. Agents with sustained failures are candidates for prompt rework or pause.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Agent</th><th className="text-left p-1">Pass</th>
            <th className="text-left p-1">Warn</th><th className="text-left p-1">Fail</th>
            <th className="text-left p-1">Avg quality</th><th className="text-left p-1">Avg safety</th>
            <th className="text-left p-1">Status</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.agent} className="border-t border-border/50">
                <td className="p-1">{r.agent}</td>
                <td className="p-1">{r.pass}</td><td className="p-1">{r.warn}</td><td className="p-1">{r.fail}</td>
                <td className="p-1">{r.avgQ != null ? r.avgQ.toFixed(2) : "—"}</td>
                <td className="p-1">{r.avgS != null ? r.avgS.toFixed(2) : "—"}</td>
                <td className="p-1">{r.fail > 0 ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">watch</Badge> : <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">ok</Badge>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-3 text-muted-foreground text-center">No agent results yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EvalLayout>
  );
}