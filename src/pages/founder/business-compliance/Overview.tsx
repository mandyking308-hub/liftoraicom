import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BCLayout, BCSection, BCStat, SeverityBadge, RiskBadge } from "./_shared";
import {
  fetchProfiles, fetchRules, fetchTriggers, diagnoseCompliance, summarize,
  type ComplianceProfile, type ComplianceRule, type ApprovalTrigger,
} from "@/lib/businessComplianceEngine";

export default function BCOverview() {
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
  return (
    <BCLayout title="Business Compliance Rules"
      subtitle="Per business, Liftor classifies compliance risk and enforces approval triggers for regulated claims, sensitive data and external publishing. Internal classification runs live; legal/compliance advice and external action remain approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <BCStat label="Businesses profiled" value={sum.businesses} />
        <BCStat label="Critical" value={sum.critical} />
        <BCStat label="High" value={sum.high} />
        <BCStat label="Active rules" value={sum.rules} />
        <BCStat label="Approval triggers" value={sum.triggers} />
        <BCStat label="Adviser-required rules" value={sum.adviser_required} />
      </div>

      <BCSection title="Warnings" description="Compliance Rules Agent diagnostics">
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No compliance warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <SeverityBadge level={w.severity} />
                <span className="text-muted-foreground font-mono">{w.business_id.slice(0,8)}</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </BCSection>

      <BCSection title="Profiles" actions={<Link to="/founder/business-compliance/businesses" className="text-xs text-primary hover:underline">Manage →</Link>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {profiles.slice(0, 10).map(p => (
            <div key={p.id} className="border border-border/50 rounded p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px]">{p.business_id.slice(0, 8)}</span>
                <RiskBadge level={p.compliance_risk_level} />
                {p.founder_confirmed ? <span className="text-[10px] text-emerald-400">confirmed</span> : <span className="text-[10px] text-yellow-300">unconfirmed</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{p.notes}</p>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-xs text-muted-foreground">No profiles yet.</p>}
        </div>
      </BCSection>
    </BCLayout>
  );
}