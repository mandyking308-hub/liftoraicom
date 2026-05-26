import { useQuery } from "@tanstack/react-query";
import { DepLayout, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listDeployments } from "@/lib/deploymentControl";

export default function DepReleases() {
  const { data: rows = [] } = useQuery({ queryKey: ["dep-releases"], queryFn: () => listDeployments(500) });
  return (
    <DepLayout title="Deployment history" subtitle="Append-only log of releases. Failed deployments should link to an incident.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Release</th><th className="text-left p-2">Commit</th><th className="text-left p-2">Status</th><th className="text-left p-2">Build</th><th className="text-left p-2">Tests</th><th className="text-left p-2">By</th><th className="text-left p-2">Notes</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No deployments.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.release_name ?? "—"}</td>
                <td className="p-2 font-mono text-[10px]">{r.commit_hash ? r.commit_hash.slice(0,10) : "—"}</td>
                <td className="p-2"><StatusBadge status={r.deployment_status} /></td>
                <td className="p-2 text-muted-foreground">{r.build_status ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{r.test_status ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{r.deployed_by ?? "—"}</td>
                <td className="p-2 max-w-[260px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}