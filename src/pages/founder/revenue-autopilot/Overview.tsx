import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection, RAStat } from "./_shared";
import { computeRevenueLoop, type RevenueLoopSnapshot } from "@/lib/revenueAutopilot";

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function RevenueAutopilotOverview() {
  const [snap, setSnap] = useState<RevenueLoopSnapshot | null>(null);
  useEffect(() => { computeRevenueLoop().then(setSnap); }, []);

  if (!snap) return <RALayout title="Overview"><p className="text-xs text-muted-foreground">Calculating revenue loop…</p></RALayout>;

  const paceTone = snap.revenue_target === 0 ? "warn" : snap.gap === 0 ? "good" : snap.actual_revenue / snap.revenue_target >= 0.8 ? "warn" : "bad";

  return (
    <RALayout title="Overview" subtitle="One daily loop across sales, targets, upgrades, CRM, outreach, success and finance. Internal preparation runs live; external action stays approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RAStat label="Revenue target" value={`$${Math.round(snap.revenue_target).toLocaleString()}`} hint="active monthly targets" />
        <RAStat label="Confirmed revenue" value={`$${Math.round(snap.actual_revenue).toLocaleString()}`} tone="good" hint="verified payment/contract" />
        <RAStat label="Pipeline (estimated)" value={`$${Math.round(snap.pipeline_estimated).toLocaleString()}`} hint="probability-weighted, advisory" />
        <RAStat label="Gap to target" value={`$${Math.round(snap.gap).toLocaleString()}`} tone={paceTone as any} />
      </div>

      <RASection title="Revenue Manager Agent" description="Top revenue action right now.">
        <p className="text-sm">{snap.recommended_action}</p>
      </RASection>

      <RASection title="Top 5 actions today" description="Coordinated across Sales Manager, Voice Sales, Upgrade, Proposal, Follow-Up, Customer Success and Finance agents.">
        {snap.top_actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loop is clean — no critical revenue actions queued.</p>
        ) : (
          <ol className="space-y-2">
            {snap.top_actions.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-xs border-b border-border/40 pb-2">
                <div>
                  <p className="font-medium">{i + 1}. {a.title}</p>
                  <p className="text-muted-foreground">{a.agent} · {a.reason}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${priorityTone[a.priority] || ""}`}>{a.priority}</Badge>
              </li>
            ))}
          </ol>
        )}
      </RASection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RAStat label="Hot leads" value={snap.hot_leads} tone={snap.hot_leads > 0 ? "warn" : "good"} hint=">=70% close probability" />
        <RAStat label="Overdue follow-ups" value={snap.overdue_follow_ups} tone={snap.overdue_follow_ups > 0 ? "warn" : "good"} />
        <RAStat label="Upgrade opportunities" value={snap.upgrade_opportunities} tone={snap.upgrade_opportunities > 0 ? "warn" : "good"} />
        <RAStat label="Approvals blocking revenue" value={snap.approvals_blocking} tone={snap.approvals_blocking > 0 ? "bad" : "good"} hint="external send locked" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RAStat label="Proposals to prepare" value={snap.proposals_needed} />
        <RAStat label="Calls to prepare" value={snap.calls_to_prepare} />
        <RAStat label="Open tasks" value={snap.open_tasks} />
        <RAStat label="Critical tasks" value={snap.critical_tasks} tone={snap.critical_tasks > 0 ? "bad" : "good"} />
      </div>

      <RASection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Today's loop", "/founder/revenue-autopilot/today"],
            ["Targets", "/founder/revenue-autopilot/targets"],
            ["Tasks queue", "/founder/revenue-autopilot/tasks"],
            ["Gaps", "/founder/revenue-autopilot/gaps"],
            ["Approvals", "/founder/revenue-autopilot/approvals"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </RASection>
    </RALayout>
  );
}