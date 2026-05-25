import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DQLayout, DQSection, DQStat, NoAutoDeleteBanner } from "./_shared";
import { computeDataQualitySnapshot, type DataQualitySnapshot, DQ_FINDING_LABEL } from "@/lib/dataQualityEngine";

export default function DataQualityOverview() {
  const [snap, setSnap] = useState<DataQualitySnapshot | null>(null);
  useEffect(() => { computeDataQualitySnapshot().then(setSnap); }, []);

  if (!snap) return <DQLayout title="Overview"><p className="text-xs text-muted-foreground">Loading data quality posture…</p></DQLayout>;

  const scoreTone = snap.quality_score >= 90 ? "good" : snap.quality_score >= 70 ? "warn" : "bad";

  return (
    <DQLayout title="Overview" subtitle="Detects fake/test data, duplicates, stale records, orphan records, invalid amounts, missing IDs and polluted CRM/revenue data. Scans run live. Merges, deletes and bulk changes require founder approval.">
      <NoAutoDeleteBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DQStat label="Data quality score" value={`${snap.quality_score}`} tone={scoreTone} hint="100 = clean" />
        <DQStat label="Open findings" value={snap.open + snap.approval_required} tone={(snap.open + snap.approval_required) > 0 ? "warn" : "good"} hint={`${snap.total_findings} total`} />
        <DQStat label="Critical" value={snap.critical_open} tone={snap.critical_open > 0 ? "bad" : "good"} />
        <DQStat label="Approval required" value={snap.approval_required} tone={snap.approval_required > 0 ? "warn" : "good"} />
      </div>

      <DQSection title="Data Quality Agent" description="Scans daily, flags pollution, recommends cleanup, keeps fake/test data out of KPIs and prepares repair actions. Never deletes, merges or runs bulk changes.">
        <p className="text-sm">{snap.recommended_action}</p>
      </DQSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DQStat label="Duplicates" value={snap.duplicates} tone={snap.duplicates > 0 ? "warn" : "good"} />
        <DQStat label="Test data" value={snap.test_data} tone={snap.test_data > 0 ? "warn" : "good"} hint="kept out of KPIs" />
        <DQStat label="Orphans" value={snap.orphans} tone={snap.orphans > 0 ? "warn" : "good"} />
        <DQStat label="Stale" value={snap.stale} tone={snap.stale > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DQStat label="Revenue integrity" value={snap.revenue_integrity} tone={snap.revenue_integrity > 0 ? "bad" : "good"} hint="confirmed w/o payment" />
        <DQStat label="Repair queue" value={snap.repair_actions_pending} tone={snap.repair_actions_pending > 0 ? "warn" : "good"} />
        <DQStat label="Irreversible pending" value={snap.repair_irreversible_pending} tone={snap.repair_irreversible_pending > 0 ? "bad" : "good"} hint="founder gate" />
        <DQStat label="Fixed" value={snap.fixed} tone="good" />
      </div>

      <DQSection title="Findings by type">
        {Object.keys(snap.by_type).length === 0 ? (
          <p className="text-xs text-muted-foreground">No findings yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(snap.by_type).map(([t, n]) => (
              <span key={t} className="px-2 py-1 rounded border border-border/50">
                {DQ_FINDING_LABEL[t] ?? t} · <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
        )}
      </DQSection>

      <DQSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Duplicates", "/founder/data-quality/duplicates"],
            ["Test data", "/founder/data-quality/test-data"],
            ["Orphans", "/founder/data-quality/orphans"],
            ["Stale", "/founder/data-quality/stale"],
            ["Revenue integrity", "/founder/data-quality/revenue-integrity"],
            ["Repair queue", "/founder/data-quality/repair-queue"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </DQSection>
    </DQLayout>
  );
}