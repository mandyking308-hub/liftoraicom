import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRLayout, PRSection, PRStat, NoAutoActionsBanner } from "./_shared";
import { computePrivacySnapshot, type PrivacySnapshot } from "@/lib/privacyEngine";

export default function PrivacyOverview() {
  const [snap, setSnap] = useState<PrivacySnapshot | null>(null);
  useEffect(() => { computePrivacySnapshot().then(setSnap); }, []);

  if (!snap) return <PRLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating privacy posture…</p></PRLayout>;

  return (
    <PRLayout title="Overview" subtitle="GDPR / DSAR / retention / consent / processor register / breach response. Internal tracking is live. Customer-data deletion or export, legal responses and regulator/customer notices require founder/legal approval.">
      <NoAutoActionsBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PRStat label="DSARs open" value={snap.dsar_open} hint={`${snap.dsar_total} total`} />
        <PRStat label="DSAR overdue" value={snap.dsar_overdue} tone={snap.dsar_overdue > 0 ? "bad" : "good"} />
        <PRStat label="DSAR due 7d" value={snap.dsar_due_7d} tone={snap.dsar_due_7d > 0 ? "warn" : "good"} />
        <PRStat label="Awaiting approval" value={snap.dsar_pending_approval} tone={snap.dsar_pending_approval > 0 ? "warn" : "good"} />
      </div>

      <PRSection title="Privacy Agent" description="Tracks DSAR deadlines, checks consent before marketing or calls, flags privacy risks, prepares response drafts, prepares deletion/export checklists and escalates breach risk. Never deletes, exports or notifies automatically.">
        <p className="text-sm">{snap.recommended_action}</p>
      </PRSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PRStat label="Identity unverified (in-progress)" value={snap.dsar_unverified_in_progress} tone={snap.dsar_unverified_in_progress > 0 ? "warn" : "good"} hint="Block exports/deletions until verified" />
        <PRStat label="Retention rules" value={snap.retention_rules_active} />
        <PRStat label="Processors missing DPA" value={snap.processors_missing_dpa} tone={snap.processors_missing_dpa > 0 ? "warn" : "good"} />
        <PRStat label="High-risk processors" value={snap.processors_high_risk} tone={snap.processors_high_risk > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PRStat label="Open breaches" value={snap.breaches_open} tone={snap.breaches_open > 0 ? "bad" : "good"} />
        <PRStat label="Report required" value={snap.breaches_report_required} tone={snap.breaches_report_required > 0 ? "bad" : "good"} hint="Approval-gated regulator notice" />
        <PRStat label="Critical/high breaches" value={snap.breaches_critical} tone={snap.breaches_critical > 0 ? "bad" : "good"} />
        <PRStat label="Marketing consent unknown" value={snap.consent_unknown_marketing} tone={snap.consent_unknown_marketing > 0 ? "warn" : "good"} hint={`${snap.consent_withdrawn_marketing} withdrawn`} />
      </div>

      <PRSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["DSAR Queue", "/founder/privacy/dsar"],
            ["Retention", "/founder/privacy/retention"],
            ["Consent", "/founder/privacy/consent"],
            ["Processors", "/founder/privacy/processors"],
            ["Breaches", "/founder/privacy/breaches"],
            ["Settings", "/founder/privacy/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </PRSection>
    </PRLayout>
  );
}