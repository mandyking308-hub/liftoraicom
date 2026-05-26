import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchedLayout } from "./_shared";
import { fetchBookings, fetchBookingEvents, BOOKING_STATUS_META, type BookingRecord, type BookingEvent } from "@/lib/schedulingEngine";

export default function NoShows() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  useEffect(() => {
    fetchBookings().then(setBookings).catch(() => setBookings([]));
    fetchBookingEvents().then(setEvents).catch(() => setEvents([]));
  }, []);
  const noShows = bookings.filter(b => b.booking_status === "no_show" || b.booking_status === "cancelled" || b.booking_status === "rescheduled");
  const followUps = bookings.filter(b => b.booking_status === "completed" && !events.some(e => e.booking_id === b.id && e.event_type === "follow_up_created"));
  return (
    <SchedLayout title="No-shows, Cancellations & Follow-ups" subtitle="Internal tracking. Reach-out messages and reschedule invites require founder approval.">
      <Card className="tech-card p-3">
        <p className="text-xs font-semibold mb-2">No-shows & cancellations ({noShows.length})</p>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Type</th><th className="text-left p-1">Status</th><th className="text-left p-1">When</th></tr></thead>
          <tbody>
            {noShows.map(b => (
              <tr key={b.id} className="border-t border-border/50">
                <td className="p-1">{b.booking_type}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${BOOKING_STATUS_META[b.booking_status].cls}`}>{BOOKING_STATUS_META[b.booking_status].label}</Badge></td>
                <td className="p-1 text-muted-foreground">{b.scheduled_start ? new Date(b.scheduled_start).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {noShows.length === 0 && <tr><td colSpan={3} className="p-3 text-muted-foreground text-center">None.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card className="tech-card p-3">
        <p className="text-xs font-semibold mb-2">Follow-ups needed ({followUps.length})</p>
        <p className="text-[11px] text-muted-foreground">Completed bookings without a follow-up task. The Scheduling Agent prepares the draft; sending requires approval.</p>
      </Card>
    </SchedLayout>
  );
}