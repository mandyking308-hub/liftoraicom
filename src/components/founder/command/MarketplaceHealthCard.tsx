import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Lock, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { computeMarketplaceSnapshot } from "@/lib/marketplaceEngine";
import { computeSellerOpsSnapshot } from "@/lib/sellerOpsEngine";
import { computeGrowthSnapshot } from "@/lib/marketplaceGrowthEngine";

/**
 * Consolidated Marketplace Health section for the Command Centre.
 * Combines Recruitment, Seller Ops, and Supply/Demand Growth engines.
 * Live-first; external actions remain approval-gated inside each module.
 */
export default function MarketplaceHealthCard() {
  const mp = useQuery({ queryKey: ["cc-mp-health-recruit"], queryFn: computeMarketplaceSnapshot, refetchInterval: 90000 });
  const ops = useQuery({ queryKey: ["cc-mp-health-ops"], queryFn: computeSellerOpsSnapshot, refetchInterval: 90000 });
  const grw = useQuery({ queryKey: ["cc-mp-health-grow"], queryFn: computeGrowthSnapshot, refetchInterval: 90000 });

  const s = mp.data; const o = ops.data; const g = grw.data;

  const nextAction = grw.data?.recommended_action
    ?? ops.data?.recommended_action
    ?? mp.data?.recommended_action
    ?? "Marketplace healthy — keep watching.";

  const approvalQueue = (s?.prospects_approval_required ?? 0)
    + (s?.listings_approval_required ?? 0)
    + (o?.approval_queue ?? 0)
    + (g?.growth_actions_approval ?? 0);

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Store size={14} className="text-primary" /> Marketplace Health
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> External actions gated
          </Badge>
          <span className="ml-auto text-[11px] text-muted-foreground font-normal">Recruitment · Onboarding · Listings · Payouts · Liquidity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <M label="Marketplaces" value={s?.marketplaces ?? 0} sub={`${s?.active_marketplaces ?? 0} active`} />
          <M label="Prospects" value={s?.prospects_total ?? 0} sub={`${s?.prospects_qualified ?? 0} qualified`} />
          <M label="Onboarding" value={s?.onboarding_in_progress ?? 0} sub={s?.onboarding_blocked ? `${s.onboarding_blocked} blocked` : "no blockers"} warn={!!s?.onboarding_blocked} />
          <M label="Listings awaiting approval" value={s?.listings_approval_required ?? 0} warn={!!(s && s.listings_approval_required)} />
          <M label="Verification risks" value={(s?.verifications_pending ?? 0) + (s?.verifications_failed ?? 0)} warn={!!(s && (s.verifications_pending + s.verifications_failed))} />
          <M label="Payout warnings" value={(o?.payouts_blocked ?? 0) + (o?.payouts_pending ?? 0)} warn={!!(o && o.payouts_blocked)} />
          <M label="Supply gaps" value={g?.supply_short ?? 0} warn={!!(g && g.supply_short)} />
          <M label="Demand gaps" value={g?.demand_short ?? 0} warn={!!(g && g.demand_short)} />
          <M label="Cold start cells" value={g?.cold_start ?? 0} warn={!!(g && g.cold_start)} />
          <M label="Liquidity balanced" value={g?.balanced ?? 0} good />
          <M label="Seller performance ⚠" value={(o?.perf_poor ?? 0) + (o?.perf_suspend_review ?? 0)} warn={!!(o && (o.perf_poor + o.perf_suspend_review))} />
          <M label="Approval queue" value={approvalQueue} warn={approvalQueue > 0} />
        </div>

        <div className="rounded border border-primary/30 bg-primary/5 p-2 flex items-start gap-2">
          {approvalQueue > 0 ? <AlertTriangle size={14} className="text-yellow-400 mt-0.5" /> : <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" />}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next marketplace action</p>
            <p className="text-sm text-primary/90">{nextAction}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[
            ["/founder/marketplace", "Overview"],
            ["/founder/marketplace/seller-prospects", "Prospects"],
            ["/founder/marketplace/seller-onboarding", "Onboarding"],
            ["/founder/marketplace/listing-queue", "Listings"],
            ["/founder/marketplace/payouts", "Payouts"],
            ["/founder/marketplace/liquidity", "Liquidity"],
            ["/founder/marketplace/growth-actions", "Growth actions"],
            ["/founder/marketplace/risk", "Risk"],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
              {label} <ArrowRight size={10} />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function M({ label, value, sub, warn, good }: { label: string; value: number | string; sub?: string; warn?: boolean; good?: boolean }) {
  const tone = warn ? "text-yellow-300" : good ? "text-emerald-400" : "text-foreground";
  return (
    <div className="rounded border border-border/50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}