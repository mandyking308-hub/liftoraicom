import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSuites, fetchCases, fetchRuns, fetchResults, summarize, type EvalSummary } from "@/lib/aiEvalEngine";

export default function AiEvalCard() {
  const [sum, setSum] = useState<EvalSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSuites(), fetchCases(), fetchRuns(), fetchResults()])
      .then(([s,c,r,res]) => setSum(summarize(s,c,r,res)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Beaker size={14} className="text-primary" />
          AI Evaluation / Regression
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Recurring safety, prompt injection, prohibited-claim, approval-bypass and quality tests across all agents. Failures create work items — they do not stop normal operation.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/ai-evals/test-suites" label="Suites" value={sum?.active_suites} />
          <Tile to="/founder/ai-evals/results"     label="Pass"    value={sum?.total_pass} />
          <Tile to="/founder/ai-evals/results"     label="Warning" value={sum?.total_warning} cls={warn(sum?.total_warning ?? 0)} />
          <Tile to="/founder/ai-evals/results"     label="Fail"    value={sum?.total_fail}    cls={bad(sum?.total_fail ?? 0)} />
          <Tile to="/founder/ai-evals/safety"      label="Critical" value={sum?.critical_failures} cls={bad(sum?.critical_failures ?? 0)} />
          <Tile to="/founder/ai-evals/safety"      label="Safety fail" value={sum?.safety_failures} cls={bad(sum?.safety_failures ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/ai-evals" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/ai-evals/test-suites" className="text-primary hover:underline">Suites</Link>
          <Link to="/founder/ai-evals/results" className="text-primary hover:underline">Results</Link>
          <Link to="/founder/ai-evals/agents" className="text-primary hover:underline">Agents</Link>
          <Link to="/founder/ai-evals/safety" className="text-primary hover:underline">Safety</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}