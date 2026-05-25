import { useEffect, useState } from "react";
import { CapLayout, CapSection, CapStat, NoAutoPauseBanner } from "./_shared";
import { computeCapacitySnapshot, type CapacitySnapshot } from "@/lib/capacityEngine";

export default function CapacityForecast() {
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null);
  useEffect(() => { computeCapacitySnapshot().then(setSnap); }, []);

  const projected = snap ? Math.round(snap.capacity_utilisation * 100 * 1.2) : 0;
  const headroom = snap ? Math.max(0, snap.human_hours_capacity - snap.human_hours_committed) : 0;

  return (
    <CapLayout title="Capacity forecast" subtitle="Forward look at workload, capacity utilisation and likely bottlenecks.">
      <NoAutoPauseBanner />
      {!snap ? <p className="text-sm text-muted-foreground">Loading forecast…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CapStat label="Current utilisation" value={`${Math.round(snap.capacity_utilisation * 100)}%`} tone={snap.capacity_utilisation >= 1 ? "bad" : snap.capacity_utilisation >= 0.85 ? "warn" : "good"} />
            <CapStat label="Projected (+20%)" value={`${projected}%`} tone={projected >= 100 ? "bad" : projected >= 85 ? "warn" : "good"} />
            <CapStat label="Human headroom" value={`${headroom.toFixed(1)} h`} tone={headroom <= 0 ? "bad" : headroom < 10 ? "warn" : "good"} />
            <CapStat label="AI headroom" value={Math.max(0, snap.ai_actions_capacity - snap.ai_actions_committed)} />
          </div>

          <CapSection title="Capacity Agent forward recommendations">
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>{snap.recommended_action}</li>
              {snap.capacity_utilisation >= 0.85 && <li>Consider slowing inbound sales or adding human capacity before utilisation passes 100%.</li>}
              {snap.workload_blocked > 0 && <li>{snap.workload_blocked} blocked workload item(s) — clearing blockers will free downstream capacity.</li>}
              {snap.bottlenecks_open > 0 && <li>{snap.bottlenecks_open} open bottleneck(s) — resolve before scaling sales.</li>}
              {snap.over > 0 && <li>Pausing sales requires founder approval. Draft notice prepared by agent in Approval Queue.</li>}
            </ul>
          </CapSection>
        </>
      )}
    </CapLayout>
  );
}