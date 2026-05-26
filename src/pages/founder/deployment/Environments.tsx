import { useQuery } from "@tanstack/react-query";
import { DepLayout, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listEnvironments } from "@/lib/deploymentControl";

export default function DepEnvironments() {
  const { data: envs = [] } = useQuery({ queryKey: ["dep-envs-full"], queryFn: listEnvironments });
  return (
    <DepLayout title="Environments" subtitle="All tracked environments. Status reflects last verified state — environment changes happen outside this module.">
      <div className="grid md:grid-cols-2 gap-3">
        {envs.length === 0 && <Card className="tech-card p-4 text-xs text-muted-foreground">No environments yet.</Card>}
        {envs.map(e => (
          <Card key={e.id} className="tech-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold capitalize">{e.environment_name}</h3>
              <StatusBadge status={e.environment_status} />
              {!e.active && <span className="text-[10px] text-muted-foreground">(inactive)</span>}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="text-foreground">App URL:</span> {e.app_url ?? "—"}</p>
              <p><span className="text-foreground">Backend:</span> {e.supabase_project_summary ?? "—"}</p>
              <p><span className="text-foreground">Branch:</span> {e.branch_summary ?? "—"}</p>
              <p className="text-[10px]">Updated {new Date(e.updated_at).toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>
    </DepLayout>
  );
}