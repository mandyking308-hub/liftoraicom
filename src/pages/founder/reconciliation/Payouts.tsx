import { useEffect, useState } from "react";
import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { fetchPayouts, PAYOUT_STATUS_META, formatMoney, type MarketplacePayoutRecord } from "@/lib/reconciliationEngine";

export default function ReconciliationPayouts() {
  const [rows, setRows] = useState<MarketplacePayoutRecord[]>([]);
  useEffect(() => { fetchPayouts().then(setRows); }, []);
  const totalDue = rows.filter(r => r.payout_status !== "paid" && r.payout_status !== "cancelled").reduce((s,r) => s + Number(r.payout_amount || 0), 0);
  return (
    <ReconLayout title="Marketplace payout reconciliation" subtitle="Seller payouts owed across all marketplaces. Payouts are calculated and queued internally. No funds move until founder approves.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Outstanding payouts
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 ml-auto"><Lock size={9} className="mr-1" /> No auto-payout</Badge>
        </CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalDue)}</p>
          <p className="text-[11px] text-muted-foreground">Across {rows.length} payout records.</p>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Payouts</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Period</th><th className="p-2">Provider</th><th className="p-2 text-right">Gross</th><th className="p-2 text-right">Fee</th><th className="p-2 text-right">Payout</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No payout records.</td></tr>}
              {rows.map(p => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="p-2">{p.payout_period_start ?? "—"} → {p.payout_period_end ?? "—"}</td>
                  <td className="p-2">{p.payout_provider ?? "—"}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(Number(p.gross_amount), p.currency)}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(Number(p.platform_fee), p.currency)}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(Number(p.payout_amount), p.currency)}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${PAYOUT_STATUS_META[p.payout_status].cls}`}>{PAYOUT_STATUS_META[p.payout_status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ReconLayout>
  );
}