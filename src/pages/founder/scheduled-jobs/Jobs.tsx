import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SJLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fetchJobs, fetchRuns, CATEGORY_LABEL, toggleJobActive, manualRunInternal, type JobDefinition } from "@/lib/scheduledJobs";
import { Lock, Play } from "lucide-react";
import { toast } from "sonner";

export default function SJJobs() {
  const qc = useQueryClient();
  const jobs = useQuery({ queryKey: ["sj-jobs"], queryFn: fetchJobs });
  const runs = useQuery({ queryKey: ["sj-runs"], queryFn: () => fetchRuns(200) });
  const [filter, setFilter] = useState<string>("");
  const list = (jobs.data ?? []).filter(j =>
    !filter || j.job_name.toLowerCase().includes(filter.toLowerCase()) || j.job_code.includes(filter.toLowerCase())
  );

  const onToggle = async (j: JobDefinition, v: boolean) => {
    const { error } = await toggleJobActive(j.id, v);
    if (error) toast.error(error.message); else { toast.success(`${j.job_name} ${v ? "enabled" : "disabled"}`); qc.invalidateQueries({ queryKey: ["sj-jobs"] }); }
  };
  const onRun = async (j: JobDefinition) => {
    const { error } = await manualRunInternal(j, "Triggered from founder console");
    if (error) toast.error(error.message); else { toast.success(`Internal run recorded for ${j.job_name}`); qc.invalidateQueries({ queryKey: ["sj-runs"] }); }
  };

  return (
    <SJLayout title="Jobs">
      <Card className="tech-card p-3">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter jobs…"
               className="w-full bg-secondary border border-border/50 rounded px-2 py-1 text-xs" />
      </Card>
      <div className="space-y-2">
        {list.map(j => {
          const last = (runs.data ?? []).find(r => r.job_definition_id === j.id);
          return (
            <Card key={j.id} className="tech-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{j.job_name}</p>
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[j.job_category] ?? j.job_category}</Badge>
                    <Badge variant="outline" className="text-[10px] bg-secondary/40">{j.schedule_cron}</Badge>
                    {j.external_action_possible && (
                      <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                        <Lock size={8} className="mr-1" /> external {j.external_action_allowed ? "allowed" : "blocked"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{j.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Code <code>{j.job_code}</code> · Owner {j.owner_module ?? "—"} · TZ {j.timezone}
                    {last && <> · Last {last.run_status} {last.started_at?.slice(0, 16).replace("T", " ")}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={j.active} onCheckedChange={v => onToggle(j, v)} />
                  <Button size="sm" variant="outline" onClick={() => onRun(j)}>
                    <Play size={12} className="mr-1" /> Run (internal)
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {!list.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No jobs match.</Card>}
      </div>
    </SJLayout>
  );
}