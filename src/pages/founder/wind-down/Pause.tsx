import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listPlans } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownPause() {
  const { data: plans = [] } = useQuery({ queryKey: ["wd-plans"], queryFn: listPlans });
  return (
    <FounderLayout>
      <WdLayout title="Pause / Park / Close plans" subtitle="Every plan defines mode, reason, target date and risk. External actions are gated.">
        <div className="space-y-2">
          {plans.length === 0 && <p className="text-xs text-muted-foreground">No plans yet.</p>}
          {plans.map(p => (
            <Card key={p.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{p.business_name}</span>
                  <TagBadge label={p.mode} tone={p.mode === "close" || p.mode === "retire" ? "bad" : p.mode === "sell" || p.mode === "transfer" ? "warn" : "info"} />
                  <TagBadge label={p.status} tone={p.status === "in_progress" ? "ok" : p.status === "blocked" ? "bad" : "muted"} />
                  <TagBadge label={p.approval_status} tone={p.approval_status === "approved" ? "ok" : p.approval_status === "rejected" ? "bad" : "warn"} />
                  {p.is_test_data && <TagBadge label="LIVE_INTERNAL_TEST" tone="info" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                {p.reason && <p><span className="text-muted-foreground">Reason:</span> {p.reason}</p>}
                {p.target_date && <p><span className="text-muted-foreground">Target date:</span> {p.target_date}</p>}
                {p.risk_notes && <p className="text-yellow-300">Risk: {p.risk_notes}</p>}
                {p.requires_external_actions && <TagBadge label="external actions require approval" tone="warn" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </WdLayout>
    </FounderLayout>
  );
}