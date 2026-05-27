import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareHeart, ArrowRight } from "lucide-react";
import { summariseVoc, fmtMoney } from "@/lib/voiceOfCustomerEngine";

export default function VoiceOfCustomerCard() {
  const { data: s } = useQuery({ queryKey: ["voc-card"], queryFn: summariseVoc, refetchInterval: 60000 });
  const watch = (s?.negativeCount ?? 0) + (s?.testimonialsPending ?? 0) + (s?.reviewsPending ?? 0) + (s?.pmfWatch ?? 0) + (s?.insightsPending ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareHeart size={14} className="text-primary" /> Voice of Customer
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Customer asks gated</Badge>
          <Link to="/founder/customer-feedback" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Feedback" value={s?.feedbackTotal ?? 0} />
          <Stat label="Negative" value={s?.negativeCount ?? 0} tone={s?.negativeCount ? "warn" : undefined} />
          <Stat label="Features" value={s?.featureRequestsOpen ?? 0} />
          <Stat label="Testimonials" value={s?.testimonialsPending ?? 0} tone={s?.testimonialsPending ? "warn" : undefined} />
          <Stat label="Churn £" value={fmtMoney(s?.churnImpact ?? 0)} tone={s && s.churnImpact > 0 ? "bad" : undefined} />
          <Stat label="PMF watch" value={s?.pmfWatch ?? 0} tone={s?.pmfWatch ? "warn" : undefined} />
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