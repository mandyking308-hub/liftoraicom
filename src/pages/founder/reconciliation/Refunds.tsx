import { useEffect, useState } from "react";
import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { fetchReconRecords, formatMoney, STATUS_META, SOURCE_META, type ReconciliationRecord } from "@/lib/reconciliationEngine";

export default function ReconciliationRefunds() {
  const [rows, setRows] = useState<ReconciliationRecord[]>([]);
  useEffect(() => { fetchReconRecords({ source: ["refund","chargeback"] }).then(setRows); }, []);
  return (
    <ReconLayout title="Refunds & chargebacks" subtitle="Internal log of refund and chargeback events. Refunds are never issued automatically — provider action requires founder approval.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Refund / chargeback board
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 ml-auto"><Lock size={9} className="mr-1" /> No auto-refund</Badge>
        </CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Description</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No refund or chargeback records.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="p-2">{r.transaction_date ?? "—"}</td>
                  <td className="p-2">{SOURCE_META[r.source_type]}</td>
                  <td className="p-2">{r.description ?? "—"}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(Number(r.amount), r.currency)}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${STATUS_META[r.reconciliation_status].cls}`}>{STATUS_META[r.reconciliation_status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ReconLayout>
  );
}