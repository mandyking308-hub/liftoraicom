import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, Stat, TagBadge } from "./_shared";
import { summariseWindDown, fmtMoney } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownOverview() {
  const { data: s } = useQuery({ queryKey: ["wd-overview"], queryFn: summariseWindDown, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <WdLayout title="Business Wind-Down / Closure" subtitle="Liftor plans every pause, park, retire, close, sell, transfer or archive cleanly. External actions, customer notices, deletions and cancellations remain founder/legal approved.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Plans" value={s?.plansTotal ?? 0} />
          <Stat label="In progress" value={s?.plansActive ?? 0} />
          <Stat label="Awaiting approval" value={s?.pendingApproval ?? 0} tone={s?.pendingApproval ? "warn" : "ok"} />
          <Stat label="Checklist open" value={s?.checklistOpen ?? 0} />
          <Stat label="High-risk items" value={s?.checklistHighRisk ?? 0} tone={s?.checklistHighRisk ? "bad" : "ok"} />
          <Stat label="Customers pending" value={s?.customersPending ?? 0} tone={s?.customersPending ? "warn" : "ok"} />
          <Stat label="Refunds queued" value={fmtMoney(s?.refundsDue ?? 0)} tone={s && s.refundsDue > 0 ? "warn" : "ok"} />
          <Stat label="Vendors pending" value={s?.vendorsPending ?? 0} tone={s?.vendorsPending ? "warn" : "ok"} hint={fmtMoney(s?.monthlyVendorBurn ?? 0) + "/mo"} />
          <Stat label="Contracts pending" value={s?.contractsPending ?? 0} tone={s?.contractsPending ? "warn" : "ok"} />
          <Stat label="Legal reviews open" value={s?.legalReviewsOpen ?? 0} tone={s?.legalReviewsOpen ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Wind-down posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">No watch items. No wind-down activity pending.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No auto-close" tone="info" />
              <TagBadge label="No auto-delete" tone="info" />
              <TagBadge label="No auto-notify customers" tone="info" />
              <TagBadge label="No auto-cancel vendors" tone="info" />
              <TagBadge label="Archive + audit trail preserved" tone="info" />
              <TagBadge label="Feeds Decision Register + Adviser Pack" tone="info" />
            </div>
          </CardContent>
        </Card>
      </WdLayout>
    </FounderLayout>
  );
}