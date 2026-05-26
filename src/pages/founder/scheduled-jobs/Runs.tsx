import { useQuery } from "@tanstack/react-query";
import { SJLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobs, fetchRuns, STATUS_META } from "@/lib/scheduledJobs";

export default function SJRuns() {
  const jobs = useQuery({ queryKey: ["sj-jobs"], queryFn: fetchJobs });
  const runs = useQuery({ queryKey: ["sj-runs"], queryFn: () => fetchRuns(200) });
  const nameById = new Map((jobs.data ?? []).map(j => [j.id, j.job_name]));
  return (
    <SJLayout title="Run history">
      <div className="space-y-2">
        {(runs.data ?? []).map(r => {
          const meta = STATUS_META[r.run_status];
          return (
            <Card key={r.id} className="tech-card p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                <span className="text-sm font-medium">{nameById.get(r.job_definition_id) ?? r.job_definition_id}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{r.started_at?.slice(0, 19).replace("T", " ") ?? "—"}</span>
              </div>
              {r.output_summary && <p className="text-[11px] text-muted-foreground mt-1">{r.output_summary}</p>}
              {r.failure_reason && <p className="text-[11px] text-red-300 mt-1">{r.failure_reason}</p>}
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                <span>Work items {r.created_work_items_count}</span>
                <span>Notifications {r.created_notifications_count}</span>
                <span>External attempts {r.external_actions_attempted_count}</span>
                <span>External blocked {r.external_actions_blocked_count}</span>
                {r.duration_ms != null && <span>{r.duration_ms} ms</span>}
              </div>
            </Card>
          );
        })}
        {!runs.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No runs recorded yet.</Card>}
      </div>
    </SJLayout>
  );
}