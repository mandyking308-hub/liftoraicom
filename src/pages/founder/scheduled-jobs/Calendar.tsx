import { useQuery } from "@tanstack/react-query";
import { SJLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobs, estimateNextDue, CATEGORY_LABEL } from "@/lib/scheduledJobs";

export default function SJCalendar() {
  const jobs = useQuery({ queryKey: ["sj-jobs"], queryFn: fetchJobs });
  const upcoming = (jobs.data ?? [])
    .filter(j => j.active)
    .map(j => ({ job: j, next: estimateNextDue(j.schedule_cron, j.timezone) }))
    .filter(x => x.next)
    .sort((a, b) => (a.next!.getTime() - b.next!.getTime()));
  return (
    <SJLayout title="Job calendar" subtitle="Estimated next run for each active job. Approximation based on the first 5 cron fields.">
      <div className="space-y-2">
        {upcoming.map(({ job, next }) => (
          <Card key={job.id} className="tech-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[job.job_category]}</Badge>
              <span className="text-sm font-medium">{job.job_name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{next!.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              <code>{job.schedule_cron}</code> · {job.timezone} · {job.job_code}
            </p>
          </Card>
        ))}
        {!upcoming.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No active jobs scheduled.</Card>}
      </div>
    </SJLayout>
  );
}