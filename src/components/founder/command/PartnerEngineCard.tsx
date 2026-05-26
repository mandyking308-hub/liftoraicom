import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchProspects, fetchReferrals, fetchCommissionRules, fetchPerformance,
  summarize, diagnose,
  type PartnerProspect, type ReferralRecord, type CommissionRule, type PerformanceSnapshot,
} from "@/lib/partnerEngine";

export default function PartnerEngineCard() {
  const [prospects, setProspects] = useState<PartnerProspect[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [perf, setPerf] = useState<PerformanceSnapshot[]>([]);
  useEffect(() => {
    fetchProspects().then(setProspects).catch(() => {});
    fetchReferrals().then(setReferrals).catch(() => {});
    fetchCommissionRules().then(setRules).catch(() => {});
    fetchPerformance().then(setPerf).catch(() => {});
  }, []);
  const sum = summarize(prospects, referrals, rules, perf);
  const diags = diagnose(prospects, referrals, rules, perf);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Handshake size={14} className="text-primary" />
          Affiliate / Partner / Referral
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Prospects" value={sum.prospects_total} />
          <Stat label="Active" value={sum.active_partners} />
          <Stat label="Approval q." value={sum.approval_queue} />
          <Stat label="Referrals" value={sum.referrals_total} />
          <Stat label="Converted" value={sum.referrals_converted} />
          <Stat label="Rules" value={sum.rules_active} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/partners" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/partners/prospects" className="text-primary hover:underline">Prospects</Link>
          <Link to="/founder/partners/referrals" className="text-primary hover:underline">Referrals</Link>
          <Link to="/founder/partners/affiliates" className="text-primary hover:underline">Affiliates</Link>
          <Link to="/founder/partners/commissions" className="text-primary hover:underline">Commissions</Link>
          <Link to="/founder/partners/performance" className="text-primary hover:underline">Performance</Link>
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
