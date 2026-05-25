import { useEffect, useState } from "react";
import { RALayout, RASection, RAStat } from "./_shared";
import { computeRevenueLoop, type RevenueLoopSnapshot } from "@/lib/revenueAutopilot";

export default function RevenueAutopilotGaps() {
  const [snap, setSnap] = useState<RevenueLoopSnapshot | null>(null);
  useEffect(() => { computeRevenueLoop().then(setSnap); }, []);
  if (!snap) return <RALayout title="Gaps"><p className="text-xs text-muted-foreground">Loading…</p></RALayout>;

  const pacePct = snap.revenue_target > 0 ? Math.round((snap.actual_revenue / snap.revenue_target) * 100) : 0;

  return (
    <RALayout title="Gaps" subtitle="Where revenue is stuck right now.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RAStat label="Pace" value={`${pacePct}%`} tone={pacePct >= 80 ? "good" : pacePct >= 50 ? "warn" : "bad"} hint="actual / target" />
        <RAStat label="Gap" value={`$${Math.round(snap.gap).toLocaleString()}`} tone={snap.gap > 0 ? "warn" : "good"} />
        <RAStat label="Pipeline coverage" value={snap.gap > 0 ? `${Math.round((snap.pipeline_estimated / snap.gap) * 100)}%` : "∞"} hint="weighted pipeline / gap" />
        <RAStat label="Blockers (approval)" value={snap.approvals_blocking} tone={snap.approvals_blocking > 0 ? "bad" : "good"} />
      </div>
      <RASection title="Bottlenecks">
        <ul className="text-xs space-y-1">
          {snap.revenue_target === 0 && <li>• No active revenue target — Revenue Manager Agent cannot reverse-engineer activity.</li>}
          {snap.approvals_blocking > 0 && <li>• {snap.approvals_blocking} close action(s) waiting on founder approval.</li>}
          {snap.overdue_follow_ups > 0 && <li>• {snap.overdue_follow_ups} overdue follow-up(s).</li>}
          {snap.hot_leads === 0 && snap.gap > 0 && <li>• Gap exists with no hot leads — lead generation needs attention.</li>}
          {snap.pipeline_estimated < snap.gap && snap.gap > 0 && <li>• Pipeline (weighted) is below the gap — more qualified leads required.</li>}
        </ul>
      </RASection>
    </RALayout>
  );
}