import { Database, Layers3, Rocket, ShieldCheck } from "lucide-react";
import { PORTFOLIO_COMMERCIAL_MAP, PORTFOLIO_SOURCE_PROJECT_COUNT, REUSE_POOLS } from "@/data/portfolioCommercialMap";
import { POOL_DATA_COVERAGE, getBusinessDataDecision } from "@/data/portfolioDataCoverage";

const coverageClass: Record<string, string> = {
  covered: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  building: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  partial: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  gap: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const coverageLabel: Record<string, string> = {
  covered: "Covered",
  building: "Building",
  partial: "Partial",
  gap: "Data needed",
};

export default function PortfolioDataCoveragePanel() {
  const decisions = PORTFOLIO_COMMERCIAL_MAP.map((business) => ({
    business,
    decision: getBusinessDataDecision(business),
  }));
  const review = decisions.filter(({ business }) => business.status === "review").length;
  const internal = decisions.filter(({ business }) => business.status === "internal").length;
  const explicitDecisionCount = decisions.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h2 className="font-semibold">Whole-portfolio data coverage</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Nothing is allowed to disappear between product, data and launch planning. Every mapped project must have an explicit data decision: reuse a shared pool, build/buy a missing pool, review the ICP before spending, or record that no sales data is required.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[360px]">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Source projects</p>
              <p className="text-xl font-bold">{PORTFOLIO_SOURCE_PROJECT_COUNT}</p>
              <p className="text-[10px] text-muted-foreground">accounted for</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Business families</p>
              <p className="text-xl font-bold">{explicitDecisionCount}</p>
              <p className="text-[10px] text-muted-foreground">with a data decision</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Needs review</p>
              <p className="text-xl font-bold">{review}</p>
              <p className="text-[10px] text-muted-foreground">blocked from spend</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Internal only</p>
              <p className="text-xl font-bold">{internal}</p>
              <p className="text-[10px] text-muted-foreground">no sales data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers3 size={16} className="text-primary" />
          <h2 className="font-semibold">Data pool → businesses → next decision</h2>
        </div>
        <div className="grid xl:grid-cols-2 gap-3">
          {REUSE_POOLS.map((pool) => {
            const coverage = POOL_DATA_COVERAGE.find((item) => item.poolId === pool.id);
            const businesses = PORTFOLIO_COMMERCIAL_MAP.filter((business) => business.reusePools.includes(pool.id));
            if (!coverage) return null;
            return (
              <div key={pool.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{pool.label}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Unlocks {businesses.length} business {businesses.length === 1 ? "family" : "families"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${coverageClass[coverage.status]}`}>
                    {coverageLabel[coverage.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {businesses.map((business) => (
                    <span key={business.id} className="text-[10px] px-2 py-1 rounded bg-secondary/70">
                      {business.business}
                    </span>
                  ))}
                </div>

                {coverage.assetNames.length > 0 ? (
                  <div className="flex items-start gap-2 text-xs">
                    <Database size={12} className="text-primary mt-0.5 shrink-0" />
                    <p><span className="text-muted-foreground">Existing assets:</span> {coverage.assetNames.join(" · ")}</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-rose-300">
                    <Database size={12} className="mt-0.5 shrink-0" />
                    <p>No dedicated shared dataset registered yet.</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{coverage.coverageNote}</p>

                {coverage.currentLaunchNote && (
                  <div className="rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-2 text-xs">
                    <span className="font-medium text-blue-300">Current launch:</span> {coverage.currentLaunchNote}
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs border-t border-border/50 pt-2">
                  <Rocket size={12} className="text-primary mt-0.5 shrink-0" />
                  <p><span className="font-medium">Next:</span> {coverage.nextDecision}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-semibold mb-3">Exceptions are visible, not omitted</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {decisions
            .filter(({ business }) => business.status === "review" || business.status === "internal" || business.reusePools.length === 0)
            .map(({ business, decision }) => (
              <div key={business.id} className="rounded-lg border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{business.business}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${coverageClass[decision.status]}`}>
                    {decision.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{decision.detail}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
