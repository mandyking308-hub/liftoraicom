import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RPLayout, RPSection, RPStat, NoExternalSharingBanner } from "./_shared";
import { computeReportingSnapshot, fmtMoney, type ReportingSnapshot } from "@/lib/founderReportingEngine";

export default function ReportsOverview() {
  const [snap, setSnap] = useState<ReportingSnapshot | null>(null);
  useEffect(() => { computeReportingSnapshot().then(setSnap); }, []);

  if (!snap) return <RPLayout title="Overview"><p className="text-xs text-muted-foreground">Compiling operating snapshot…</p></RPLayout>;

  return (
    <RPLayout title="Overview" subtitle="A founder-readable operating snapshot across all ventures. Pulls revenue, AI spend & ROI, approvals, alerts, delivery, support, incidents, privacy/security and vendor costs. Internal drafting is live; sharing externally is approval-gated.">
      <NoExternalSharingBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RPStat label="Confirmed revenue 7d" value={fmtMoney(snap.confirmed_revenue_7d)} tone="good" />
        <RPStat label="Confirmed revenue 30d" value={fmtMoney(snap.confirmed_revenue_30d)} tone="good" />
        <RPStat label="Estimated revenue 30d" value={fmtMoney(snap.estimated_revenue_30d)} />
        <RPStat label="Vendor monthly cost" value={fmtMoney(snap.vendor_monthly_cost)} />
      </div>

      <RPSection title="Founder Reporting Agent" description="Generates draft daily / weekly / monthly / portfolio reports, flags missing data, identifies top decisions, summarises risks and recommends weekly priorities. Never shares externally without approval.">
        <p className="text-sm">{snap.recommended_action}</p>
      </RPSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RPStat label="AI spend 7d (GBP)" value={fmtMoney(snap.ai_spend_7d)} />
        <RPStat label="AI spend 30d (GBP)" value={fmtMoney(snap.ai_spend_30d)} />
        <RPStat label="AI ROI 7d" value={`${snap.ai_roi_7d.toFixed(2)}×`} tone={snap.ai_roi_7d >= 3 ? "good" : snap.ai_roi_7d >= 1 ? "default" : "warn"} hint="revenue-linked ÷ spend" />
        <RPStat label="Approvals pending" value={snap.approvals_pending} tone={snap.approvals_pending > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RPStat label="Incidents open" value={snap.incidents_open} tone={snap.incidents_open > 0 ? "warn" : "good"} />
        <RPStat label="Critical incidents" value={snap.incidents_critical} tone={snap.incidents_critical > 0 ? "bad" : "good"} />
        <RPStat label="Breaches open" value={snap.breaches_open} tone={snap.breaches_open > 0 ? "bad" : "good"} />
        <RPStat label="DSAR overdue" value={snap.dsar_overdue} tone={snap.dsar_overdue > 0 ? "bad" : "good"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RPStat label="Reports total" value={snap.reports_total} />
        <RPStat label="Drafts" value={snap.reports_draft} tone={snap.reports_draft > 0 ? "warn" : "good"} />
        <RPStat label="Review required" value={snap.reports_review_required} tone={snap.reports_review_required > 0 ? "warn" : "good"} />
        <RPStat label="Decisions flagged" value={snap.decisions_open} tone={snap.decisions_open > 0 ? "warn" : "good"} />
      </div>

      <RPSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Weekly", "/founder/reports/weekly"],
            ["Monthly", "/founder/reports/monthly"],
            ["Portfolio", "/founder/reports/portfolio"],
            ["Decisions Needed", "/founder/reports/decisions"],
            ["Archive", "/founder/reports/archive"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:bg-secondary">{l}</Link>
          ))}
        </div>
      </RPSection>
    </RPLayout>
  );
}