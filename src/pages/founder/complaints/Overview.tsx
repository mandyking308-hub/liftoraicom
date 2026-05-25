import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CMPLayout, CMPSection, CMPStat } from "./_shared";
import { computeComplaintsSnapshot, type ComplaintsSnapshot } from "@/lib/complaintsEngine";

export default function ComplaintsOverview() {
  const [snap, setSnap] = useState<ComplaintsSnapshot | null>(null);
  useEffect(() => { computeComplaintsSnapshot().then(setSnap); }, []);

  if (!snap) return <CMPLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating complaints load…</p></CMPLayout>;

  return (
    <CMPLayout title="Overview" subtitle="Track complaints, refund requests, disputes, chargebacks and dissatisfaction separately from normal support. All refunds, credits, legal responses and customer messages require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CMPStat label="Open cases" value={snap.total_open} />
        <CMPStat label="Critical" value={snap.critical} tone={snap.critical > 0 ? "bad" : "good"} />
        <CMPStat label="Escalated" value={snap.escalated} tone={snap.escalated > 0 ? "bad" : "good"} />
        <CMPStat label="Legal / disputes" value={snap.legal_or_dispute} tone={snap.legal_or_dispute > 0 ? "bad" : "good"} />
      </div>

      <CMPSection title="Complaints Agent" description="Detects complaints, prepares case summary, gathers evidence, checks policy, drafts response, recommends resolution, escalates legal/compliance risk.">
        <p className="text-sm">{snap.recommended_action}</p>
      </CMPSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CMPStat label="Refunds pending approval" value={snap.refunds_pending_approval} tone={snap.refunds_pending_approval > 0 ? "warn" : "good"} hint={`£${snap.refunds_pending_amount.toFixed(2)} requested`} />
        <CMPStat label="Refunds processed today" value={snap.refunds_processed_today} />
        <CMPStat label="Awaiting draft" value={snap.awaiting_response_draft} tone={snap.awaiting_response_draft > 0 ? "warn" : "good"} />
        <CMPStat label="Awaiting customer info" value={snap.awaiting_customer_info} />
      </div>

      <CMPSection title="Safety rules" description="Hard-wired into the Complaints, Refunds + Disputes Engine.">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Refunds are never processed automatically — every refund creates an approval item.</li>
          <li>No customer-facing message, refund, credit or legal/compliance response is sent without founder approval.</li>
          <li>Never make a legal admission without explicit approval.</li>
          <li>Customer satisfaction is tracked after resolution to detect repeat issues.</li>
        </ul>
      </CMPSection>

      <CMPSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Refund queue", "/founder/complaints/refunds"],
            ["Disputes", "/founder/complaints/disputes"],
            ["Escalations", "/founder/complaints/escalations"],
            ["Evidence pack", "/founder/complaints/evidence"],
            ["Settings", "/founder/complaints/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </CMPSection>
    </CMPLayout>
  );
}