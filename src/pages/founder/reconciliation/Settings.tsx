import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function ReconciliationSettings() {
  const locked = [
    "Bank connection / API keys",
    "Payment provider mutations (Stripe, PayPal)",
    "Issue refunds or chargebacks",
    "Approve marketplace seller payouts",
    "Transfers between accounts",
    "Send invoices or collect payment",
    "Export finance pack externally",
  ];
  const live = [
    "Match payments to invoices (suggested)",
    "Match provider transactions to internal payments",
    "Detect duplicate / missing-invoice / amount-mismatch",
    "Calculate marketplace payout owed (read-only)",
    "Confirmed-vs-pending revenue separation",
    "Prepare finance review list for founder",
  ];
  return (
    <ReconLayout title="Reconciliation settings" subtitle="What runs live versus what stays gated.">
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="tech-card border-emerald-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Live (internal)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {live.map(l => <p key={l}><Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 mr-2">Live</Badge>{l}</p>)}
          </CardContent>
        </Card>
        <Card className="tech-card border-yellow-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock size={12} /> Approval gated</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {locked.map(l => <p key={l}><Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 mr-2">Gated</Badge>{l}</p>)}
          </CardContent>
        </Card>
      </div>
    </ReconLayout>
  );
}