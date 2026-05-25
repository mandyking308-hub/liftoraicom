import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { INCLayout, INCSection, INCStat, NoAutoNoticesBanner } from "./_shared";
import { computeIncidentSnapshot, type IncidentSnapshot } from "@/lib/incidentEngine";

export default function IncidentsOverview() {
  const [snap, setSnap] = useState<IncidentSnapshot | null>(null);
  useEffect(() => { computeIncidentSnapshot().then(setSnap); }, []);

  if (!snap) return <INCLayout title="Overview"><p className="text-xs text-muted-foreground">Loading incident posture…</p></INCLayout>;

  return (
    <INCLayout title="Overview" subtitle="Tracks outages, AI failures, data incidents, customer-impacting bugs, provider failures and recovery plans. Internal logging and triage are live. Customer / regulator notices, public statements and payment-provider mutations require founder approval.">
      <NoAutoNoticesBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <INCStat label="Live incidents" value={snap.live_open} tone={snap.live_open > 0 ? "warn" : "good"} hint={`${snap.total} total`} />
        <INCStat label="Critical open" value={snap.critical_open} tone={snap.critical_open > 0 ? "bad" : "good"} />
        <INCStat label="High open" value={snap.high_open} tone={snap.high_open > 0 ? "warn" : "good"} />
        <INCStat label="Awaiting customer notice" value={snap.awaiting_customer_notice} tone={snap.awaiting_customer_notice > 0 ? "warn" : "good"} hint="Approval-gated" />
      </div>

      <INCSection title="Incident Agent" description="Detects incidents, creates the record, drafts internal/customer/provider response, flags customer impact, recommends a workaround, writes postmortem drafts and tracks corrective actions. Never sends external notices.">
        <p className="text-sm">{snap.recommended_action}</p>
      </INCSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <INCStat label="Awaiting regulator notice" value={snap.awaiting_regulator_notice} tone={snap.awaiting_regulator_notice > 0 ? "bad" : "good"} />
        <INCStat label="Resolved without postmortem" value={snap.resolved_no_postmortem} tone={snap.resolved_no_postmortem > 0 ? "warn" : "good"} />
        <INCStat label="Postmortems open" value={snap.postmortems_open} tone={snap.postmortems_open > 0 ? "warn" : "good"} />
        <INCStat label="Continuity plans active" value={snap.continuity_plans_active} hint={`${snap.continuity_plans_untested} untested 90d`} tone={snap.continuity_plans_untested > 0 ? "warn" : "good"} />
      </div>

      <INCSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Live Board", "/founder/incidents/live"],
            ["Postmortems", "/founder/incidents/postmortems"],
            ["Continuity Plans", "/founder/incidents/continuity"],
            ["Notification Drafts", "/founder/incidents/notifications"],
            ["Settings", "/founder/incidents/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </INCSection>
    </INCLayout>
  );
}