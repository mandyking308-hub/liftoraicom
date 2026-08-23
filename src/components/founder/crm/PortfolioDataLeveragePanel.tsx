import { useMemo } from "react";
import { Database, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PORTFOLIO_COMMERCIAL_MAP, REUSE_POOLS } from "@/data/portfolioCommercialMap";
import { getPoolDataCoverage, type DataCoverageStatus } from "@/data/portfolioDataCoverage";
import { resolveBusinessPools } from "@/lib/portfolioCrmPoolResolver";

const coverageWeight: Record<DataCoverageStatus, number> = {
  gap: 4,
  partial: 2,
  building: 1,
  covered: 0,
};

const priorityWeight = { high: 3, medium: 2, low: 1, none: 0, review: 0 } as const;

export default function PortfolioDataLeveragePanel() {
  const rows = useMemo(() => {
    return REUSE_POOLS.map((pool) => {
      const linked = PORTFOLIO_COMMERCIAL_MAP.filter((business) =>
        business.status !== "internal" &&
        business.status !== "review" &&
        resolveBusinessPools(business.business).includes(pool.id),
      );
      const coverage = getPoolDataCoverage(pool.id);
      const coverageStatus: DataCoverageStatus = coverage?.status ?? "gap";
      const commercialWeight = linked.reduce((sum, business) => sum + priorityWeight[business.apolloPriority], 0);
      const structuralScore = linked.length * coverageWeight[coverageStatus] + commercialWeight;
      return {
        pool,
        linked,
        coverage,
        coverageStatus,
        structuralScore,
      };
    })
      .filter((row) => row.linked.length > 0)
      .sort((a, b) => b.structuralScore - a.structuralScore || b.linked.length - a.linked.length);
  }, []);

  const top = rows.slice(0, 8);

  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Data purchase leverage</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Structural ranking of reusable data pools using portfolio breadth, current coverage gaps and commercial priority. This is the shortlist for the next monthly data decision.
            </p>
          </div>
          <Badge variant="outline">Portfolio-wide</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((row, index) => (
          <div key={row.pool.id} className="rounded-lg border border-border/60 p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold tabular-nums">#{index + 1}</span>
                  <span className="text-sm font-medium">{row.pool.label}</span>
                  <Badge variant={row.coverageStatus === "gap" ? "destructive" : "outline"} className="text-[10px] capitalize">{row.coverageStatus}</Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1"><Layers3 className="h-3 w-3" /> {row.linked.length} businesses</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{row.coverage?.coverageNote ?? "No dedicated shared asset registered."}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Leverage score</div>
                <div className="text-lg font-semibold tabular-nums">{row.structuralScore}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {row.linked.slice(0, 10).map((business) => (
                <Badge key={business.id} variant="outline" className="text-[10px]">{business.business}</Badge>
              ))}
              {row.linked.length > 10 && <Badge variant="outline" className="text-[10px]">+{row.linked.length - 10}</Badge>}
            </div>
            {row.coverage?.nextDecision && <p className="text-[11px] mt-2"><span className="font-medium">Next decision:</span> <span className="text-muted-foreground">{row.coverage.nextDecision}</span></p>}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground pt-1">
          Score is intentionally structural, not a revenue forecast. Final monthly purchase should also consider launch readiness, cost per verified contact, legal/compliance constraints and how much of the pool we already own through another dataset.
        </p>
      </CardContent>
    </Card>
  );
}
