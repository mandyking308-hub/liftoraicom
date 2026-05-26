import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PALayout, PASection, PAStat, fmtMoney } from "./_shared";
import {
  fetchProspects, fetchReferrals, fetchCommissionRules, fetchPerformance,
  summarize, diagnose,
  type PartnerProspect, type ReferralRecord, type CommissionRule, type PerformanceSnapshot,
} from "@/lib/partnerEngine";

export default function PAOverview() {
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

  return (
    <PALayout title="Affiliate / Partner / Referral Engine"
      subtitle="Manage affiliates, referral partners, strategic partners, creators and introducers as a controlled growth channel. Partner contact, affiliate invitations, commission commitments, contracts and payout setup require approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <PAStat label="Prospects" value={sum.prospects_total} hint={`${sum.active_partners} active`} />
        <PAStat label="Approval queue" value={sum.approval_queue} hint={`${sum.drafts_ready} drafts ready`} />
        <PAStat label="Referrals" value={sum.referrals_total} hint={`${sum.referrals_converted} converted`} />
        <PAStat label="Commission open" value={fmtMoney(sum.commission_due_open)} />
        <PAStat label="Commission paid" value={fmtMoney(sum.commission_due_paid)} />
        <PAStat label="Rules" value={sum.rules_active} hint={`${sum.rules_total} total`} />
      </div>

      <PASection title="Partner Agent — diagnostics"
        description="Finds opportunities, qualifies, drafts outreach, tracks referrals, flags commission obligations. Agent never contacts partners or pays commission."
        actions={<Link to="/founder/partners/prospects" className="text-xs text-primary hover:underline">Prospect board →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No partner warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {diags.slice(0, 60).map((d, i) => (
              <li key={`${d.id}-${i}`} className="flex items-start gap-2">
                <span className={d.severity === "block" ? "text-destructive" : d.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PASection>

      <PASection title="Integrations"
        description="Partner activity threads through the spine.">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          {[
            { to: "/founder/crm", label: "CRM — contacts & referrers" },
            { to: "/founder/revenue-autopilot", label: "Revenue Autopilot — lead flow" },
            { to: "/founder/channel-strategy", label: "Channel Strategy — channel mix" },
            { to: "/founder/contracts", label: "Contracts — partner agreements" },
            { to: "/founder/finance", label: "Finance — commission ledger" },
            { to: "/founder/approval-queue", label: "Approval Queue — contact & commission gates" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="border border-border/50 rounded p-2 hover:bg-secondary">{l.label}</Link>
          ))}
        </div>
      </PASection>
    </PALayout>
  );
}
