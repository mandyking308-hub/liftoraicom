import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, ArrowRight } from "lucide-react";
import { summariseExperiments } from "@/lib/experimentEngine";

export default function ExperimentEngineCard() {
  const { data: s } = useQuery({ queryKey: ["exp-card"], queryFn: summariseExperiments, refetchInterval: 60000 });
  const watch = (s?.pendingApproval ?? 0) + (s?.winnersPending ?? 0) + (s?.failures ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FlaskConical size={14} className="text-primary" /> Experiment Engine
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">External launch gated</Badge>
          <Link to="/founder/experiments" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Plans" value={s?.plansTotal ?? 0} />
          <Stat label="Running" value={s?.plansRunning ?? 0} />
          <Stat label="Approval" value={s?.pendingApproval ?? 0} tone={s?.pendingApproval ? "warn" : undefined} />
          <Stat label="Winners" value={s?.winnersPending ?? 0} tone={s?.winnersPending ? "warn" : undefined} />
          <Stat label="Learnings" value={`${s?.learningsApplied ?? 0}/${s?.learningsTotal ?? 0}`} />
          <Stat label="Failures" value={s?.failures ?? 0} tone={s?.failures ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w,i)=><div key={i}>• {w}</div>)}</div>
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