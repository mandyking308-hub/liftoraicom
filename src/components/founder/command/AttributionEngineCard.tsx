import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchSources, fetchEvents, fetchModels, summarize, diagnose,
  type AttributionSource, type AttributionEvent, type AttributionModel,
} from "@/lib/attributionEngine";

export default function AttributionEngineCard() {
  const [sources, setSources] = useState<AttributionSource[]>([]);
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  const [models, setModels] = useState<AttributionModel[]>([]);
  useEffect(() => {
    fetchSources().then(setSources).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
    fetchModels().then(setModels).catch(() => {});
  }, []);
  const sum = summarize(sources, events, models);
  const diags = diagnose(sources, events, models);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 size={14} className="text-primary" />
          Analytics / Attribution Engine
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Sources" value={sum.sources_active} />
          <Stat label="Events" value={sum.events_total} />
          <Stat label="Leads" value={sum.leads} />
          <Stat label="Sales" value={sum.sales} />
          <Stat label="Revenue" value={sum.revenue.toFixed(0)} />
          <Stat label="Unknown %" value={`${sum.unknown_pct.toFixed(0)}%`} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} attribution blocker{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/analytics-attribution" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/analytics-attribution/sources" className="text-primary hover:underline">Sources</Link>
          <Link to="/founder/analytics-attribution/campaigns" className="text-primary hover:underline">Campaigns</Link>
          <Link to="/founder/analytics-attribution/revenue" className="text-primary hover:underline">Revenue</Link>
          <Link to="/founder/analytics-attribution/funnel" className="text-primary hover:underline">Funnel</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}