import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, Stat, TagBadge } from "./_shared";
import { summarisePolicies } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesOverview() {
  const { data: s } = useQuery({ queryKey: ["pol-overview"], queryFn: summarisePolicies, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <PolLayout title="Policy / Terms Coverage Engine" subtitle="Liftor tracks every required public policy across every business — terms, privacy, refund, cookie, marketplace, seller, subscription, disclaimer, delivery, support. Publishing requires founder/legal approval.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Businesses" value={s?.businesses ?? 0} />
          <Stat label="Requirements" value={s?.requirementsTotal ?? 0} />
          <Stat label="Missing" value={s?.missing ?? 0} tone={s?.missing ? "bad" : "ok"} />
          <Stat label="Stale" value={s?.stale ?? 0} tone={s?.stale ? "warn" : "ok"} />
          <Stat label="Drafts pending approval" value={s?.draftsPendingApproval ?? 0} tone={s?.draftsPendingApproval ? "warn" : "ok"} />
          <Stat label="Legal review pending" value={s?.legalReviewPending ?? 0} tone={s?.legalReviewPending ? "warn" : "ok"} />
          <Stat label="Pages awaiting publish" value={s?.pagesAwaitingPublish ?? 0} tone={s?.pagesAwaitingPublish ? "warn" : "ok"} />
          <Stat label="Pages published" value={s?.publishedPages ?? 0} tone="ok" />
          <Stat label="Review events open" value={s?.reviewEventsOpen ?? 0} tone={s?.reviewEventsOpen ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Coverage posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">No watch items. Policy coverage is current.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No auto-publish" tone="info" />
              <TagBadge label="No silent terms change" tone="info" />
              <TagBadge label="Sensitive items → legal/adviser" tone="info" />
              <TagBadge label="Linked to Entity Map" tone="info" />
              <TagBadge label="Feeds Document Vault" tone="info" />
            </div>
          </CardContent>
        </Card>
      </PolLayout>
    </FounderLayout>
  );
}