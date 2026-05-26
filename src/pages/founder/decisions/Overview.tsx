import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DecLayout, DecStat } from "./_shared";
import { fetchDecisions, fetchReminders, summarize, type DecisionSummary } from "@/lib/decisionRegister";

export default function DecisionsOverview() {
  const [sum, setSum] = useState<DecisionSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchDecisions(), fetchReminders()])
      .then(([d, r]) => setSum(summarize(d, r)))
      .catch(() => setSum(null));
  }, []);
  return (
    <DecLayout title="Founder Decision Register" subtitle="Every important decision across 25 businesses captured in one place. Internal capture, recommendations and tracking run live. Irreversible decisions, external communications, spend or provider changes need founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <DecStat label="Total" value={sum?.total ?? "—"} />
        <DecStat label="Open" value={sum?.open ?? "—"} tone={sum && sum.open > 0 ? "warn" : "ok"} />
        <DecStat label="Recommended" value={sum?.recommended ?? "—"} />
        <DecStat label="Founder review" value={sum?.founder_review ?? "—"} tone={sum && sum.founder_review > 0 ? "warn" : undefined} />
        <DecStat label="Decided" value={sum?.decided ?? "—"} />
        <DecStat label="Implemented" value={sum?.implemented ?? "—"} tone="ok" />
        <DecStat label="High value" value={sum?.high_value ?? "—"} />
        <DecStat label="High risk" value={sum?.high_risk ?? "—"} tone={sum && sum.high_risk > 0 ? "warn" : undefined} />
        <DecStat label="Irreversible open" value={sum?.irreversible_open ?? "—"} tone={sum && sum.irreversible_open > 0 ? "bad" : "ok"} />
        <DecStat label="By businesses" value={sum?.by_business ?? "—"} />
        <DecStat label="Reviews overdue" value={sum?.reminders_overdue ?? "—"} tone={sum && sum.reminders_overdue > 0 ? "bad" : "ok"} />
        <DecStat label="Test records" value={sum?.test_records ?? "—"} />
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
          <p className="font-semibold text-foreground">How the register works</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Major recommendations from portfolio, pricing, marketplace, data quality and legal/tax engines create a decision entry.</li>
            <li>Each decision shows options, reasoning, financial impact, risk and a recommended option.</li>
            <li>Founder records the decision. The register tracks whether it was implemented.</li>
            <li>Irreversible decisions (kill, legal/tax change, destructive data fix) are flagged and never executed automatically.</li>
            <li>Important decisions get a review reminder so they don't disappear.</li>
          </ul>
        </CardContent>
      </Card>
    </DecLayout>
  );
}