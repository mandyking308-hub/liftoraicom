import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, LifeBuoy, ArrowRight } from "lucide-react";
import { computeSupportSnapshot, type SupportSnapshot } from "@/lib/supportTickets";

export default function SupportSLACard() {
  const [snap, setSnap] = useState<SupportSnapshot | null>(null);
  useEffect(() => { computeSupportSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LifeBuoy size={16} className="text-primary" />
          Support Ticketing + SLA
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live triage</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Replies approval-gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Calculating…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Open" value={snap.total_open} />
              <Stat label="Critical" value={snap.critical} tone={snap.critical > 0 ? "bad" : "good"} />
              <Stat label="SLA overdue" value={snap.sla_overdue} tone={snap.sla_overdue > 0 ? "bad" : "good"} />
              <Stat label="Escalated" value={snap.escalated} tone={snap.escalated > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/support-tickets" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Support Engine <ArrowRight size={12} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}