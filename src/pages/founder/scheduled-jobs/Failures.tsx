import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SJLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJobs, fetchFailures } from "@/lib/scheduledJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sevCls = (s: string) =>
  s === "critical" ? "bg-red-500/15 text-red-300 border-red-500/30" :
  s === "high" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
  s === "medium" ? "bg-blue-500/15 text-blue-300 border-blue-500/30" :
  "bg-muted text-muted-foreground border-border/50";

export default function SJFailures() {
  const qc = useQueryClient();
  const jobs = useQuery({ queryKey: ["sj-jobs"], queryFn: fetchJobs });
  const fails = useQuery({ queryKey: ["sj-fails"], queryFn: fetchFailures });
  const nameById = new Map((jobs.data ?? []).map(j => [j.id, j.job_name]));
  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("scheduled_job_failures").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); qc.invalidateQueries({ queryKey: ["sj-fails"] }); }
  };
  return (
    <SJLayout title="Failed jobs">
      <div className="space-y-2">
        {(fails.data ?? []).map(f => (
          <Card key={f.id} className="tech-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${sevCls(f.severity)}`}>{f.severity}</Badge>
              <Badge variant="outline" className="text-[10px]">{f.failure_type}</Badge>
              <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
              <span className="text-sm font-medium">{nameById.get(f.job_definition_id) ?? f.job_definition_id}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{f.created_at.slice(0, 16).replace("T", " ")}</span>
            </div>
            {f.failure_summary && <p className="text-[11px] mt-1">{f.failure_summary}</p>}
            {f.recommended_action && <p className="text-[11px] text-muted-foreground mt-1">→ {f.recommended_action}</p>}
            {f.status === "open" && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "acknowledged")}>Acknowledge</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "resolved")}>Resolve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "ignored")}>Ignore</Button>
              </div>
            )}
          </Card>
        ))}
        {!fails.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No failures recorded.</Card>}
      </div>
    </SJLayout>
  );
}