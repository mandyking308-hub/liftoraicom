import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowRight } from "lucide-react";
import { summariseCollections, fmtMoney } from "@/lib/collectionsEngine";

export default function CollectionsCard() {
  const { data: s } = useQuery({ queryKey: ["col-card"], queryFn: summariseCollections, refetchInterval: 60000 });
  const watch = (s?.highRisk ?? 0) + (s?.failedOpen ?? 0) + (s?.remindersPending ?? 0) + (s?.serviceHoldsRecommended ?? 0) + (s?.writeoffsRecommended ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins size={14} className="text-primary" /> Collections & Dunning
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Chase / retry / hold gated</Badge>
          <Link to="/founder/collections" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Overdue" value={s?.overdueOpen ?? 0} />
          <Stat label="Outstanding" value={fmtMoney(s?.overdueAmount ?? 0)} tone={s && s.overdueAmount > 0 ? "warn" : undefined} />
          <Stat label="Failed pay" value={s?.failedOpen ?? 0} tone={s?.failedOpen ? "bad" : undefined} />
          <Stat label="High risk" value={s?.highRisk ?? 0} tone={s?.highRisk ? "bad" : undefined} />
          <Stat label="Reminders" value={s?.remindersPending ?? 0} tone={s?.remindersPending ? "warn" : undefined} />
          <Stat label="Hold rec." value={s?.serviceHoldsRecommended ?? 0} tone={s?.serviceHoldsRecommended ? "warn" : undefined} />
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