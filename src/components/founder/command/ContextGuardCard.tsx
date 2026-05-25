import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchEvents, fetchProfiles, summarize, type ContextEvent, type ContextProfile } from "@/lib/contextGuardEngine";

export default function ContextGuardCard() {
  const [events, setEvents] = useState<ContextEvent[]>([]);
  const [profiles, setProfiles] = useState<ContextProfile[]>([]);
  useEffect(() => {
    fetchEvents(200).then(setEvents).catch(() => {});
    fetchProfiles().then(setProfiles).catch(() => {});
  }, []);
  const sum = summarize(events, profiles);
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Multi-Business Context Guard
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Profiles" value={sum.profiles} />
          <Stat label="Events (24h)" value={sum.events_24h} />
          <Stat label="Missing business" value={sum.missing_24h} />
          <Stat label="Cross-contamination" value={sum.contamination_24h} />
        </div>
        {sum.blocked_24h > 0 && <p className="text-destructive">{sum.blocked_24h} external action{sum.blocked_24h === 1 ? "" : "s"} blocked.</p>}
        {sum.approvals_24h > 0 && <p className="text-yellow-300">{sum.approvals_24h} item{sum.approvals_24h === 1 ? "" : "s"} routed to approval.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/context-guard" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/context-guard/events" className="text-primary hover:underline">Events</Link>
          <Link to="/founder/context-guard/missing-business" className="text-primary hover:underline">Missing</Link>
          <Link to="/founder/context-guard/cross-contamination" className="text-primary hover:underline">Cross-contamination</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}