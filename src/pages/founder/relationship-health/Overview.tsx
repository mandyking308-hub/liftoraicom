import { useQuery } from "@tanstack/react-query";
import { RhLayout, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { summariseRelationshipHealth, listEvents } from "@/lib/relationshipHealth";
import { Badge } from "@/components/ui/badge";

export default function RhOverview() {
  const { data: s } = useQuery({ queryKey: ["rh-summary"], queryFn: summariseRelationshipHealth, refetchInterval: 60000 });
  const { data: events = [] } = useQuery({ queryKey: ["rh-events-recent"], queryFn: () => listEvents(undefined, 12) });
  return (
    <RhLayout title="Relationship Health" subtitle="Internal scoring of customers, sellers, partners, vendors and advisers. No external contact happens from here — actions are surfaced for founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Scored" value={s?.total ?? 0} />
        <Stat label="Excellent" value={s?.byStatus.excellent ?? 0} tone="ok" />
        <Stat label="Healthy" value={s?.byStatus.healthy ?? 0} tone="ok" />
        <Stat label="Watch" value={s?.byStatus.watch ?? 0} tone={s?.byStatus.watch ? "warn" : undefined} />
        <Stat label="At risk" value={s?.atRisk ?? 0} tone={s?.atRisk ? "bad" : undefined} />
        <Stat label="Critical" value={s?.critical ?? 0} tone={s?.critical ? "bad" : undefined} />
        <Stat label="Customers" value={s?.byType.customer ?? 0} />
        <Stat label="Sellers" value={s?.byType.seller ?? 0} />
        <Stat label="Partners" value={s?.byType.partner ?? 0} />
        <Stat label="Upgrade opps" value={s?.upgradeOpps ?? 0} tone={s?.upgradeOpps ? "ok" : undefined} />
        <Stat label="Retention opps" value={s?.retentionOpps ?? 0} tone={s?.retentionOpps ? "warn" : undefined} />
        <Stat label="Awaiting approval" value={s?.oppsAwaitingApproval ?? 0} tone={s?.oppsAwaitingApproval ? "warn" : undefined} />
      </div>

      <Card className="tech-card p-4">
        <h2 className="text-sm font-semibold mb-2">Watch items</h2>
        {(s?.watchItems?.length ?? 0) === 0
          ? <p className="text-xs text-muted-foreground">No watch items. Relationship portfolio nominal.</p>
          : <ul className="text-xs space-y-1 text-yellow-300">{s!.watchItems.map((w, i) => <li key={i}>• {w}</li>)}</ul>}
      </Card>

      <Card className="tech-card p-4">
        <h3 className="text-sm font-semibold mb-2">Recent health events</h3>
        {events.length === 0 ? <p className="text-xs text-muted-foreground">No events.</p> :
          <ul className="text-xs space-y-1">{events.map(e => (
            <li key={e.id} className="flex items-center justify-between border-b border-border/30 pb-1">
              <span className="capitalize">{e.event_type.replace(/_/g," ")} <span className="text-muted-foreground">— {e.event_summary ?? ""}</span></span>
              <Badge variant="outline" className={`text-[10px] ${Number(e.score_impact) >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-300"}`}>{Number(e.score_impact) >= 0 ? "+" : ""}{Number(e.score_impact)}</Badge>
            </li>
          ))}</ul>}
      </Card>
    </RhLayout>
  );
}
