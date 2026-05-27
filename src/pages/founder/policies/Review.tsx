import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, TagBadge } from "./_shared";
import { listReviewEvents, listApprovals } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesReview() {
  const { data: events = [] } = useQuery({ queryKey: ["pol-events"], queryFn: listReviewEvents });
  const { data: approvals = [] } = useQuery({ queryKey: ["pol-approvals"], queryFn: listApprovals });
  return (
    <FounderLayout>
      <PolLayout title="Review queue" subtitle="Policy Coverage Agent events and approval decisions. Sensitive items routed to legal/adviser.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open review events</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {events.length === 0 && <p className="text-muted-foreground">No review events.</p>}
            {events.map(e => (
              <div key={e.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TagBadge label={e.event_type} tone="info" />
                  <TagBadge label={e.status} tone={e.status === "open" ? "warn" : "ok"} />
                  {e.routed_to && <TagBadge label={`→ ${e.routed_to}`} tone="muted" />}
                  <span className="text-muted-foreground">{e.triggered_by}</span>
                </div>
                {e.detail && <p className="text-muted-foreground">{e.detail}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approval decisions</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {approvals.length === 0 && <p className="text-muted-foreground">No approval records yet.</p>}
            {approvals.map(a => (
              <div key={a.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                <TagBadge label={a.approver_role} tone="info" />
                <TagBadge label={a.decision} tone={a.decision === "approved" ? "ok" : a.decision === "rejected" ? "bad" : "warn"} />
                {a.decided_at && <span className="text-muted-foreground">{a.decided_at}</span>}
                {a.notes && <span className="text-muted-foreground w-full">{a.notes}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      </PolLayout>
    </FounderLayout>
  );
}