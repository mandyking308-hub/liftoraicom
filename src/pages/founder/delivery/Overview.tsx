import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DLLayout, DLSection, DLStat } from "./_shared";
import { computeDeliverySnapshot, type DeliverySnapshot } from "@/lib/deliveryEngine";

export default function DeliveryOverview() {
  const [snap, setSnap] = useState<DeliverySnapshot | null>(null);
  useEffect(() => { computeDeliverySnapshot().then(setSnap); }, []);

  if (!snap) return <DLLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating delivery loop…</p></DLLayout>;

  return (
    <DLLayout title="Overview" subtitle="What must be delivered, by when, by whom, and whether delivery is blocked. Internal planning runs live; customer-facing sends stay approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DLStat label="Active orders" value={snap.active_orders} />
        <DLStat label="Blocked orders" value={snap.blocked_orders} tone={snap.blocked_orders > 0 ? "bad" : "good"} />
        <DLStat label="Overdue" value={snap.overdue_orders} tone={snap.overdue_orders > 0 ? "warn" : "good"} />
        <DLStat label="Open tasks" value={snap.open_tasks} />
      </div>

      <DLSection title="Delivery Agent" description="Internal fulfilment plan, blockers, capacity and next task recommendation. Never externally messages without approval.">
        <p className="text-sm">{snap.recommended_action}</p>
      </DLSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DLStat label="Blocked tasks" value={snap.blocked_tasks} tone={snap.blocked_tasks > 0 ? "bad" : "good"} />
        <DLStat label="Approval-required tasks" value={snap.approval_required_tasks} tone={snap.approval_required_tasks > 0 ? "warn" : "good"} />
        <DLStat label="Capacity at risk" value={snap.capacity_at_risk} tone={snap.capacity_at_risk > 0 ? "warn" : "good"} />
        <DLStat label="Total orders" value={snap.total_orders} />
      </div>

      <DLSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Orders pipeline", "/founder/delivery/orders"],
            ["Task board", "/founder/delivery/tasks"],
            ["Capacity board", "/founder/delivery/capacity"],
            ["Blockers", "/founder/delivery/blockers"],
            ["Completion proof", "/founder/delivery/completion-proof"],
            ["Settings", "/founder/delivery/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </DLSection>
    </DLLayout>
  );
}