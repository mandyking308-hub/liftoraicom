import { useQuery } from "@tanstack/react-query";
import { DepLayout, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listDeployments } from "@/lib/deploymentControl";

export default function DepRollback() {
  const { data: rows = [] } = useQuery({ queryKey: ["dep-rollback"], queryFn: () => listDeployments(500) });
  const failed = rows.filter(r => r.deployment_status === "failed");
  const rolled = rows.filter(r => r.deployment_status === "rolled_back");
  return (
    <DepLayout title="Rollback checklist" subtitle="Reference notes for rollback decisions. The platform never performs a rollback automatically — the founder or admin executes it via Lovable / backend tooling.">
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Rollback checklist</h3>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Confirm scope: frontend only, edge function, migration, or full stack.</li>
          <li>Open the corresponding incident in the Incident Engine; link the failed deployment id.</li>
          <li>Verify Backup/Recovery snapshot exists and is no older than the rollback window.</li>
          <li>For DB migrations: prepare reverse migration; never edit historical migration files.</li>
          <li>For edge functions: redeploy previous version; clear caches if applicable.</li>
          <li>Re-verify environment variables and secret rotations before reopening.</li>
          <li>Append rollback notes to the deployment record; mark status rolled_back.</li>
        </ol>
      </Card>
      <h2 className="text-sm font-semibold mt-2">Failed deployments</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Release</th><th className="text-left p-2">Status</th><th className="text-left p-2">Build</th><th className="text-left p-2">Notes</th>
          </tr></thead>
          <tbody>
            {failed.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No failed deployments.</td></tr>}
            {failed.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.release_name ?? "—"}</td>
                <td className="p-2"><StatusBadge status={r.deployment_status} /></td>
                <td className="p-2 text-muted-foreground">{r.build_status ?? "—"}</td>
                <td className="p-2 max-w-[280px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <h2 className="text-sm font-semibold mt-2">Rolled-back deployments</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Release</th><th className="text-left p-2">Notes</th>
          </tr></thead>
          <tbody>
            {rolled.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No rollbacks recorded.</td></tr>}
            {rolled.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.release_name ?? "—"}</td>
                <td className="p-2 max-w-[320px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}