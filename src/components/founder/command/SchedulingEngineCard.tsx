import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchResources, fetchAvailability, fetchBookings, fetchBookingEvents, summarize, type SchedulingSummary } from "@/lib/schedulingEngine";

export default function SchedulingEngineCard() {
  const [sum, setSum] = useState<SchedulingSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchResources(), fetchAvailability(), fetchBookings(), fetchBookingEvents()])
      .then(([r,a,b,e]) => setSum(summarize(r,a,b,e)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock size={14} className="text-primary" />
          Booking / Calendar / Scheduling
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Invites gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Plans availability, drafts bookings and detects conflicts. Booking links and external calendar events require founder approval or a pre-approved rule.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/scheduling/resources"    label="Resources"   value={sum?.active_resources} />
          <Tile to="/founder/scheduling/bookings"     label="Upcoming"    value={sum?.upcoming} />
          <Tile to="/founder/scheduling/bookings"     label="Drafts"      value={sum?.drafts} />
          <Tile to="/founder/scheduling/bookings"     label="Approval"    value={sum?.awaiting_approval} cls={warn(sum?.awaiting_approval ?? 0)} />
          <Tile to="/founder/scheduling/bookings"     label="Conflicts"   value={sum?.conflicts}         cls={bad(sum?.conflicts ?? 0)} />
          <Tile to="/founder/scheduling/no-shows"     label="No-shows"    value={sum?.no_shows}          cls={warn(sum?.no_shows ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/scheduling" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/scheduling/availability" className="text-primary hover:underline">Availability</Link>
          <Link to="/founder/scheduling/bookings" className="text-primary hover:underline">Bookings</Link>
          <Link to="/founder/scheduling/no-shows" className="text-primary hover:underline">No-shows</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}