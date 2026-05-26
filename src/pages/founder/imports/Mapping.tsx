import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ImportLayout } from "./_shared";

export default function ImportMapping() {
  const { data: mappings = [] } = useQuery({
    queryKey: ["import-mappings-all"],
    queryFn: async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("import_mappings").select("*, import_batches!inner(import_name,import_type,is_test_import)").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  return (
    <ImportLayout title="Field mapping" subtitle="Map source columns onto target tables and fields. Required fields must be mapped before preview can run. Transformations are applied during preview only.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Mappings</CardTitle></CardHeader>
        <CardContent>
          {mappings.length === 0 ? <p className="text-xs text-muted-foreground">No mappings yet — start an import in Upload.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Source field</th>
                  <th className="text-left p-2">→ Target table</th>
                  <th className="text-left p-2">Target field</th>
                  <th className="text-left p-2">Transform</th>
                  <th className="text-left p-2">Required</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{m.import_batches?.import_name ?? m.import_batch_id.slice(0,8)}</td>
                    <td className="p-2 font-mono">{m.source_field}</td>
                    <td className="p-2 text-muted-foreground">{m.target_table ?? "—"}</td>
                    <td className="p-2 font-mono">{m.target_field ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{m.transformation_rule ?? "—"}</td>
                    <td className="p-2">{m.required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">required</Badge> : "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{m.mapping_status}</Badge></td>
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