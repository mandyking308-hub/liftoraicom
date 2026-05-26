import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, ArrowRight } from "lucide-react";
import { summariseInternalSla } from "@/lib/internalSla";

export default function InternalSlaCard() {
  const { data: s } = useQuery({ queryKey: ["sla-card"], queryFn: summariseInternalSla, refetchInterval: 60000 });
  const watch = (s?.overdue ?? 0) + (s?.openBreaches ?? 0) + (s?.unassigned ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer size={14} className="text-primary" /> Internal SLA / Handoffs
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">No external send</Badge>
          <Link to="/founder/internal-sla" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Handoffs" value={s?.totalHandoffs ?? 0} />
          <Stat label="Open" value={s?.open ?? 0} tone={s?.open ? "warn" : undefined} />
          <Stat label="Overdue" value={s?.overdue ?? 0} tone={s?.overdue ? "bad" : undefined} />
          <Stat label="Unassigned" value={s?.unassigned ?? 0} tone={s?.unassigned ? "warn" : undefined} />
          <Stat label="Awaiting founder" value={s?.awaitingFounder ?? 0} tone={s?.awaitingFounder ? "warn" : undefined} />
          <Stat label="Breaches" value={s?.openBreaches ?? 0} tone={s?.openBreaches ? "bad" : undefined} />
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