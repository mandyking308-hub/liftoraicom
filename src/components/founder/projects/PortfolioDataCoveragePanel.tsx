import { Database, FolderTree, Layers3, Rocket, ShieldCheck } from "lucide-react";
import {
  PORTFOLIO_COMMERCIAL_MAP,
  PORTFOLIO_SOURCE_PROJECT_COUNT,
  REUSE_POOLS,
  getReusePoolLabel,
} from "@/data/portfolioCommercialMap";
import { POOL_DATA_COVERAGE, getBusinessDataDecision } from "@/data/portfolioDataCoverage";
import {
  GROUPED_SOURCE_PROJECT_COUNT,
  PORTFOLIO_LAUNCH_GROUPS,
  UNGROUPED_PORTFOLIO_BUSINESSES,
} from "@/data/portfolioLaunchGroups";
import { getAllDataPoolIdsForBusiness, getCrossUseReasons } from "@/data/portfolioDataCrossUse";

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

const datasetClass: Record<string, string> = {
  existing: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  building: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  partial: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  to_buy: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  none: "bg-secondary text-muted-foreground border-border",
  review: "bg-violet-500/10 text-violet-300 border-violet-500/30",
};

const datasetLabel: Record<string, string> = {
  existing: "Data exists",
  building: "Data building",
  partial: "Partial — reuse first",
  to_buy: "Dataset to decide/buy",
  none: "No sales data",
  review: "Review before spend",
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
              Release grouping and data reuse are separate. Every source project has one primary release group for sequencing, but a business may use several datasets across sectors. That many-to-many relationship is what lets one data purchase unlock additional businesses without duplicating the underlying account universe.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[360px]">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Source projects</p>
              <p className="text-xl font-bold">{PORTFOLIO_SOURCE_PROJECT_COUNT}</p>
              <p className="text-[10px] text-muted-foreground">accounted for</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Grouped projects</p>
              <p className="text-xl font-bold">{GROUPED_SOURCE_PROJECT_COUNT}</p>
              <p className="text-[10px] text-muted-foreground">in release groups</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Business families</p>
              <p className="text-xl font-bold">{explicitDecisionCount}</p>
              <p className="text-[10px] text-muted-foreground">with data decisions</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Unassigned</p>
              <p className="text-xl font-bold">{UNGROUPED_PORTFOLIO_BUSINESSES.length}</p>
              <p className="text-[10px] text-muted-foreground">must remain zero</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <FolderTree size={17} className="text-primary" />
          <h2 className="font-semibold">Master project list — release group + every usable data group</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          All source projects are shown, including unfinished ones. The section they sit under is their primary release home; the Data groups column is intentionally many-to-many and can include datasets from other sectors.
        </p>

        <div className="space-y-3">
          {PORTFOLIO_LAUNCH_GROUPS.map((group) => {
            const businesses = group.businessIds
              .map((id) => PORTFOLIO_COMMERCIAL_MAP.find((business) => business.id === id))
              .filter((business): business is (typeof PORTFOLIO_COMMERCIAL_MAP)[number] => Boolean(business));
            const sourceCount = businesses.reduce((total, business) => total + business.sourceProjects.length, 0);

            return (
              <section key={group.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex flex-col xl:flex-row xl:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{group.name}</h3>
                      <span className={`text-[10px] px-2 py-1 rounded-full border ${datasetClass[group.datasetStatus]}`}>
                        {datasetLabel[group.datasetStatus]}
                      </span>
                      {group.releaseOrder != null && (
                        <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          Release wave {group.releaseOrder}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{group.rationale}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {businesses.length} business {businesses.length === 1 ? "family" : "families"} · {sourceCount} source {sourceCount === 1 ? "project" : "projects"}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border/50 bg-background/50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Primary dataset plan for this release group</p>
                  <p className="text-sm mt-1">{group.datasetPlan}</p>
                  <p className="text-xs text-muted-foreground mt-2"><span className="font-medium text-foreground">Release:</span> {group.releaseNote}</p>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="py-2 pr-4">Source project</th>
                        <th className="py-2 pr-4">Business family</th>
                        <th className="py-2 pr-4">All usable data groups</th>
                        <th className="py-2">Current state</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.flatMap((business) => {
                        const poolIds = getAllDataPoolIdsForBusiness(business);
                        const crossUse = getCrossUseReasons(business.id);
                        return business.sourceProjects.map((project) => (
                          <tr key={`${business.id}-${project}`} className="border-b border-border/40 last:border-0 align-top">
                            <td className="py-2 pr-4 font-medium">{project}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{business.business}</td>
                            <td className="py-2 pr-4 min-w-[300px]">
                              {poolIds.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {poolIds.map((poolId) => (
                                    <span key={poolId} className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">
                                      {getReusePoolLabel(poolId)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No commercial data group assigned</span>
                              )}
                              {crossUse.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {crossUse.map((link) => (
                                    <p key={`${link.businessId}-${link.poolId}`} className="text-[10px] text-amber-300">
                                      Cross-sector reuse: {getReusePoolLabel(link.poolId)} — {link.reason}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-muted-foreground min-w-[180px]">
                              {business.status === "review"
                                ? "Unfinished / review before data spend"
                                : business.status === "internal"
                                  ? "Internal — no sales dataset"
                                  : business.status === "charity"
                                    ? "Charity / funding workflow"
                                    : business.status === "consumer"
                                      ? "Consumer/partner proposition"
                                      : "Commercial"}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers3 size={16} className="text-primary" />
          <h2 className="font-semibold">Dataset view — every business each pool can reach</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          This is the inverse view. It shows the leverage of each data asset across the portfolio, including explicit cross-sector reuse links such as Education → Procitron.
        </p>
        <div className="grid xl:grid-cols-2 gap-3">
          {REUSE_POOLS.map((pool) => {
            const coverage = POOL_DATA_COVERAGE.find((item) => item.poolId === pool.id);
            const businesses = PORTFOLIO_COMMERCIAL_MAP.filter((business) => getAllDataPoolIdsForBusiness(business).includes(pool.id));
            if (!coverage) return null;
            return (
              <div key={pool.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{pool.label}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Can feed {businesses.length} business {businesses.length === 1 ? "family" : "families"}</p>
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
            .filter(({ business }) => business.status === "review" || business.status === "internal" || getAllDataPoolIdsForBusiness(business).length === 0)
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

      <div className="text-[10px] text-muted-foreground px-1">
        Portfolio control check: {review} business families need proposition review; {internal} is internal-only. Grouped source-project count must equal the {PORTFOLIO_SOURCE_PROJECT_COUNT}-project workspace snapshot before release planning is trusted.
      </div>
    </div>
  );
}
