import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchReconRecords, fetchMatches, fetchPayouts, fetchExceptions, summarize, formatMoney, SEVERITY_META, type ReconSummary } from "@/lib/reconciliationEngine";

export default function ReconciliationCard() {
  const [sum, setSum] = useState<ReconSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchReconRecords(), fetchMatches(), fetchPayouts(), fetchExceptions()])
      .then(([r,m,p,e]) => setSum(summarize(r,m,p,e)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Banknote size={14} className="text-primary" />
          Bank / Payment / Payout Reconciliation
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Mutations gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Matches payments to invoices, providers to bank, payouts to sellers. Confirmed revenue separated from pending. No money moves without founder approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/reconciliation/payments"  label="Records"     value={sum?.total_records} />
          <Tile to="/founder/reconciliation/unmatched" label="Unmatched"   value={sum?.unmatched}            cls={warn(sum?.unmatched ?? 0)} />
          <Tile to="/founder/reconciliation/invoices"  label="Pending"     value={sum?.pending_matches}      cls={warn(sum?.pending_matches ?? 0)} />
          <Tile to="/founder/reconciliation/unmatched" label="Critical ex" value={sum?.critical_exceptions}  cls={bad(sum?.critical_exceptions ?? 0)} />
          <Tile to="/founder/reconciliation/payouts"   label="Payout appr" value={sum?.payouts_awaiting_approval} cls={warn(sum?.payouts_awaiting_approval ?? 0)} />
          <Tile to="/founder/reconciliation"           label="Test recs"   value={sum?.test_records} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-emerald-500/30 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Confirmed revenue</p>
            <p className="text-sm font-bold">{formatMoney(sum?.confirmed_revenue ?? 0)}</p>
          </div>
          <div className="border border-yellow-500/30 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Pending revenue</p>
            <p className="text-sm font-bold">{formatMoney(sum?.pending_revenue ?? 0)}</p>
          </div>
        </div>
        {sum?.top_exception && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[sum.top_exception.severity].cls}`}>{SEVERITY_META[sum.top_exception.severity].label}</Badge>
              <p className="text-[10px] uppercase text-muted-foreground">Top exception</p>
            </div>
            <p className="text-sm font-medium">{sum.top_exception.exception_summary}</p>
            {sum.top_exception.recommended_action && <p className="text-[11px] text-primary/90">{sum.top_exception.recommended_action}</p>}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/reconciliation" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/reconciliation/payments" className="text-primary hover:underline">Payments</Link>
          <Link to="/founder/reconciliation/payouts" className="text-primary hover:underline">Payouts</Link>
          <Link to="/founder/reconciliation/unmatched" className="text-primary hover:underline">Unmatched</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}