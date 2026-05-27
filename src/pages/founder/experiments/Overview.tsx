import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ExpLayout, Stat, TagBadge } from "./_shared";
import { summariseExperiments } from "@/lib/experimentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentsOverview() {
  const { data: s } = useQuery({ queryKey: ["exp-overview"], queryFn: summariseExperiments, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <ExpLayout title="Experiment & Growth Learning Engine" subtitle="Liftor designs, runs and learns from every test across offers, landing pages, sales playbooks, pricing and channels. External launches and ad spend remain founder-approved.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Plans" value={s?.plansTotal ?? 0} />
          <Stat label="Draft" value={s?.plansDraft ?? 0} />
          <Stat label="Approved" value={s?.plansApproved ?? 0} tone="ok" />
          <Stat label="Running" value={s?.plansRunning ?? 0} tone="ok" />
          <Stat label="Awaiting approval" value={s?.pendingApproval ?? 0} tone={s?.pendingApproval ? "warn" : "ok"} />
          <Stat label="Winners pending rollout" value={s?.winnersPending ?? 0} tone={s?.winnersPending ? "warn" : "ok"} />
          <Stat label="Learnings applied" value={`${s?.learningsApplied ?? 0}/${s?.learningsTotal ?? 0}`} />
          <Stat label="Failures logged" value={s?.failures ?? 0} tone={s?.failures ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Experiment posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">No watch items. Experiment pipeline is clean.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No uncontrolled testing" tone="info" />
              <TagBadge label="No ad spend without approval" tone="info" />
              <TagBadge label="No public price change without approval" tone="info" />
              <TagBadge label="Learnings feed channel/sales/product" tone="info" />
            </div>
          </CardContent>
        </Card>
      </ExpLayout>
    </FounderLayout>
  );
}