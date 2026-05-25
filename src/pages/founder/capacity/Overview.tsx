import { useEffect, useState } from "react";
import { CapLayout, CapSection, CapStat, NoAutoPauseBanner } from "./_shared";
import { computeCapacitySnapshot, type CapacitySnapshot } from "@/lib/capacityEngine";

export default function CapacityOverview() {
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null);
  useEffect(() => { computeCapacitySnapshot().then(setSnap); }, []);

  return (
    <CapLayout title="Capacity Overview" subtitle="Compare pipeline demand against delivery, support, AI and human capacity.">
      <NoAutoPauseBanner />
      {!snap ? <p className="text-sm text-muted-foreground">Loading capacity snapshot…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CapStat label="Capacity plans" value={snap.plans} hint={`${snap.available} available · ${snap.watch} watch`} />
            <CapStat label="Full / over" value={snap.full + snap.over} tone={snap.over > 0 ? "bad" : snap.full > 0 ? "warn" : "good"} hint={`${snap.over} over capacity`} />
            <CapStat label="Workload active" value={snap.workload_active} hint={`${snap.workload_pending} pending · ${snap.workload_blocked} blocked`} />
            <CapStat label="Overdue" value={snap.workload_overdue} tone={snap.workload_overdue > 0 ? "warn" : "good"} />
            <CapStat label="Human utilisation" value={`${Math.round(snap.capacity_utilisation * 100)}%`} tone={snap.capacity_utilisation >= 1 ? "bad" : snap.capacity_utilisation >= 0.85 ? "warn" : "good"} hint={`${snap.human_hours_committed.toFixed(1)} / ${snap.human_hours_capacity.toFixed(1)} h`} />
            <CapStat label="AI actions" value={snap.ai_actions_committed} hint={`cap ${snap.ai_actions_capacity}`} />
            <CapStat label="Bottlenecks open" value={snap.bottlenecks_open} tone={snap.bottlenecks_critical > 0 ? "bad" : snap.bottlenecks_open > 0 ? "warn" : "good"} />
            <CapStat label="Critical" value={snap.bottlenecks_critical} tone={snap.bottlenecks_critical > 0 ? "bad" : "good"} />
          </div>

          <CapSection title="Capacity Agent recommendation" description="Updated live from plans, workload and bottleneck signals.">
            <p className="text-sm">{snap.recommended_action}</p>
          </CapSection>

          <CapSection title="Workload by assignee">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(snap.by_assignee_type).length === 0 && (
                <p className="text-muted-foreground col-span-full">No active workload items yet.</p>
              )}
              {Object.entries(snap.by_assignee_type).map(([k, v]) => (
                <div key={k} className="rounded border border-border/40 p-2 flex items-center justify-between">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </CapSection>

          <CapSection title="Bottlenecks by type">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(snap.bottlenecks_by_type).length === 0 && (
                <p className="text-muted-foreground col-span-full">No open bottlenecks.</p>
              )}
              {Object.entries(snap.bottlenecks_by_type).map(([k, v]) => (
                <div key={k} className="rounded border border-border/40 p-2 flex items-center justify-between">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </CapSection>
        </>
      )}
    </CapLayout>
  );
}