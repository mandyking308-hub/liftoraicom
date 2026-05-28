import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { fetchCompanies, fetchClusters, fetchShortlist, fetchMonthlyRuns } from "@/lib/fundingRadarEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock } from "lucide-react";

const CONNECTOR_PLACEHOLDERS = [
  "Crunchbase","Dealroom","PitchBook","Tracxn","CB Insights",
  "Investor newsletters","Funding press releases","Public company websites",
];

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
        title="Operating mode"
        description="Current mode: Manual / CSV-first intelligence. Future mode: API-assisted intelligence — only after founder approves licensed/paid data connectors. All connector activation is gated."
      >
        <div className="flex flex-wrap gap-2">
          {CONNECTOR_PLACEHOLDERS.map((c) => (
            <Badge key={c} variant="outline" className="gap-1 border-amber-500/30 text-amber-300 text-[10px]">
              <Lock className="h-3 w-3" /> {c} · founder approval required
            </Badge>
          ))}
        </div>
      </FRSection>

      <FRSection title="Monthly cadence">
        <p className="text-xs text-muted-foreground">
          Scheduled job <span className="text-foreground font-medium">Monthly Funding Radar Operating Cycle</span> runs on the 1st of each month at 09:00 Europe/London. Adjust manually if the 1st is a weekend or bank holiday. The job prepares the monthly run, refreshes dashboard metrics and the Decision Pack, and creates a founder-facing internal task. It never contacts companies, investors, customers or acquirers, never activates paid APIs, never scrapes restricted sources, never exports data and never opens a data room.
        </p>
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
          <Link to="/founder/funding-radar/decision-pack" className="text-primary hover:underline">Decision pack →</Link>
          <Link to="/founder/funding-radar/settings" className="text-primary hover:underline">Runbook (Settings) →</Link>
          <Link to="/founder/portfolio-exit/build-selector" className="text-primary hover:underline">Quarterly Build Selector →</Link>
        </div>
      </FRSection>
    </FundingRadarLayout>
  );
}