import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchJobs, fetchRuns, fetchFailures, summarize, type JobsSummary } from "@/lib/scheduledJobs";

export default function ScheduledJobsCard() {
  const [sum, setSum] = useState<JobsSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchJobs(), fetchRuns(100), fetchFailures()])
      .then(([j, r, f]) => setSum(summarize(j, r, f)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock size={14} className="text-primary" />
          Scheduled Jobs Health
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> External gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Daily, weekly and monthly automation. Jobs scan, analyse and create internal work items live. Sending, spending and mutating providers remain founder-approval-gated.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/scheduled-jobs/jobs"     label="Active"          value={sum?.jobs_active} />
          <Tile to="/founder/scheduled-jobs/runs"     label="Failed 24h"      value={sum?.jobs_failed_today} cls={bad(sum?.jobs_failed_today ?? 0)} />
          <Tile to="/founder/scheduled-jobs/jobs"     label="Overdue"         value={sum?.jobs_overdue} cls={warn(sum?.jobs_overdue ?? 0)} />
          <Tile to="/founder/scheduled-jobs/jobs"     label="External off"    value={sum?.jobs_external_disabled} />
          <Tile to="/founder/scheduled-jobs/failures" label="Open failures"   value={sum?.open_failures} cls={warn(sum?.open_failures ?? 0)} />
          <Tile to="/founder/scheduled-jobs/calendar" label="Next due (min)"  value={sum?.next_job_due?.in_minutes ?? "—"} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
            <p className="text-[11px] text-muted-foreground">{sum.recommended_action}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/scheduled-jobs" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/scheduled-jobs/jobs" className="text-primary hover:underline">Jobs</Link>
          <Link to="/founder/scheduled-jobs/runs" className="text-primary hover:underline">Runs</Link>
          <Link to="/founder/scheduled-jobs/failures" className="text-primary hover:underline">Failures</Link>
          <Link to="/founder/scheduled-jobs/calendar" className="text-primary hover:underline">Calendar</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}