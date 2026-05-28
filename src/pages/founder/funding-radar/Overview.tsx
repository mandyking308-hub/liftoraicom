import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { fetchCompanies, fetchClusters, fetchShortlist, fetchMonthlyRuns } from "@/lib/fundingRadarEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

export default function FRRadarOverview() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    fetchCompanies().then(setCompanies).catch(() => {});
    fetchClusters().then(setClusters).catch(() => {});
    fetchShortlist().then(setShortlist).catch(() => {});
    fetchMonthlyRuns().then(setRuns).catch(() => {});
  }, []);

  const needsVerify = companies.filter((c) => c.needs_verification).length;
  const promoted = shortlist.filter((s) => s.status === "promoted").length;
  const latestRun = runs[0];

  return (
    <FundingRadarLayout
      title="Global Funding Radar"
      subtitle="Track well-funded companies, map them to capital-efficient build opportunities, and feed the existing Quarterly Build Selector. Founder-only. Outbound and external sending are not part of this module."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FRStat label="Companies tracked" value={companies.length} />
        <FRStat label="Problem clusters" value={clusters.length} />
        <FRStat label="Shortlisted" value={shortlist.length} />
        <FRStat label="Promoted to builds" value={promoted} />
        <FRStat label="Needs verification" value={needsVerify} hint="Missing or unverified fields" />
      </div>

      <FRSection
        title="Legal / IP guardrails"
        description="The radar may only extract: problem thesis, customer pain, market validation, buyer type, pricing logic, revenue model pattern, publicly visible weakness, distinct execution route. It will never recommend copying names, branding, website copy, UI, code, customer lists, proprietary workflows, confidential documents, or restricted scraped data."
      >
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-400">
          <ShieldAlert className="h-3 w-3" /> Distinct execution route required for promotion
        </Badge>
      </FRSection>

      <FRSection
        title="Latest monthly run"
        actions={<Button asChild size="sm" variant="outline"><Link to="/founder/funding-radar/monthly-run">Open monthly run</Link></Button>}
      >
        {latestRun ? (
          <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
            <FRStat label="Month" value={`${latestRun.month}/${latestRun.year}`} />
            <FRStat label="Status" value={latestRun.status} />
            <FRStat label="Reviewed" value={latestRun.candidates_reviewed} />
            <FRStat label="Shortlist size" value={latestRun.shortlist_size} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No monthly run yet. Start one from the Monthly run tab.</p>
        )}
      </FRSection>

      <FRSection title="Quick links">
        <div className="flex gap-2 flex-wrap text-xs">
          <Link to="/founder/funding-radar/companies" className="text-primary hover:underline">Companies →</Link>
          <Link to="/founder/funding-radar/clusters" className="text-primary hover:underline">Clusters →</Link>
          <Link to="/founder/funding-radar/capital-efficiency" className="text-primary hover:underline">Capital efficiency →</Link>
          <Link to="/founder/funding-radar/shortlist" className="text-primary hover:underline">Shortlist →</Link>
          <Link to="/founder/portfolio-exit/build-selector" className="text-primary hover:underline">Quarterly Build Selector →</Link>
        </div>
      </FRSection>
    </FundingRadarLayout>
  );
}