import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Focus, ArrowRight } from "lucide-react";
import { summariseAttention } from "@/lib/attentionGuardEngine";

export default function AttentionGuardCard() {
  const { data: s } = useQuery({ queryKey: ["att-card"], queryFn: summariseAttention, refetchInterval: 60000 });
  const overload = s?.overloadLevel ?? "normal";
  const tone = overload === "high" ? "border-red-500/40" : overload !== "normal" ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Focus size={14} className="text-primary" /> Attention Guard
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Critical never hidden</Badge>
          <Link to="/founder/attention-guard" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Overload" value={overload} tone={overload === "high" ? "bad" : overload !== "normal" ? "warn" : "ok"} />
          <Stat label="Top 10" value={s?.topTenCount ?? 0} />
          <Stat label="Founder only" value={s?.founderOnly ?? 0} tone={(s?.founderOnly ?? 0) > 12 ? "warn" : undefined} />
          <Stat label="Critical" value={s?.critical ?? 0} tone={s?.critical ? "bad" : undefined} />
          <Stat label="Delegate" value={s?.delegationCandidates ?? 0} tone={s?.delegationCandidates ? "warn" : undefined} />
          <Stat label="Fatigue" value={s?.openFatigueWarnings ?? 0} tone={s?.openFatigueWarnings ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w,i)=><div key={i}>- {w}</div>)}</div>
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
      <p className="text-sm font-bold capitalize">{value}</p>
    </div>
  );
}