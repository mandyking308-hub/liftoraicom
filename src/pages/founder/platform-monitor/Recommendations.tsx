import { useQuery } from "@tanstack/react-query";
import { PMLayout, StatusBadge } from "./_shared";
import { listScaleRecs } from "@/lib/platformMonitor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PMRecommendations() {
  const { data: rows = [] } = useQuery({ queryKey: ["pm-recs"], queryFn: () => listScaleRecs({ limit: 200 }) });
  return (
    <PMLayout title="Scalability recommendations" subtitle="Indexes, pagination, code-splits, caches, archival, plan reviews, rate-limit adjustments and query refactors. Implementation requires founder approval.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Module</th><th className="text-left p-2">Type</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Impact</th><th className="text-left p-2">Priority</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No recommendations.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.source_module}</td>
                <td className="p-2 capitalize">{r.recommendation_type.replace(/_/g," ")}</td>
                <td className="p-2 max-w-[280px] truncate">{r.recommendation_summary ?? "—"}</td>
                <td className="p-2 max-w-[200px] truncate text-muted-foreground">{r.expected_impact ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px] capitalize">{r.priority}</Badge></td>
                <td className="p-2"><StatusBadge status={r.action_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PMLayout>
  );
}