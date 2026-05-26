import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrchLayout } from "./_shared";
import { summarizeEventBus, type EventBusSummary } from "@/lib/eventBusEngine";

export default function OrchestrationOverview() {
  const [s, setS] = useState<EventBusSummary | null>(null);
  useEffect(() => { summarizeEventBus().then(setS); }, []);
  const tile = (label: string, value: number | string, tone: "neutral"|"warning"|"critical"="neutral") => (
    <div className={`rounded-lg border px-3 py-2 ${tone==="critical"?"bg-rose-500/15 text-rose-400 border-rose-500/30":tone==="warning"?"bg-amber-500/15 text-amber-400 border-amber-500/30":"bg-muted text-muted-foreground border-border"}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
  return (
    <OrchLayout title="Event Bus Overview">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Live health</CardTitle></CardHeader>
        <CardContent>
          {!s ? <p className="text-xs text-muted-foreground">Loading…</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {tile("Events today", s.events_today)}
              {tile("Runs today", s.runs_today)}
              {tile("Failed runs (open)", s.failed_runs_open, s.failed_runs_open>0?"warning":"neutral")}
              {tile("Waiting approval", s.waiting_approval, s.waiting_approval>0?"warning":"neutral")}
              {tile("Critical failures", s.critical_failures, s.critical_failures>0?"critical":"neutral")}
            </div>
          )}
          {s && (
            <p className="text-xs text-muted-foreground mt-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] mr-2">Top action</Badge>
              {s.top_recommended_action}
            </p>
          )}
        </CardContent>
      </Card>
    </OrchLayout>
  );
}