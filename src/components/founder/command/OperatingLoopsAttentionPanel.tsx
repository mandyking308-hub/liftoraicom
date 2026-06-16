import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { fetchClaims, summariseClaims } from "@/lib/operatingLoops/insuranceClaimLoopEngine";
import { bucketFilings, fetchFilings } from "@/lib/operatingLoops/statutoryFilingsEngine";
import { fetchSecRecords, summariseSec } from "@/lib/operatingLoops/corporateSecretarialEngine";
import { fetchExpansionRuns, readinessScore } from "@/lib/operatingLoops/internationalExpansionEngine";
import { fetchShareRequests, fetchTokens, pendingApprovalCount } from "@/lib/operatingLoops/dataRoomHardeningEngine";
import { awaitingFounderReview, fetchReleases } from "@/lib/operatingLoops/releaseWorkflowEngine";
import { consolidateRevenue, fetchFxRates, fetchFxWarnings } from "@/lib/operatingLoops/portfolioFxEngine";

type Counts = {
  claims: number; filingsOverdue: number; filings30: number; secDue: number;
  expansionBlocked: number; dataRoomPending: number; releaseReview: number; fxWarn: number;
};

export default function OperatingLoopsAttentionPanel() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [claims, filings, sec, exp, tokens, reqs, releases, rates, warns] = await Promise.all([
          fetchClaims(), fetchFilings(), fetchSecRecords(), fetchExpansionRuns(),
          fetchTokens(), fetchShareRequests(), fetchReleases(), fetchFxRates(), fetchFxWarnings(),
        ]);
        const fxRows = await consolidateRevenue(rates);
        const fxMissing = fxRows.filter(r => !r.has_rate).length + warns.length;
        setC({
          claims: summariseClaims(claims).review + summariseClaims(claims).overdueAction,
          filingsOverdue: bucketFilings(filings).overdue.length,
          filings30: bucketFilings(filings).in30.length,
          secDue: summariseSec(sec).dueCount + summariseSec(sec).reviewCount,
          expansionBlocked: exp.filter(r => r.go_no_go_status === "blocked" && readinessScore(r).blocked > 0).length,
          dataRoomPending: pendingApprovalCount(tokens, reqs),
          releaseReview: awaitingFounderReview(releases).length,
          fxWarn: fxMissing,
        });
      } catch { /* founder/admin gated; silently skip if unauthorised */ }
    })();
  }, []);

  const Item = ({ to, label, count }: { to: string; label: string; count: number }) => (
    <Link to={to} className="flex items-center justify-between border border-border/40 rounded p-2 hover:bg-secondary/40">
      <span className="text-xs">{label}</span>
      <Badge variant="outline" className={`text-[10px] ${count > 0 ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "text-muted-foreground"}`}>{count}</Badge>
    </Link>
  );

  return (
    <Card className="tech-card" id="sec-operating-loops">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck size={14} className="text-primary" />
          Operating loops — founder attention
          <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">Tracking only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Item to="/founder/insurance-claims" label="Claims needing action" count={c?.claims ?? 0} />
        <Item to="/founder/statutory-filings" label="Filings overdue" count={c?.filingsOverdue ?? 0} />
        <Item to="/founder/statutory-filings" label="Filings due 30d" count={c?.filings30 ?? 0} />
        <Item to="/founder/corporate-secretarial" label="Secretarial items due" count={c?.secDue ?? 0} />
        <Item to="/founder/international-expansion" label="Expansion blockers" count={c?.expansionBlocked ?? 0} />
        <Item to="/founder/data-room" label="Data room approvals" count={c?.dataRoomPending ?? 0} />
        <Item to="/founder/release-workflow" label="Releases for review" count={c?.releaseReview ?? 0} />
        <Item to="/founder/portfolio-fx" label="FX warnings" count={c?.fxWarn ?? 0} />
      </CardContent>
    </Card>
  );
}
