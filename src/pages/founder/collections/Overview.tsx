import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, Stat, TagBadge } from "./_shared";
import { summariseCollections, fmtMoney } from "@/lib/collectionsEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectionsOverview() {
  const { data: s } = useQuery({ queryKey: ["col-overview"], queryFn: summariseCollections, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <ColLayout title="Collections Overview" subtitle="Liftor tracks every overdue invoice, failed payment and recovery decision. Customer chases, retries and service holds never happen without founder approval.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Overdue open" value={s?.overdueOpen ?? 0} tone={s?.overdueOpen ? "warn" : "ok"} />
          <Stat label="Outstanding" value={fmtMoney(s?.overdueAmount ?? 0)} tone={s && s.overdueAmount > 0 ? "warn" : "ok"} />
          <Stat label="Failed payments" value={s?.failedOpen ?? 0} tone={s?.failedOpen ? "bad" : "ok"} />
          <Stat label="At-risk amount" value={fmtMoney(s?.failedAmount ?? 0)} tone={s && s.failedAmount > 0 ? "bad" : "ok"} />
          <Stat label="High-risk debt" value={s?.highRisk ?? 0} tone={s?.highRisk ? "bad" : "ok"} />
          <Stat label="Reminders pending" value={s?.remindersPending ?? 0} tone={s?.remindersPending ? "warn" : "ok"} />
          <Stat label="Actions need approval" value={s?.actionsPendingApproval ?? 0} tone={s?.actionsPendingApproval ? "warn" : "ok"} />
          <Stat label="Payment plans" value={s?.paymentPlansProposed ?? 0} />
          <Stat label="Service holds rec." value={s?.serviceHoldsRecommended ?? 0} tone={s?.serviceHoldsRecommended ? "warn" : "ok"} />
          <Stat label="Write-offs pending" value={s?.writeoffsRecommended ?? 0} tone={s?.writeoffsRecommended ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recovery posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">No watch items. Collections posture clean.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No auto-chasing" tone="info" />
              <TagBadge label="No auto-retry" tone="info" />
              <TagBadge label="No auto service hold" tone="info" />
              <TagBadge label="No auto write-off" tone="info" />
            </div>
          </CardContent>
        </Card>
      </ColLayout>
    </FounderLayout>
  );
}