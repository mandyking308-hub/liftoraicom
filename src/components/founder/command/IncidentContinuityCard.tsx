import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertOctagon, ArrowRight } from "lucide-react";
import { computeIncidentSnapshot, type IncidentSnapshot } from "@/lib/incidentEngine";

export default function IncidentContinuityCard() {
  const [snap, setSnap] = useState<IncidentSnapshot | null>(null);
  useEffect(() => { computeIncidentSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon size={16} className="text-primary" />
          Incident / Continuity
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live triage</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Notices gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Live" value={snap.live_open} tone={snap.live_open > 0 ? "warn" : "good"} />
              <Stat label="Critical" value={snap.critical_open} tone={snap.critical_open > 0 ? "bad" : "good"} />
              <Stat label="Notices pending" value={snap.awaiting_customer_notice + snap.awaiting_regulator_notice} tone={(snap.awaiting_customer_notice + snap.awaiting_regulator_notice) > 0 ? "warn" : "good"} />
              <Stat label="Postmortems open" value={snap.postmortems_open} tone={snap.postmortems_open > 0 ? "warn" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/incidents" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Incident Console <ArrowRight size={12} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}