import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PowerOff, ArrowRight } from "lucide-react";
import { summariseWindDown, fmtMoney } from "@/lib/windDownEngine";

export default function WindDownCard() {
  const { data: s } = useQuery({ queryKey: ["wd-card"], queryFn: summariseWindDown, refetchInterval: 60000 });
  const watch = (s?.pendingApproval ?? 0) + (s?.customersPending ?? 0) + (s?.vendorsPending ?? 0) + (s?.contractsPending ?? 0) + (s?.legalReviewsOpen ?? 0) + (s?.checklistHighRisk ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PowerOff size={14} className="text-primary" /> Business Wind-Down
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live planning</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Closures gated</Badge>
          <Link to="/founder/business-wind-down" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Plans" value={s?.plansTotal ?? 0} />
          <Stat label="Approval" value={s?.pendingApproval ?? 0} tone={s?.pendingApproval ? "warn" : undefined} />
          <Stat label="Customers" value={s?.customersPending ?? 0} tone={s?.customersPending ? "warn" : undefined} />
          <Stat label="Refunds" value={fmtMoney(s?.refundsDue ?? 0)} tone={s && s.refundsDue > 0 ? "warn" : undefined} />
          <Stat label="Vendors" value={s?.vendorsPending ?? 0} tone={s?.vendorsPending ? "warn" : undefined} />
          <Stat label="Legal" value={s?.legalReviewsOpen ?? 0} tone={s?.legalReviewsOpen ? "warn" : undefined} />
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