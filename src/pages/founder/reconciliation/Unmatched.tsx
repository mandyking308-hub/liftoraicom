import { useEffect, useState } from "react";
import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchReconRecords, fetchExceptions, SEVERITY_META, STATUS_META, SOURCE_META, formatMoney, type ReconciliationRecord, type ReconciliationException } from "@/lib/reconciliationEngine";

export default function ReconciliationUnmatched() {
  const [unmatched, setUnmatched] = useState<ReconciliationRecord[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  useEffect(() => {
    fetchReconRecords({ status: ["unmatched","needs_review","suggested_match"] }).then(setUnmatched);
    fetchExceptions({ status: ["open","review_required"] }).then(setExceptions);
  }, []);
  return (
    <ReconLayout title="Unmatched & exceptions" subtitle="Anything the Reconciliation Agent could not match cleanly, plus all open exceptions awaiting founder review.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Unmatched / under-review records ({unmatched.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Date</th><th className="p-2">Source</th><th className="p-2">Description</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {unmatched.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Everything matched.</td></tr>}
              {unmatched.map(r => (
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
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Exceptions board ({exceptions.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Severity</th><th className="p-2">Type</th><th className="p-2">Summary</th><th className="p-2">Recommended action</th></tr>
            </thead>
            <tbody>
              {exceptions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No open exceptions.</td></tr>}
              {exceptions.map(e => (
                <tr key={e.id} className="border-b border-border/30">
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${SEVERITY_META[e.severity].cls}`}>{SEVERITY_META[e.severity].label}</Badge></td>
                  <td className="p-2">{e.exception_type.replace(/_/g," ")}</td>
                  <td className="p-2">{e.exception_summary}</td>
                  <td className="p-2 text-primary/90">{e.recommended_action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ReconLayout>
  );
}