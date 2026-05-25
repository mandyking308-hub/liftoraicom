import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AGLayout, AGSection, AGStat, NoRawSecretsBanner } from "./_shared";
import { computeAccessGovSnapshot, type AccessGovSnapshot } from "@/lib/accessGovernanceEngine";

export default function AccessGovernanceOverview() {
  const [snap, setSnap] = useState<AccessGovSnapshot | null>(null);
  useEffect(() => { computeAccessGovSnapshot().then(setSnap); }, []);

  if (!snap) return <AGLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating access estate…</p></AGLayout>;

  return (
    <AGLayout title="Overview" subtitle="Track every system, every secret, every access assignment and every audit event. Configuring, rotating or revoking real secrets is a founder/admin action — this module shows status only, never raw values.">
      <NoRawSecretsBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AGStat label="Systems" value={snap.systems_total} hint={`${snap.systems_active} active`} />
        <AGStat label="Secrets configured" value={`${snap.secrets_configured}/${snap.secrets_configured + snap.secrets_missing}`} tone={snap.secrets_missing > 0 ? "warn" : "good"} />
        <AGStat label="Rotation due now" value={snap.rotation_due_now} tone={snap.rotation_due_now > 0 ? "bad" : "good"} />
        <AGStat label="Critical events 30d" value={snap.recent_critical_events} tone={snap.recent_critical_events > 0 ? "bad" : "good"} />
      </div>

      <AGSection title="Access Governance Agent" description="Monitors access, flags stale secrets, flags revocation needs, prepares rotation checklists, blocks secret leakage into prompts/manuals/logs. Never changes secrets or access automatically.">
        <p className="text-sm">{snap.recommended_action}</p>
      </AGSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AGStat label="High-risk systems" value={snap.high_risk_systems} tone={snap.high_risk_systems > 0 ? "warn" : "good"} />
        <AGStat label="Unknown owner (high-risk)" value={snap.systems_unknown_owner} tone={snap.systems_unknown_owner > 0 ? "bad" : "good"} />
        <AGStat label="Rotation due 30d" value={snap.rotation_due_30d} tone={snap.rotation_due_30d > 0 ? "warn" : "good"} />
        <AGStat label="Never rotated" value={snap.never_rotated} tone={snap.never_rotated > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AGStat label="Active assignments" value={snap.assignments_active} />
        <AGStat label="Access requests" value={snap.assignments_requested} tone={snap.assignments_requested > 0 ? "warn" : "good"} />
        <AGStat label="Expired (still active)" value={snap.assignments_expired} tone={snap.assignments_expired > 0 ? "bad" : "good"} />
        <AGStat label="Audit events 30d" value={snap.audit_events_30d} />
      </div>

      <AGSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Systems", "/founder/access-governance/systems"],
            ["Secrets", "/founder/access-governance/secrets"],
            ["Users", "/founder/access-governance/users"],
            ["Revocation", "/founder/access-governance/revocation"],
            ["Rotation", "/founder/access-governance/rotation"],
            ["Audit", "/founder/access-governance/audit"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </AGSection>
    </AGLayout>
  );
}