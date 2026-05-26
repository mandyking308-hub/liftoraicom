import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";
import { summarizeEventBus, type EventBusSummary } from "@/lib/eventBusEngine";

export default function EventBusHealthCard() {
  const [s, setS] = useState<EventBusSummary | null>(null);
  useEffect(() => { summarizeEventBus().then(setS); }, []);
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Workflow size={18} className="text-primary" /> Event Bus Health
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live-first</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {!s ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Link to="/founder/orchestration/events" className="rounded-md border border-border px-2 py-1.5 hover:border-primary/40"><div className="text-[10px] text-muted-foreground">Events today</div><div className="font-semibold">{s.events_today}</div></Link>
              <Link to="/founder/orchestration/runs" className="rounded-md border border-border px-2 py-1.5 hover:border-primary/40"><div className="text-[10px] text-muted-foreground">Runs today</div><div className="font-semibold">{s.runs_today}</div></Link>
              <Link to="/founder/orchestration/failures" className={`rounded-md border px-2 py-1.5 hover:border-primary/40 ${s.failed_runs_open>0?"border-amber-500/40 text-amber-400":"border-border"}`}><div className="text-[10px] opacity-70">Failed runs</div><div className="font-semibold">{s.failed_runs_open}</div></Link>
              <Link to="/founder/orchestration/runs" className={`rounded-md border px-2 py-1.5 hover:border-primary/40 ${s.waiting_approval>0?"border-amber-500/40 text-amber-400":"border-border"}`}><div className="text-[10px] opacity-70">Waiting approval</div><div className="font-semibold">{s.waiting_approval}</div></Link>
              <Link to="/founder/orchestration/failures" className={`rounded-md border px-2 py-1.5 hover:border-primary/40 ${s.critical_failures>0?"border-rose-500/40 text-rose-400":"border-border"}`}><div className="text-[10px] opacity-70">Critical</div><div className="font-semibold">{s.critical_failures}</div></Link>
            </div>
            <p className="text-muted-foreground"><span className="text-foreground font-medium">Top action:</span> {s.top_recommended_action}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}