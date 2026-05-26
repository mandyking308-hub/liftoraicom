import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, ArrowRight } from "lucide-react";
import { summariseDeployment } from "@/lib/deploymentControl";

export default function DeploymentControlCard() {
  const { data: s } = useQuery({ queryKey: ["dep-card"], queryFn: summariseDeployment, refetchInterval: 60000 });
  const watch = (s?.envError ?? 0) + (s?.failedDeployments ?? 0) + (s?.failedMigrations ?? 0) + (s?.failedFunctions ?? 0) + (s?.missingCriticalVars ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket size={14} className="text-primary" /> Environment & Deployment Control
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">No auto-deploy</Badge>
          <Link to="/founder/deployment" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Envs" value={s?.environments ?? 0} />
          <Stat label="Deploys" value={s?.totalDeployments ?? 0} />
          <Stat label="Failed" value={s?.failedDeployments ?? 0} tone={s?.failedDeployments ? "bad" : undefined} />
          <Stat label="Fail migrations" value={s?.failedMigrations ?? 0} tone={s?.failedMigrations ? "bad" : undefined} />
          <Stat label="Fail fns" value={s?.failedFunctions ?? 0} tone={s?.failedFunctions ? "bad" : undefined} />
          <Stat label="Miss critical" value={s?.missingCriticalVars ?? 0} tone={s?.missingCriticalVars ? "bad" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}