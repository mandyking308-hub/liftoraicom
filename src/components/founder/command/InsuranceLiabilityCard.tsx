import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchPolicies, fetchGaps, fetchEvents, summarize, diagnose,
  type InsurancePolicy, type InsuranceGap, type LiabilityEvent,
} from "@/lib/insuranceLiabilityEngine";

export default function InsuranceLiabilityCard() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [gaps, setGaps] = useState<InsuranceGap[]>([]);
  const [events, setEvents] = useState<LiabilityEvent[]>([]);
  useEffect(() => {
    fetchPolicies().then(setPolicies).catch(() => {});
    fetchGaps().then(setGaps).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
  }, []);
  const sum = summarize(policies, gaps, events);
  const diags = diagnose(policies, gaps, events);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Insurance / Liability Matrix
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Active" value={sum.policies_active} />
          <Stat label="Missing/expired" value={sum.policies_missing + sum.policies_expired} />
          <Stat label="Renewals 60d" value={sum.renew_soon} />
          <Stat label="Overdue" value={sum.renew_overdue} />
          <Stat label="Gaps open" value={sum.gaps_open} />
          <Stat label="Events open" value={sum.events_open} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/insurance-liability" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/insurance-liability/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/insurance-liability/policies" className="text-primary hover:underline">Policies</Link>
          <Link to="/founder/insurance-liability/gaps" className="text-primary hover:underline">Gaps</Link>
          <Link to="/founder/insurance-liability/claims" className="text-primary hover:underline">Claims</Link>
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