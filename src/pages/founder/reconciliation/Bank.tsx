import { ReconLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

const PROVIDERS = [
  { name: "Stripe",                key: "stripe",             status: "Not connected" },
  { name: "PayPal",                key: "paypal",             status: "Not connected" },
  { name: "Bank CSV import",       key: "bank_csv",           status: "Awaiting CSV upload approval" },
  { name: "Manual import",         key: "manual",             status: "Founder upload only" },
  { name: "Marketplace payout provider", key: "marketplace_payout", status: "Not connected" },
];

export default function ReconciliationBank() {
  return (
    <ReconLayout title="Bank / provider import" subtitle="All provider connections and bulk imports are gated. No external API is called until founder approval.">
      <div className="grid md:grid-cols-2 gap-3">
        {PROVIDERS.map(p => (
          <Card key={p.key} className="tech-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{p.name}</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Approval required</Badge>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>Status: <span className="text-foreground">{p.status}</span></p>
              <p className="mt-2">No keys configured. Importer placeholder — read-only until founder enables.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ReconLayout>
  );
}