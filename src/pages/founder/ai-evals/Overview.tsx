import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvalLayout, EvalStat } from "./_shared";
import { fetchSuites, fetchCases, fetchRuns, fetchResults, summarize, type EvalSummary } from "@/lib/aiEvalEngine";

export default function EvalsOverview() {
  const [sum, setSum] = useState<EvalSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSuites(), fetchCases(), fetchRuns(), fetchResults()])
      .then(([s,c,r,res]) => setSum(summarize(s,c,r,res)))
      .catch(() => setSum(null));
  }, []);
  return (
    <EvalLayout title="AI Evaluation Overview" subtitle="Recurring tests run live against agents for safety, prompt injection, context guarding, prohibited claims, approval bypass and quality. Failures create work items but do not stop normal operation.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <EvalStat label="Suites" value={sum?.suites ?? "—"} hint={`${sum?.active_suites ?? 0} active`} />
        <EvalStat label="Test cases" value={sum?.cases ?? "—"} />
        <EvalStat label="Runs" value={sum?.runs ?? "—"} />
        <EvalStat label="Last run" value={sum?.last_run ? new Date(sum.last_run.created_at).toLocaleString() : "—"} />
        <EvalStat label="Pass" value={sum?.total_pass ?? "—"} tone="ok" />
        <EvalStat label="Warning" value={sum?.total_warning ?? "—"} tone={(sum?.total_warning ?? 0) > 0 ? "warn" : "ok"} />
        <EvalStat label="Fail" value={sum?.total_fail ?? "—"} tone={(sum?.total_fail ?? 0) > 0 ? "bad" : "ok"} />
        <EvalStat label="Critical failures" value={sum?.critical_failures ?? "—"} tone={(sum?.critical_failures ?? 0) > 0 ? "bad" : "ok"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <EvalStat label="Safety failures" value={sum?.safety_failures ?? "—"} tone={(sum?.safety_failures ?? 0) > 0 ? "bad" : "ok"} />
        <EvalStat label="Avg quality" value={sum?.avg_quality != null ? sum.avg_quality.toFixed(2) : "—"} />
        <EvalStat label="Eval cost (est.)" value={sum?.total_cost != null ? `$${sum.total_cost.toFixed(4)}` : "—"} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top alert</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {sum?.top_alert ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">{sum.top_alert.severity}</Badge>
              <span className="text-foreground">{sum.top_alert.summary}</span>
            </div>
          ) : <p>No open alerts.</p>}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integrated with</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          AI Gateway · AI Cost Governor · Prompt Templates · Context Guard · Business Compliance · Master Work Queue · Command Centre · Manuals.
        </CardContent>
      </Card>
    </EvalLayout>
  );
}