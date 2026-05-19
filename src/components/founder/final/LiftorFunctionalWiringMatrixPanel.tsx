import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Network, CheckCircle2, AlertCircle, Lock } from "lucide-react";

const statusColor = (s: string) => ({
  WIRED: "bg-green-500/10 text-green-300 border-green-500/30",
  PARTIAL: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  BROKEN_FUNCTION: "bg-red-500/10 text-red-300 border-red-500/30",
  BROKEN_LINK: "bg-red-500/10 text-red-300 border-red-500/30",
  BACKEND_ONLY: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  UI_ONLY: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  BLOCKED: "bg-red-500/10 text-red-300 border-red-500/30",
}[s] || "bg-secondary/40 text-muted-foreground border-border");

export default function LiftorFunctionalWiringMatrixPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("liftor-functional-wiring-matrix", { body: {} });
    setResult(data);
    setLoading(false);
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Network size={16} className="text-primary" /> Functional Wiring Matrix
          {result?.classification && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-300 border-green-500/30 text-[10px]">
              <CheckCircle2 size={10} className="mr-1" />{result.classification}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={10} className="mr-1" />EXTERNAL_LOCKED
          </Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>{loading ? "Auditing…" : "Run Wiring Audit"}</Button>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">Read-only audit that verifies every major Liftor layer has a real table, real edge function, and a fail-closed placeholder where external action exists. No mutations, no external calls.</p>
        {result && (
          <>
            <div className="flex flex-wrap gap-1">
              {Object.entries(result.counts || {}).map(([k, v]) => (
                <Badge key={k} variant="outline" className={`text-[10px] ${statusColor(k)}`}>{k}: {v as number}</Badge>
              ))}
              <Badge variant="outline" className="text-[10px]">Layers: {result.total_layers}</Badge>
            </div>
            {result.blockers?.length > 0 && (
              <div className="text-red-300 flex items-center gap-2"><AlertCircle size={12} />Blockers: {result.blockers.join(", ")}</div>
            )}
            <div className="overflow-auto max-h-[480px] border border-border rounded">
              <table className="w-full text-[10px]">
                <thead className="bg-secondary/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Layer</th>
                    <th className="text-left p-2">Table</th>
                    <th className="text-left p-2">Fn</th>
                    <th className="text-left p-2">Placeholder</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.matrix || []).map((m: any) => (
                    <tr key={m.key} className="border-t border-border/40">
                      <td className="p-2">{m.layer}</td>
                      <td className="p-2 text-muted-foreground">{m.table ?? "—"} {m.table && (m.table_ok ? "✓" : "✗")}</td>
                      <td className="p-2 text-muted-foreground">{m.fn ?? "—"} {m.fn && (m.fn_ok ? "✓" : "✗")}</td>
                      <td className="p-2 text-muted-foreground">{m.placeholder ? (m.fail_closed ? "FAIL_CLOSED" : `OPEN:${m.placeholder_status}`) : "—"}</td>
                      <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusColor(m.status)}`}>{m.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}