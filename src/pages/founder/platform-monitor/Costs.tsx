import { useQuery } from "@tanstack/react-query";
import { PMLayout, Stat } from "./_shared";
import { listCostRecords, summariseMonitor } from "@/lib/platformMonitor";
import { Card } from "@/components/ui/card";

export default function PMCosts() {
  const { data: rows = [] } = useQuery({ queryKey: ["pm-cost"], queryFn: () => listCostRecords({ limit: 200 }) });
  const { data: s } = useQuery({ queryKey: ["pm-cost-sum"], queryFn: summariseMonitor });
  const bySource = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.cost_source] = (acc[r.cost_source] ?? 0) + Number(r.confirmed_cost ?? r.estimated_cost ?? 0);
    return acc;
  }, {});
  return (
    <PMLayout title="Costs" subtitle="Provider, AI, hosting and storage costs. Estimated values only — provider invoices remain the source of truth. Plan upgrades require approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="30d total (USD)" value={(s?.costLast30d ?? 0).toFixed(2)} />
        <Stat label="30d AI cost" value={(s?.aiCostLast30d ?? 0).toFixed(2)} />
        <Stat label="Records" value={rows.length} />
        <Stat label="Sources" value={Object.keys(bySource).length} />
      </div>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Period</th><th className="text-left p-2">Source</th><th className="text-left p-2">Estimated</th><th className="text-left p-2">Confirmed</th><th className="text-left p-2">Currency</th><th className="text-left p-2">Basis</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No cost records.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.cost_period_start).toLocaleDateString()} → {new Date(r.cost_period_end).toLocaleDateString()}</td>
                <td className="p-2 capitalize">{r.cost_source}</td>
                <td className="p-2">{r.estimated_cost ?? "—"}</td>
                <td className="p-2">{r.confirmed_cost ?? "—"}</td>
                <td className="p-2">{r.currency}</td>
                <td className="p-2 capitalize">{r.cost_basis.replace(/_/g," ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PMLayout>
  );
}