import { useQuery } from "@tanstack/react-query";
import { DepLayout, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listEdgeFunctions } from "@/lib/deploymentControl";

export default function DepEdgeFunctions() {
  const { data: rows = [] } = useQuery({ queryKey: ["dep-fns"], queryFn: () => listEdgeFunctions(500) });
  return (
    <DepLayout title="Edge function status" subtitle="Deployed edge functions and last known error. Functions that can take external action are flagged.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Function</th><th className="text-left p-2">Status</th><th className="text-left p-2">Last deployed</th><th className="text-left p-2">External action</th><th className="text-left p-2">Last error</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No functions tracked.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 font-mono text-[11px]">{r.function_name}</td>
                <td className="p-2"><StatusBadge status={r.deployed_status} /></td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">{r.last_deployed_at ? new Date(r.last_deployed_at).toLocaleString() : "—"}</td>
                <td className="p-2">{r.external_action_possible ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</td>
                <td className="p-2 max-w-[280px] truncate text-muted-foreground">{r.last_error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}