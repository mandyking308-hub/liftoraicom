import { useQuery } from "@tanstack/react-query";
import { DepLayout, Stat, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { summariseDeployment, listEnvironments, listDeployments } from "@/lib/deploymentControl";

export default function DepOverview() {
  const { data: s } = useQuery({ queryKey: ["dep-summary"], queryFn: summariseDeployment, refetchInterval: 60000 });
  const { data: envs = [] } = useQuery({ queryKey: ["dep-envs"], queryFn: listEnvironments });
  const { data: recent = [] } = useQuery({ queryKey: ["dep-recent"], queryFn: () => listDeployments(15) });
  return (
    <DepLayout title="Environment & Deployment Control" subtitle="Live visibility of environments, deployments, migrations, edge functions and required environment variables. No deployment, rollback or secret change is performed from this module.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Environments" value={s?.environments ?? 0} />
        <Stat label="Env errors" value={s?.envError ?? 0} tone={s?.envError ? "bad" : "ok"} />
        <Stat label="Deployments" value={s?.totalDeployments ?? 0} />
        <Stat label="Failed deploys" value={s?.failedDeployments ?? 0} tone={s?.failedDeployments ? "bad" : "ok"} />
        <Stat label="Failed migrations" value={s?.failedMigrations ?? 0} tone={s?.failedMigrations ? "bad" : "ok"} />
        <Stat label="Failed functions" value={s?.failedFunctions ?? 0} tone={s?.failedFunctions ? "bad" : "ok"} />
        <Stat label="Pending deploys" value={s?.pending ?? 0} tone={s?.pending ? "warn" : undefined} />
        <Stat label="Pending migrations" value={s?.pendingMigrations ?? 0} tone={s?.pendingMigrations ? "warn" : undefined} />
        <Stat label="Rolled back" value={s?.rolledBack ?? 0} tone={s?.rolledBack ? "warn" : undefined} />
        <Stat label="Missing critical vars" value={s?.missingCriticalVars ?? 0} tone={s?.missingCriticalVars ? "bad" : "ok"} />
        <Stat label="Missing high vars" value={s?.missingHighVars ?? 0} tone={s?.missingHighVars ? "warn" : undefined} />
        <Stat label="Env warnings" value={s?.envWarning ?? 0} tone={s?.envWarning ? "warn" : undefined} />
      </div>
      {s && s.watchItems.length > 0 && (
        <Card className="tech-card p-3 border-yellow-500/40">
          <p className="text-xs text-yellow-300 font-semibold mb-1">Watch items</p>
          <ul className="text-xs text-yellow-200/90 list-disc pl-5">{s.watchItems.map((w,i) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <h2 className="text-sm font-semibold mt-2">Environments</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Status</th><th className="text-left p-2">App URL</th><th className="text-left p-2">Backend</th><th className="text-left p-2">Branch</th><th className="text-left p-2">Active</th>
          </tr></thead>
          <tbody>
            {envs.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No environments tracked.</td></tr>}
            {envs.map(e => (
              <tr key={e.id} className="border-t border-border/30">
                <td className="p-2 capitalize">{e.environment_name}</td>
                <td className="p-2"><StatusBadge status={e.environment_status} /></td>
                <td className="p-2 text-muted-foreground break-all">{e.app_url ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{e.supabase_project_summary ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{e.branch_summary ?? "—"}</td>
                <td className="p-2">{e.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <h2 className="text-sm font-semibold mt-2">Recent deployments</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Release</th><th className="text-left p-2">Commit</th><th className="text-left p-2">Status</th><th className="text-left p-2">Build</th><th className="text-left p-2">Tests</th><th className="text-left p-2">By</th>
          </tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No deployments tracked.</td></tr>}
            {recent.map(d => (
              <tr key={d.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                <td className="p-2">{d.release_name ?? "—"}</td>
                <td className="p-2 font-mono text-[10px]">{d.commit_hash ? d.commit_hash.slice(0,10) : "—"}</td>
                <td className="p-2"><StatusBadge status={d.deployment_status} /></td>
                <td className="p-2 text-muted-foreground">{d.build_status ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{d.test_status ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{d.deployed_by ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}