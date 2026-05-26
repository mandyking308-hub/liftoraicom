import { useQuery } from "@tanstack/react-query";
import { DepLayout, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listMigrations } from "@/lib/deploymentControl";

export default function DepMigrations() {
  const { data: rows = [] } = useQuery({ queryKey: ["dep-migrations"], queryFn: () => listMigrations(500) });
  return (
    <DepLayout title="Migration status" subtitle="Tracked database migrations. Migrations are executed via the migration tool, not from this page.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Migration</th><th className="text-left p-2">Status</th><th className="text-left p-2">Applied</th><th className="text-left p-2">Notes</th><th className="text-left p-2">Updated</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No migrations tracked.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 font-mono text-[10px]">{r.migration_name}</td>
                <td className="p-2"><StatusBadge status={r.migration_status} /></td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">{r.applied_at ? new Date(r.applied_at).toLocaleString() : "—"}</td>
                <td className="p-2 max-w-[280px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}