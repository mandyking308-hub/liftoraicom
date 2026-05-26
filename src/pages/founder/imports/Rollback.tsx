import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportLayout } from "./_shared";
import { listRollbackEvents } from "@/lib/importCentre";

export default function ImportRollback() {
  const { data: events = [] } = useQuery({ queryKey: ["import-rollback"], queryFn: () => listRollbackEvents(), refetchInterval: 30000 });
  return (
    <ImportLayout title="Rollback" subtitle="Reverse an applied import where rollback is possible. All rollbacks require founder approval and are recorded in the audit ledger.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rollback events</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? <p className="text-xs text-muted-foreground">No rollback events.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Summary</th>
                  <th className="text-left p-2">Approval?</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-mono text-[10px]">{e.import_batch_id.slice(0,8)}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{e.rollback_status}</Badge></td>
                    <td className="p-2 text-muted-foreground">{e.rollback_summary ?? "—"}</td>
                    <td className="p-2">{e.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">required</Badge> : "—"}</td>
                    <td className="p-2 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2 text-muted-foreground">{e.completed_at ? new Date(e.completed_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </ImportLayout>
  );
}