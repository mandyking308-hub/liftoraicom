import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportLayout, Stat } from "./_shared";
import { listImportBatches, statusBadge, summariseImportCentre } from "@/lib/importCentre";

export default function ImportOverview() {
  const { data: summary } = useQuery({ queryKey: ["import-summary"], queryFn: summariseImportCentre, refetchInterval: 30000 });
  const { data: batches = [] } = useQuery({ queryKey: ["import-batches"], queryFn: () => listImportBatches(20), refetchInterval: 30000 });
  return (
    <ImportLayout title="Import / Migration Centre" subtitle="Controlled import, mapping, preview, dedupe and rollback across all businesses. Defaults to test mode. Apply to real records requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Total batches" value={summary?.totalBatches ?? 0} />
        <Stat label="Awaiting approval" value={summary?.awaitingApproval ?? 0} tone={summary?.awaitingApproval ? "warn" : undefined} />
        <Stat label="Failed" value={summary?.failed ?? 0} tone={summary?.failed ? "bad" : undefined} />
        <Stat label="Test mode" value={summary?.testBatches ?? 0} />
        <Stat label="Applied live" value={summary?.appliedLive ?? 0} tone="ok" />
        <Stat label="Rollbacks open" value={summary?.rollbackOpen ?? 0} tone={summary?.rollbackOpen ? "warn" : undefined} />
      </div>
      {summary && summary.watchItems.length > 0 && (
        <Card className="tech-card border-yellow-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Watch items</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {summary.watchItems.map((w, i) => <div key={i} className="text-yellow-300">• {w}</div>)}
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent import batches</CardTitle></CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No imports yet. Start in <Link to="/founder/imports/upload" className="text-primary hover:underline">Upload</Link>.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Mode</th>
                  <th className="text-right p-2">Rows</th>
                  <th className="text-right p-2">Valid</th>
                  <th className="text-right p-2">Warn</th>
                  <th className="text-right p-2">Err</th>
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
                    <td className="p-2 text-right font-mono text-emerald-400">{b.rows_valid}</td>
                    <td className="p-2 text-right font-mono text-yellow-300">{b.rows_warning}</td>
                    <td className="p-2 text-right font-mono text-red-300">{b.rows_error}</td>
                    <td className="p-2 text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
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