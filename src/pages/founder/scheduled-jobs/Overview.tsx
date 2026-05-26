import { useQuery } from "@tanstack/react-query";
import { SJLayout, SJStat } from "./_shared";
import { Card } from "@/components/ui/card";
import { fetchJobs, fetchRuns, fetchFailures, summarize, STATUS_META } from "@/lib/scheduledJobs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function SJOverview() {
  const jobs = useQuery({ queryKey: ["sj-jobs"], queryFn: fetchJobs });
  const runs = useQuery({ queryKey: ["sj-runs"], queryFn: () => fetchRuns(50) });
  const fails = useQuery({ queryKey: ["sj-fails"], queryFn: fetchFailures });
  const sum = jobs.data && runs.data && fails.data
    ? summarize(jobs.data, runs.data, fails.data)
    : null;

  return (
    <SJLayout title="Scheduled Jobs — Overview"
      subtitle="Recurring jobs for daily, weekly and monthly operations. Jobs analyse, scan and create internal work items live. External actions (send, publish, spend, mutate provider state) remain founder-approval-gated by default.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <SJStat label="Jobs active"          value={sum?.jobs_active ?? "—"} tone="ok" />
        <SJStat label="Failed (24h)"         value={sum?.jobs_failed_today ?? "—"} tone={(sum?.jobs_failed_today ?? 0) > 0 ? "bad" : "ok"} />
        <SJStat label="Overdue"              value={sum?.jobs_overdue ?? "—"} tone={(sum?.jobs_overdue ?? 0) > 0 ? "warn" : "ok"} />
        <SJStat label="External disabled"    value={sum?.jobs_external_disabled ?? "—"} hint="Possible but blocked" />
        <SJStat label="Open failures"        value={sum?.open_failures ?? "—"} tone={(sum?.open_failures ?? 0) > 0 ? "warn" : "ok"} />
        <SJStat label="External blocked 24h" value={sum?.external_blocks_today ?? "—"} />
      </div>

      {sum?.top_alert && (
        <Card className="tech-card p-3 border-primary/30 bg-primary/5">
          <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
          <p className="text-sm font-semibold">{sum.top_alert.summary}</p>
          <p className="text-xs text-muted-foreground mt-1">{sum.recommended_action}</p>
        </Card>
      )}

      {sum?.next_job_due && (
        <Card className="tech-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Next job due</p>
          <p className="text-sm font-medium">{sum.next_job_due.name} <span className="text-muted-foreground">· {sum.next_job_due.code}</span></p>
          <p className="text-xs text-muted-foreground">In ~{sum.next_job_due.in_minutes} minutes (estimated).</p>
        </Card>
      )}

      <Card className="tech-card p-3">
        <p className="text-xs font-semibold mb-2">Recent runs</p>
        <div className="space-y-1 text-xs">
          {(runs.data ?? []).slice(0, 10).map(r => {
            const def = jobs.data?.find(j => j.id === r.job_definition_id);
            const meta = STATUS_META[r.run_status];
            return (
              <div key={r.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
                <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                <span className="truncate flex-1">{def?.job_name ?? r.job_definition_id}</span>
                <span className="text-muted-foreground">{r.started_at?.slice(0,16).replace("T"," ") ?? "—"}</span>
              </div>
            );
          })}
          {!runs.data?.length && <p className="text-muted-foreground">No runs recorded yet.</p>}
        </div>
        <div className="mt-2 flex gap-3 text-[11px]">
          <Link to="/founder/scheduled-jobs/jobs" className="text-primary hover:underline">Jobs</Link>
          <Link to="/founder/scheduled-jobs/runs" className="text-primary hover:underline">Runs</Link>
          <Link to="/founder/scheduled-jobs/failures" className="text-primary hover:underline">Failures</Link>
          <Link to="/founder/scheduled-jobs/calendar" className="text-primary hover:underline">Calendar</Link>
        </div>
      </Card>
    </SJLayout>
  );
}