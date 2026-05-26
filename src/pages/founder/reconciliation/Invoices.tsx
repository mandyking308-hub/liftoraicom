import { useEffect, useState } from "react";
import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchReconRecords, fetchMatches, MATCH_STATUS_META, formatMoney, type ReconciliationRecord, type PaymentReconciliationMatch } from "@/lib/reconciliationEngine";

export default function ReconciliationInvoices() {
  const [invoices, setInvoices] = useState<ReconciliationRecord[]>([]);
  const [matches, setMatches] = useState<PaymentReconciliationMatch[]>([]);
  useEffect(() => {
    fetchReconRecords({ source: ["invoice"] }).then(setInvoices);
    fetchMatches().then(setMatches);
  }, []);
  return (
    <ReconLayout title="Invoice / payment match" subtitle="Each invoice's expected amount matched against received payments. Confirmation requires founder approval before revenue counts.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Invoices ({invoices.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No invoice records.</td></tr>}
              {invoices.map(i => (
                <tr key={i.id} className="border-b border-border/30">
                  <td className="p-2">{i.transaction_date ?? "—"}</td>
                  <td className="p-2">{i.description ?? "—"}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(Number(i.amount), i.currency)}</td>
                  <td className="p-2">{i.reconciliation_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Suggested / confirmed matches ({matches.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Status</th><th className="p-2">Confidence</th><th className="p-2">Reason</th><th className="p-2">Approval</th></tr>
            </thead>
            <tbody>
              {matches.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No suggested matches.</td></tr>}
              {matches.map(m => (
                <tr key={m.id} className="border-b border-border/30">
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${MATCH_STATUS_META[m.match_status].cls}`}>{MATCH_STATUS_META[m.match_status].label}</Badge></td>
                  <td className="p-2">{m.match_confidence ?? "—"}%</td>
                  <td className="p-2">{m.match_reason ?? "—"}</td>
                  <td className="p-2">{m.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Founder approval required</Badge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ReconLayout>
  );
}