import { useQuery } from "@tanstack/react-query";
import { TsLayout, Stat, RiskTable } from "./_shared";
import { Card } from "@/components/ui/card";
import { summariseTrustSafety, listRiskEvents } from "@/lib/trustSafety";

export default function TsOverview() {
  const { data: s } = useQuery({ queryKey: ["ts-summary"], queryFn: summariseTrustSafety, refetchInterval: 60000 });
  const { data: recent = [] } = useQuery({ queryKey: ["ts-recent"], queryFn: () => listRiskEvents({ limit: 15 }) });
  return (
    <TsLayout title="Trust, Fraud & Abuse" subtitle="Internal risk scoring across accounts, sellers, payments, payouts and messages. No suspensions or refunds happen automatically — actions are surfaced for founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Risk events" value={s?.totalEvents ?? 0} />
        <Stat label="Open" value={s?.open ?? 0} tone={s?.open ? "warn" : undefined} />
        <Stat label="Review required" value={s?.reviewRequired ?? 0} tone={s?.reviewRequired ? "warn" : undefined} />
        <Stat label="Action required" value={s?.actionRequired ?? 0} tone={s?.actionRequired ? "bad" : undefined} />
        <Stat label="Approvals waiting" value={s?.actionsAwaitingApproval ?? 0} tone={s?.actionsAwaitingApproval ? "warn" : undefined} />
        <Stat label="High severity" value={s?.highSeverity ?? 0} tone={s?.highSeverity ? "bad" : undefined} />
        <Stat label="Critical" value={s?.criticalSeverity ?? 0} tone={s?.criticalSeverity ? "bad" : undefined} />
        <Stat label="Abuse flags" value={s?.abuseFlags ?? 0} tone={s?.abuseFlags ? "warn" : undefined} />
        <Stat label="Approved & done" value={s?.approvedActionsCompleted ?? 0} tone="ok" />
        <Stat label="Auto actions" value={0} tone="ok" hint="Hard-coded to zero" />
      </div>

      <Card className="tech-card p-4">
        <h2 className="text-sm font-semibold mb-2">Watch items</h2>
        {(s?.watchItems?.length ?? 0) === 0
          ? <p className="text-xs text-muted-foreground">No watch items. Trust posture nominal.</p>
          : <ul className="text-xs space-y-1 text-yellow-300">{s!.watchItems.map((w, i) => <li key={i}>• {w}</li>)}</ul>}
      </Card>

      <RiskTable rows={recent} />
    </TsLayout>
  );
}
