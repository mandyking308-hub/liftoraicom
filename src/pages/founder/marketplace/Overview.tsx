import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPStat, NoExternalActionBanner } from "./_shared";
import { computeMarketplaceSnapshot, type MarketplaceSnapshot } from "@/lib/marketplaceEngine";

export default function MarketplaceOverview() {
  const [snap, setSnap] = useState<MarketplaceSnapshot | null>(null);
  useEffect(() => { computeMarketplaceSnapshot().then(setSnap); }, []);

  return (
    <MPLayout title="Marketplace Overview" subtitle="Track supply gaps, seller prospects, onboarding, verification and listings across every Liftor marketplace.">
      <NoExternalActionBanner />
      {!snap ? <p className="text-sm text-muted-foreground">Loading marketplace snapshot…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MPStat label="Marketplaces" value={snap.marketplaces} hint={`${snap.active_marketplaces} active`} />
            <MPStat label="Prospects" value={snap.prospects_total} hint={`${snap.prospects_qualified} qualified · ${snap.prospects_new} new`} />
            <MPStat label="Approval required" value={snap.prospects_approval_required + snap.listings_approval_required} tone={snap.prospects_approval_required + snap.listings_approval_required > 0 ? "warn" : "good"} hint="Outreach & listings" />
            <MPStat label="Onboarding" value={snap.onboarding_in_progress} hint={`${snap.onboarding_blocked} blocked`} tone={snap.onboarding_blocked > 0 ? "warn" : "good"} />
            <MPStat label="Verifications" value={snap.verifications_pending} hint={`${snap.verifications_failed} failed`} tone={snap.verifications_failed > 0 ? "bad" : snap.verifications_pending > 0 ? "warn" : "good"} />
            <MPStat label="Listings live" value={snap.listings_published} hint={`${snap.listings_draft} draft`} />
            <MPStat label="Supply gaps" value={snap.supply_gap_alerts} tone={snap.supply_gap_alerts > 0 ? "warn" : "good"} />
            <MPStat label="Demand gaps" value={snap.demand_gap_alerts} tone={snap.demand_gap_alerts > 0 ? "warn" : "good"} />
          </div>

          <MPSection title="Marketplace Recruitment Agent recommendation" description="Live from supply/demand, prospect pipeline, onboarding and listing signals.">
            <p className="text-sm">{snap.recommended_action}</p>
          </MPSection>

          <MPSection title="Prospects by qualification">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(snap.by_qualification).length === 0 && (
                <p className="text-muted-foreground col-span-full">No prospects yet — add or import seller leads.</p>
              )}
              {Object.entries(snap.by_qualification).map(([k, v]) => (
                <div key={k} className="rounded border border-border/40 p-2 flex items-center justify-between">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </MPSection>

          <MPSection title="Listings by status">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(snap.by_listing_status).length === 0 && (
                <p className="text-muted-foreground col-span-full">No listings yet.</p>
              )}
              {Object.entries(snap.by_listing_status).map(([k, v]) => (
                <div key={k} className="rounded border border-border/40 p-2 flex items-center justify-between">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </MPSection>
        </>
      )}
    </MPLayout>
  );
}