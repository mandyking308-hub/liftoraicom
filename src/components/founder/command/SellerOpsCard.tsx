import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Lock } from "lucide-react";
import { computeSellerOpsSnapshot, type SellerOpsSnapshot } from "@/lib/sellerOpsEngine";

export default function SellerOpsCard() {
  const [snap, setSnap] = useState<SellerOpsSnapshot | null>(null);
  useEffect(() => { computeSellerOpsSnapshot().then(setSnap); }, []);

  const tone = !snap ? "idle" : snap.perf_suspend_review > 0 || snap.payouts_blocked > 0 ? "watch" : snap.accounts_total === 0 ? "idle" : "live";
  const toneCls = tone === "live" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : tone === "watch" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    : "bg-muted text-muted-foreground border-border/60";

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users size={14} className="text-primary" /> Seller Operations
          <Badge variant="outline" className={`text-[10px] ml-2 ${toneCls}`}>{tone}</Badge>
          <Link to="/founder/marketplace/seller-accounts" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">
            Open <ArrowRight size={10} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {!snap ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Active" value={snap.accounts_active} />
              <Stat label="Pending" value={snap.accounts_pending_activation} />
              <Stat label="Paused/Susp" value={snap.accounts_paused_or_suspended} />
              <Stat label="Payouts verified" value={snap.payouts_verified} />
              <Stat label="Payouts blocked" value={snap.payouts_blocked} />
              <Stat label="Approvals" value={snap.approval_queue} />
            </div>
            <p className="text-muted-foreground">{snap.recommended_action}</p>
            <p className="text-[10px] text-yellow-400 inline-flex items-center gap-1">
              <Lock size={9} /> Activation, terms send, payout activation, fee changes and suspensions are approval-gated.
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