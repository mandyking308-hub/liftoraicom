import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, ArrowRight } from "lucide-react";
import { summariseRelationshipHealth } from "@/lib/relationshipHealth";

export default function RelationshipHealthCard() {
  const { data: s } = useQuery({ queryKey: ["rh-card"], queryFn: summariseRelationshipHealth, refetchInterval: 60000 });
  const watch = (s?.atRisk ?? 0) + (s?.critical ?? 0) + (s?.oppsAwaitingApproval ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HeartPulse size={14} className="text-primary" /> Relationship Health
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Contact needs approval</Badge>
          <Link to="/founder/relationship-health" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Scored" value={s?.total ?? 0} />
          <Stat label="Healthy" value={(s?.byStatus.excellent ?? 0) + (s?.byStatus.healthy ?? 0)} tone="ok" />
          <Stat label="Watch" value={s?.byStatus.watch ?? 0} tone={s?.byStatus.watch ? "warn" : undefined} />
          <Stat label="At risk" value={s?.atRisk ?? 0} tone={s?.atRisk ? "bad" : undefined} />
          <Stat label="Critical" value={s?.critical ?? 0} tone={s?.critical ? "bad" : undefined} />
          <Stat label="Opp approvals" value={s?.oppsAwaitingApproval ?? 0} tone={s?.oppsAwaitingApproval ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-400" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
