import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchProfiles, fetchRules, fetchTriggers, diagnoseCompliance, summarize,
  type ComplianceProfile, type ComplianceRule, type ApprovalTrigger,
} from "@/lib/businessComplianceEngine";

export default function BusinessComplianceCard() {
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [triggers, setTriggers] = useState<ApprovalTrigger[]>([]);
  useEffect(() => {
    fetchProfiles().then(setProfiles).catch(() => {});
    fetchRules().then(setRules).catch(() => {});
    fetchTriggers().then(setTriggers).catch(() => {});
  }, []);
  const sum = summarize(profiles, rules, triggers);
  const warns = diagnoseCompliance(profiles, rules, triggers);
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert size={14} className="text-primary" />
          Business Compliance Rules
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Businesses" value={sum.businesses} />
          <Stat label="Critical risk" value={sum.critical} />
          <Stat label="Active rules" value={sum.rules} />
          <Stat label="Approval triggers" value={sum.triggers} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"} — review before external action.</p>}
        {sum.adviser_required > 0 && <p className="text-yellow-300">{sum.adviser_required} rule{sum.adviser_required === 1 ? "" : "s"} require adviser review.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/business-compliance" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/business-compliance/businesses" className="text-primary hover:underline">By business</Link>
          <Link to="/founder/business-compliance/rules" className="text-primary hover:underline">Rules</Link>
          <Link to="/founder/business-compliance/approval-triggers" className="text-primary hover:underline">Triggers</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}