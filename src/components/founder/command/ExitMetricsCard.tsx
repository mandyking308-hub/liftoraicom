import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTemplates, fetchValues, fetchScores, summarize, diagnose,
  type ExitMetricTemplate, type BusinessExitMetricValue, type ExitReadinessScore,
} from "@/lib/exitMetricsEngine";

export default function ExitMetricsCard() {
  const [templates, setTemplates] = useState<ExitMetricTemplate[]>([]);
  const [values, setValues] = useState<BusinessExitMetricValue[]>([]);
  const [scores, setScores] = useState<ExitReadinessScore[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string | null; name: string; archetype: string | null }>>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchValues().then(setValues).catch(() => {});
    fetchScores().then(setScores).catch(() => {});
    (async () => {
      try {
        const sb: any = supabase as any;
        const { data } = await sb.from("businesses").select("id,name,archetype");
        setBusinesses((data ?? []).map((b: any) => ({ id: b.id, name: b.name ?? "—", archetype: b.archetype ?? null })));
      } catch {}
    })();
  }, []);
  const sum = summarize(templates, values, scores);
  const diags = diagnose(templates, values, scores, businesses);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          Business-Type Exit Metrics
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Avg readiness" value={`${sum.avg_readiness}%`} />
          <Stat label="Exit-ready" value={sum.exit_ready} />
          <Stat label="Not ready" value={sum.not_ready} />
          <Stat label="Missing values" value={sum.values_missing} />
          <Stat label="Strong values" value={sum.values_strong} />
          <Stat label="Templates" value={sum.templates_total} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/exit-metrics" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/exit-metrics/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/exit-metrics/archetypes" className="text-primary hover:underline">Archetypes</Link>
          <Link to="/founder/exit-metrics/readiness" className="text-primary hover:underline">Readiness</Link>
          <Link to="/founder/exit-metrics/buyer-fit" className="text-primary hover:underline">Buyer fit</Link>
          <Link to="/founder/exit-metrics/data-room" className="text-primary hover:underline">Data room</Link>
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