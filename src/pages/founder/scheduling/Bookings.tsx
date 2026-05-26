import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchedLayout } from "./_shared";
import { fetchBookings, BOOKING_STATUS_META, detectConflicts, type BookingRecord } from "@/lib/schedulingEngine";

export default function Bookings() {
  const [rows, setRows] = useState<BookingRecord[]>([]);
  useEffect(() => { fetchBookings().then(setRows).catch(() => setRows([])); }, []);
  const conflicts = detectConflicts(rows);
  const conflictIds = new Set(conflicts.flatMap(c => [c.a.id, c.b.id]));
  return (
    <SchedLayout title="Booking Dashboard" subtitle="Drafts, invites, booked and completed. Sending invite or creating provider event requires founder approval or pre-approved rule.">
      {conflicts.length > 0 && (
        <Card className="tech-card p-3 border-red-500/40">
          <p className="text-xs font-semibold text-red-300">{conflicts.length} resource conflict(s) detected</p>
          <p className="text-[11px] text-muted-foreground">Bookings sharing the same resource and overlapping time. Reschedule or split before sending invites.</p>
        </Card>
      )}
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Type</th><th className="text-left p-1">Status</th><th className="text-left p-1">Start</th><th className="text-left p-1">Provider</th><th className="text-left p-1">Approval</th><th className="text-left p-1">Conflict</th></tr></thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-t border-border/50">
                <td className="p-1">{b.booking_type}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${BOOKING_STATUS_META[b.booking_status].cls}`}>{BOOKING_STATUS_META[b.booking_status].label}</Badge></td>
                <td className="p-1 text-muted-foreground">{b.scheduled_start ? new Date(b.scheduled_start).toLocaleString() : "—"}</td>
                <td className="p-1">{b.calendar_provider ?? "manual"}</td>
                <td className="p-1">{b.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">required</Badge> : "—"}</td>
                <td className="p-1">{conflictIds.has(b.id) ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">conflict</Badge> : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </SchedLayout>
  );
}