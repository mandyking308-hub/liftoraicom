import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchedLayout, SchedStat } from "./_shared";
import { fetchResources, fetchAvailability, fetchBookings, fetchBookingEvents, summarize, type SchedulingSummary } from "@/lib/schedulingEngine";

export default function SchedulingOverview() {
  const [sum, setSum] = useState<SchedulingSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchResources(), fetchAvailability(), fetchBookings(), fetchBookingEvents()])
      .then(([r,a,b,e]) => setSum(summarize(r,a,b,e)))
      .catch(() => setSum(null));
  }, []);
  return (
    <SchedLayout title="Scheduling Overview" subtitle="Availability, booking drafts and conflict detection run live. Sending booking links or creating external calendar events requires founder approval or pre-approved rule.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SchedStat label="Active resources" value={sum?.active_resources ?? "—"} hint={`${sum?.resources ?? 0} total`} />
        <SchedStat label="Availability windows" value={sum?.availability_rows ?? "—"} />
        <SchedStat label="Upcoming" value={sum?.upcoming ?? "—"} />
        <SchedStat label="Awaiting approval" value={sum?.awaiting_approval ?? "—"} tone={(sum?.awaiting_approval ?? 0) > 0 ? "warn" : "ok"} />
        <SchedStat label="Conflicts" value={sum?.conflicts ?? "—"} tone={(sum?.conflicts ?? 0) > 0 ? "bad" : "ok"} />
        <SchedStat label="No-shows" value={sum?.no_shows ?? "—"} tone={(sum?.no_shows ?? 0) > 0 ? "warn" : "ok"} />
        <SchedStat label="Follow-ups" value={sum?.follow_ups_needed ?? "—"} tone={(sum?.follow_ups_needed ?? 0) > 0 ? "warn" : "ok"} />
        <SchedStat label="Drafts" value={sum?.drafts ?? "—"} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top alert</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {sum?.top_alert ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">{sum.top_alert.severity}</Badge>
              <span className="text-foreground">{sum.top_alert.summary}</span>
            </div>
          ) : <p>No open alerts.</p>}
          <p className="mt-2 text-[11px]">Test records: {sum?.test_records ?? 0} (excluded from live operations).</p>
        </CardContent>
      </Card>
    </SchedLayout>
  );
}