import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ArrowRight, Lock } from "lucide-react";
import { computeMarketplaceSnapshot, type MarketplaceSnapshot } from "@/lib/marketplaceEngine";

export default function MarketplaceCard() {
  const [snap, setSnap] = useState<MarketplaceSnapshot | null>(null);
  useEffect(() => { computeMarketplaceSnapshot().then(setSnap); }, []);

  const approvals = (snap?.prospects_approval_required ?? 0) + (snap?.listings_approval_required ?? 0);
  const tone = !snap ? "idle" : snap.supply_gap_alerts > 0 || snap.onboarding_blocked > 0 ? "watch" : snap.marketplaces === 0 ? "idle" : "live";
  const toneCls = tone === "live" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : tone === "watch" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    : "bg-muted text-muted-foreground border-border/60";

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Store size={14} className="text-primary" /> Marketplace Seller Recruitment
          <Badge variant="outline" className={`text-[10px] ml-2 ${toneCls}`}>{tone}</Badge>
          <Link to="/founder/marketplace" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">
            Open <ArrowRight size={10} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {!snap ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Marketplaces" value={snap.marketplaces} />
              <Stat label="Prospects" value={snap.prospects_total} />
              <Stat label="Onboarding" value={snap.onboarding_in_progress} />
              <Stat label="Listings live" value={snap.listings_published} />
              <Stat label="Supply gaps" value={snap.supply_gap_alerts} />
              <Stat label="Approvals" value={approvals} />
            </div>
            <p className="text-muted-foreground">{snap.recommended_action}</p>
            <p className="text-[10px] text-yellow-400 inline-flex items-center gap-1">
              <Lock size={9} /> Outreach, account creation, listing publish and payout setup are approval-gated.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}