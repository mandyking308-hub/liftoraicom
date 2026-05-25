import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLayout, COSection, COStat } from "./_shared";
import { computeOnboardingSnapshot, type OnboardingSnapshot } from "@/lib/customerOnboarding";

export default function CustomerOnboardingOverview() {
  const [snap, setSnap] = useState<OnboardingSnapshot | null>(null);
  useEffect(() => { computeOnboardingSnapshot().then(setSnap); }, []);

  if (!snap) return <COLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating onboarding…</p></COLayout>;

  return (
    <COLayout title="Overview" subtitle="Move every new customer through onboarding cleanly. Internal planning runs live; welcome packs, portal invites, and external shares stay approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <COStat label="In progress" value={snap.in_progress} />
        <COStat label="Waiting on customer" value={snap.waiting_customer} tone={snap.waiting_customer > 0 ? "warn" : "good"} />
        <COStat label="Blocked" value={snap.blocked} tone={snap.blocked > 0 ? "bad" : "good"} />
        <COStat label="Complete" value={snap.complete} tone="good" />
      </div>

      <COSection title="Onboarding Agent" description="Prepares welcome packs, lists missing info, drafts chase messages, escalates stuck onboarding, hands off to support after completion.">
        <p className="text-sm">{snap.recommended_action}</p>
      </COSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <COStat label="Welcome packs to approve" value={snap.welcome_packs_pending_send} tone={snap.welcome_packs_pending_send > 0 ? "warn" : "good"} hint="prepared, awaiting founder" />
        <COStat label="Portal invites to approve" value={snap.portal_invites_pending_send} tone={snap.portal_invites_pending_send > 0 ? "warn" : "good"} />
        <COStat label="Customers missing info" value={snap.customers_missing_info} tone={snap.customers_missing_info > 0 ? "warn" : "good"} />
        <COStat label="Overdue checklist items" value={snap.overdue} tone={snap.overdue > 0 ? "warn" : "good"} />
      </div>

      <COSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Customers", "/founder/customer-onboarding/customers"],
            ["Checklists", "/founder/customer-onboarding/checklists"],
            ["Missing info", "/founder/customer-onboarding/missing-info"],
            ["Welcome packs", "/founder/customer-onboarding/welcome-packs"],
            ["Settings", "/founder/customer-onboarding/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </COSection>
    </COLayout>
  );
}