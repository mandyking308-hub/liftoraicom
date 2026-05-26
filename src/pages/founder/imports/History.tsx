import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ImportLayout } from "./_shared";
import { listImportBatches, statusBadge } from "@/lib/importCentre";

export default function ImportHistory() {
  const { data: batches = [] } = useQuery({ queryKey: ["import-batches-hist"], queryFn: () => listImportBatches(200), refetchInterval: 30000 });
  const { data: applied = [] } = useQuery({
    queryKey: ["import-applied-hist"],
    queryFn: async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("import_applied_records").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  return (
    <ImportLayout title="History" subtitle="All import batches and the records they created or updated. Append-only audit trail.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Batches</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Mode</th>
                <th className="text-right p-2">Total</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-border/20 hover:bg-secondary/30">
                  <td className="p-2 font-medium">{b.import_name}</td>
                  <td className="p-2 text-muted-foreground">{b.import_type}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(b.import_status)}`}>{b.import_status}</Badge></td>
                  <td className="p-2">{b.is_test_import ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge> : <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">LIVE</Badge>}</td>
                  <td className="p-2 text-right font-mono">{b.rows_total}</td>
                  <td className="p-2 text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Records created / updated</CardTitle></CardHeader>
        <CardContent>
          {applied.length === 0 ? <p className="text-xs text-muted-foreground">No applied records yet.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Target table</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Rollback?</th>
                  <th className="text-left p-2">When</th>
                </tr>
              </thead>
              <tbody>
                {applied.map((a: any) => (
                  <tr key={a.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-mono text-[10px]">{a.import_batch_id.slice(0,8)}</td>
                    <td className="p-2 font-mono">{a.target_table}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{a.action_taken}</Badge></td>
                    <td className="p-2">{a.rollback_possible ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">yes</Badge> : <span className="text-muted-foreground">no</span>}</td>
                    <td className="p-2 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
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