import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KGLayout, KGSection, KGStat, NoUntrustedOverrideBanner } from "./_shared";
import { computeKnowledgeSnapshot, type KnowledgeSnapshot, SOURCE_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

export default function KnowledgeOverview() {
  const [snap, setSnap] = useState<KnowledgeSnapshot | null>(null);
  useEffect(() => { computeKnowledgeSnapshot().then(setSnap); }, []);

  if (!snap) return <KGLayout title="Overview"><p className="text-xs text-muted-foreground">Loading knowledge posture…</p></KGLayout>;

  const scoreTone = snap.completeness_score >= 80 ? "good" : snap.completeness_score >= 50 ? "warn" : "bad";

  return (
    <KGLayout title="Overview" subtitle="Tracks every knowledge source — manuals, pricing, policies, founder notes, transcripts, websites and uploads. Tells you what is trusted, what is stale, what is conflicting and what is safe to use in sales, voice and support.">
      <NoUntrustedOverrideBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KGStat label="Completeness" value={`${snap.completeness_score}`} tone={scoreTone} hint="100 = aligned" />
        <KGStat label="Active sources" value={snap.active_sources} hint={`${snap.total_sources} total`} />
        <KGStat label="Founder-approved" value={snap.founder_approved_sources} tone="good" />
        <KGStat label="Untrusted active" value={snap.untrusted_sources} tone={snap.untrusted_sources > 0 ? "warn" : "good"} />
      </div>

      <KGSection title="Knowledge Governance Agent" description="Finds stale and conflicting sources, prepares conflict summaries, recommends the truth source, prevents untrusted content overriding policy and keeps manuals aligned. Never edits approved claims, pricing, legal or policy without founder approval.">
        <p className="text-sm">{snap.recommended_action}</p>
      </KGSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KGStat label="Stale sources" value={snap.stale_sources} tone={snap.stale_sources > 0 ? "warn" : "good"} hint="90d unverified" />
        <KGStat label="Expired sources" value={snap.expired_sources} tone={snap.expired_sources > 0 ? "bad" : "good"} />
        <KGStat label="Open conflicts" value={snap.conflicts_open + snap.conflicts_founder_review} tone={(snap.conflicts_open + snap.conflicts_founder_review) > 0 ? "warn" : "good"} hint={`${snap.conflicts_founder_review} need founder review`} />
        <KGStat label="Approved claims" value={snap.claims_founder_approved} tone="good" hint={`${snap.claims_draft} drafts`} />
      </div>

      <KGSection title="Sources by type">
        {Object.keys(snap.by_type).length === 0 ? (
          <p className="text-xs text-muted-foreground">No sources catalogued yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(snap.by_type).map(([t, n]) => (
              <span key={t} className="px-2 py-1 rounded border border-border/50">
                {SOURCE_TYPE_LABEL[t] ?? t} · <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
        )}
      </KGSection>

      <KGSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Source library", "/founder/knowledge-governance/sources"],
            ["Conflicts", "/founder/knowledge-governance/conflicts"],
            ["Stale", "/founder/knowledge-governance/stale"],
            ["Approved claims", "/founder/knowledge-governance/approved-claims"],
            ["Manual sync", "/founder/knowledge-governance/manual-sync"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </KGSection>
    </KGLayout>
  );
}