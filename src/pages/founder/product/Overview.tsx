import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRODLayout, PRODSection, PRODStat, NoAutoDeployBanner } from "./_shared";
import { computeProductSnapshot, type ProductSnapshot } from "@/lib/productEngine";

export default function ProductOverview() {
  const [snap, setSnap] = useState<ProductSnapshot | null>(null);
  useEffect(() => { computeProductSnapshot().then(setSnap); }, []);

  if (!snap) return <PRODLayout title="Overview"><p className="text-xs text-muted-foreground">Loading product posture…</p></PRODLayout>;

  return (
    <PRODLayout title="Overview" subtitle="Tracks features, bugs, QA, releases, rollback plans and user impact across Liftor and every venture. Internal planning, QA tracking and release notes run live. Production deploys, customer messages and external announcements require founder approval.">
      <NoAutoDeployBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PRODStat label="Features in build" value={snap.features_in_build} tone={snap.features_in_build > 0 ? "warn" : "good"} hint={`${snap.features_total} total`} />
        <PRODStat label="Features ready" value={snap.features_ready} tone={snap.features_ready > 0 ? "good" : "default"} hint="bundle into release" />
        <PRODStat label="Bugs open" value={snap.bugs_open} tone={snap.bugs_open > 0 ? "warn" : "good"} />
        <PRODStat label="Critical bugs" value={snap.bugs_critical_open} tone={snap.bugs_critical_open > 0 ? "bad" : "good"} />
      </div>

      <PRODSection title="Product QA Agent" description="Triages bugs, suggests features, prepares QA checklists, drafts release notes, flags release risk and recommends rollback. Never deploys, never sends announcements.">
        <p className="text-sm">{snap.recommended_action}</p>
      </PRODSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PRODStat label="Releases awaiting approval" value={snap.releases_awaiting_approval} tone={snap.releases_awaiting_approval > 0 ? "warn" : "good"} hint="Founder approval required" />
        <PRODStat label="QA failing" value={snap.qa_failed} tone={snap.qa_failed > 0 ? "bad" : "good"} />
        <PRODStat label="QA blocked" value={snap.qa_blocked} tone={snap.qa_blocked > 0 ? "warn" : "good"} />
        <PRODStat label="Releases rolled back" value={snap.releases_rolled_back} tone={snap.releases_rolled_back > 0 ? "bad" : "good"} />
      </div>

      <PRODSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Feature roadmap", "/founder/product/features"],
            ["Bug board", "/founder/product/bugs"],
            ["QA checklists", "/founder/product/qa"],
            ["Release dashboard", "/founder/product/releases"],
            ["Rollback plans", "/founder/product/rollback"],
            ["Known issues", "/founder/product/known-issues"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </PRODSection>
    </PRODLayout>
  );
}