import { useEffect, useState } from "react";
import { ReconLayout, ReconStat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchReconRecords, fetchMatches, fetchPayouts, fetchExceptions, summarize, formatMoney, SEVERITY_META, type ReconSummary } from "@/lib/reconciliationEngine";
import { Link } from "react-router-dom";

export default function ReconciliationOverview() {
  const [sum, setSum] = useState<ReconSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchReconRecords(), fetchMatches(), fetchPayouts(), fetchExceptions()])
      .then(([r,m,p,e]) => setSum(summarize(r,m,p,e)))
      .catch(() => setSum(null));
  }, []);
  return (
    <ReconLayout title="Reconciliation Overview" subtitle="Match payments to invoices, providers to bank, payouts to sellers. Internal matching runs live; provider mutations, refunds and payouts require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <ReconStat label="Total records" value={sum?.total_records ?? 0} />
        <ReconStat label="Unmatched" value={sum?.unmatched ?? 0} tone={(sum?.unmatched ?? 0) > 0 ? "warn" : "ok"} />
        <ReconStat label="Suggested" value={sum?.suggested ?? 0} />
        <ReconStat label="Matched" value={sum?.matched ?? 0} tone="ok" />
        <ReconStat label="Open exceptions" value={sum?.open_exceptions ?? 0} tone={(sum?.open_exceptions ?? 0) > 0 ? "warn" : "ok"} />
        <ReconStat label="Critical/high" value={sum?.critical_exceptions ?? 0} tone={(sum?.critical_exceptions ?? 0) > 0 ? "bad" : "ok"} />
        <ReconStat label="Pending matches" value={sum?.pending_matches ?? 0} />
        <ReconStat label="Payouts approval" value={sum?.payouts_awaiting_approval ?? 0} tone={(sum?.payouts_awaiting_approval ?? 0) > 0 ? "warn" : "ok"} />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="tech-card border-emerald-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Confirmed revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(sum?.confirmed_revenue ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Only matched bank/provider/invoice records contribute. Test data excluded.</p>
          </CardContent>
        </Card>
        <Card className="tech-card border-yellow-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(sum?.pending_revenue ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Unmatched, suggested or under review — not counted as revenue.</p>
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payouts due</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(sum?.payouts_total_due ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Marketplace seller payouts owed. Never paid automatically.</p>
          </CardContent>
        </Card>
      </div>
      {sum?.top_exception && (
        <Card className="tech-card border-orange-500/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Top exception
            <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[sum.top_exception.severity].cls}`}>{SEVERITY_META[sum.top_exception.severity].label}</Badge>
          </CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{sum.top_exception.exception_summary}</p>
            {sum.top_exception.recommended_action && <p className="text-[11px] text-primary/90">Action: {sum.top_exception.recommended_action}</p>}
            <Link to="/founder/reconciliation/unmatched" className="text-[11px] text-primary hover:underline">Open exceptions board →</Link>
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval gates</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Bank connections, payment provider mutations, refunds, chargebacks, payouts, transfers, collections and finance exports require founder approval.</p>
          <p>• Reconciliation Agent only suggests matches, flags exceptions and prepares review lists — it never moves money.</p>
          <p>• Test records (audit_metadata.live_internal_test = true) are excluded from confirmed revenue.</p>
        </CardContent>
      </Card>
    </ReconLayout>
  );
}