import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PMLayout, PMStat } from "./_shared";
import { fetchSummaries, fetchPacks, fetchHistory, summarize, type PortfolioMemorySummary } from "@/lib/portfolioMemory";

export default function PMOverview() {
  const [sum, setSum] = useState<PortfolioMemorySummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSummaries(), fetchPacks(), fetchHistory()])
      .then(([s,p,h]) => setSum(summarize(s,p,h)))
      .catch(() => setSum(null));
  }, []);
  return (
    <PMLayout title="Portfolio Memory / Handover" subtitle="Explain any of 25 businesses to Mandy, a VA, adviser, operator, buyer or future team member in 5 minutes. Internal briefs and handover packs run live; sharing externally requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <PMStat label="Summaries" value={sum?.summaries ?? "—"} />
        <PMStat label="Live summaries" value={sum?.live_summaries ?? "—"} />
        <PMStat label="Stale summaries" value={sum?.stale_summaries ?? "—"} tone={sum && sum.stale_summaries > 0 ? "warn" : "ok"} />
        <PMStat label="Packs total" value={sum?.packs ?? "—"} />
        <PMStat label="Drafts" value={sum?.packs_draft ?? "—"} />
        <PMStat label="In review" value={sum?.packs_review ?? "—"} tone={sum && sum.packs_review > 0 ? "warn" : undefined} />
        <PMStat label="Approved" value={sum?.packs_approved ?? "—"} tone="ok" />
        <PMStat label="Shared / exported" value={sum?.packs_shared ?? "—"} />
        <PMStat label="Sensitive awaiting approval" value={sum?.sensitive_unapproved ?? "—"} tone={sum && sum.sensitive_unapproved > 0 ? "bad" : "ok"} />
        <PMStat label="Operator packs" value={sum?.operator_packs ?? "—"} />
        <PMStat label="Adviser packs" value={sum?.adviser_packs ?? "—"} />
        <PMStat label="Buyer packs" value={sum?.buyer_packs ?? "—"} />
      </div>
      {sum?.top_alert && (
        <Card className="tech-card border-primary/30">
          <CardContent className="p-3 text-sm">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="font-medium">{sum.top_alert.summary}</p>
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">5-minute brief contents</p>
          <p>What the business is · archetype · lifecycle stage · legal entity · products / offers · target customer · sales channels · revenue / pipeline · AI agents active · open approvals · open work · risks · documents · next 5 actions · what not to do.</p>
          <p className="font-semibold text-foreground pt-2">Sharing rules</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>LIVE_INTERNAL_TEST rows are excluded from real briefs and labelled in test sections.</li>
            <li>Sensitive packs (confidential / restricted / legal / financial) require founder approval before export or share.</li>
            <li>Buyer / adviser briefs never include raw secrets — values are redacted.</li>
            <li>Operator briefs include work instructions, not confidential finance unless permitted.</li>
          </ul>
        </CardContent>
      </Card>
    </PMLayout>
  );
}