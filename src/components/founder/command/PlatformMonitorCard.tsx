import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight } from "lucide-react";
import { summariseMonitor } from "@/lib/platformMonitor";

export default function PlatformMonitorCard() {
  const { data: s } = useQuery({ queryKey: ["platform-monitor-card"], queryFn: summariseMonitor, refetchInterval: 60000 });
  const watch = (s?.criticalOpen ?? 0) + (s?.highOpen ?? 0) + (s?.edgeErrors ?? 0) + (s?.recsAwaitingApproval ?? 0);
  const tone = (s?.criticalOpen ?? 0) > 0 ? "border-red-500/40" : watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity size={14} className="text-primary" /> Platform Performance / Cost / Scalability
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">No infra change</Badge>
          <Link to="/founder/platform-monitor" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Open events" value={s?.openEvents ?? 0} tone={s?.openEvents ? "warn" : undefined} />
          <Stat label="Critical" value={s?.criticalOpen ?? 0} tone={s?.criticalOpen ? "bad" : undefined} />
          <Stat label="High" value={s?.highOpen ?? 0} tone={s?.highOpen ? "warn" : undefined} />
          <Stat label="Edge errors" value={s?.edgeErrors ?? 0} tone={s?.edgeErrors ? "bad" : undefined} />
          <Stat label="Rate limits" value={s?.rateLimits ?? 0} tone={s?.rateLimits ? "warn" : undefined} />
          <Stat label="30d cost (USD)" value={(s?.costLast30d ?? 0).toFixed(2)} />
          <Stat label="30d AI cost" value={(s?.aiCostLast30d ?? 0).toFixed(2)} />
          <Stat label="Large tables" value={s?.largeTables ?? 0} tone={s?.largeTables ? "warn" : undefined} />
          <Stat label="Bundle warns" value={s?.bundleWarnings ?? 0} tone={s?.bundleWarnings ? "warn" : undefined} />
          <Stat label="Recs" value={s?.recommendations ?? 0} />
          <Stat label="Awaiting approval" value={s?.recsAwaitingApproval ?? 0} tone={s?.recsAwaitingApproval ? "warn" : undefined} />
          <Stat label="Implemented" value={s?.recsApproved ?? 0} tone="ok" />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}