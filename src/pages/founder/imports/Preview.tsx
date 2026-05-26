import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ImportLayout, Stat } from "./_shared";
import { validationBadge } from "@/lib/importCentre";

export default function ImportPreview() {
  const { data: rows = [] } = useQuery({
    queryKey: ["import-preview-all"],
    queryFn: async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("import_preview_rows").select("*, import_batches!inner(import_name,is_test_import)").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  const counts = rows.reduce((acc: any, r: any) => { acc[r.validation_status] = (acc[r.validation_status] ?? 0) + 1; return acc; }, {});
  return (
    <ImportLayout title="Preview" subtitle="Validated rows from staged imports. Nothing is written to real records here. Apply requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Valid" value={counts.valid ?? 0} tone="ok" />
        <Stat label="Warnings" value={counts.warning ?? 0} tone="warn" />
        <Stat label="Errors" value={counts.error ?? 0} tone="bad" />
        <Stat label="Duplicates" value={counts.duplicate ?? 0} />
        <Stat label="Ignored" value={counts.ignored ?? 0} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Preview rows</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-xs text-muted-foreground">No preview rows yet.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Batch</th>
                  <th className="text-right p-2">Row #</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Mapped (preview)</th>
                  <th className="text-left p-2">Messages</th>
                  <th className="text-left p-2">Duplicate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/30 align-top">
                    <td className="p-2 font-medium">{r.import_batches?.import_name ?? r.import_batch_id.slice(0,8)}{r.import_batches?.is_test_import && <Badge variant="outline" className="ml-1 text-[9px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}</td>
                    <td className="p-2 text-right font-mono">{r.row_number}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${validationBadge(r.validation_status)}`}>{r.validation_status}</Badge></td>
                    <td className="p-2 font-mono text-[10px] text-muted-foreground max-w-[280px] truncate">{JSON.stringify(r.mapped_row)}</td>
                    <td className="p-2 text-[10px] text-muted-foreground max-w-[200px] truncate">{Array.isArray(r.validation_messages) ? r.validation_messages.join(", ") : ""}</td>
                    <td className="p-2 text-[10px] text-muted-foreground">{r.duplicate_match_summary ?? "—"}</td>
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