import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RALayout, RASection, RAStat, TypeBadge, ProgressBar, fmt } from "./_shared";
import {
  fetchPlans, fetchItems, fetchActuals, fetchPriorityInputs,
  diagnoseAllocation, summarize,
  type AllocationPlan, type AllocationItem, type UsageActual, type PriorityInput, type AllocationType,
  TYPE_META,
} from "@/lib/resourceAllocationEngine";

export default function RAOverview() {
  const [plans, setPlans] = useState<AllocationPlan[]>([]);
  const [items, setItems] = useState<AllocationItem[]>([]);
  const [actuals, setActuals] = useState<UsageActual[]>([]);
  const [pri, setPri] = useState<PriorityInput[]>([]);
  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => {});
    fetchItems().then(setItems).catch(() => {});
    fetchActuals().then(setActuals).catch(() => {});
    fetchPriorityInputs().then(setPri).catch(() => {});
  }, []);
  const sum = summarize(plans, items, actuals);
  const warns = diagnoseAllocation(items, plans, pri, actuals);
  return (
    <RALayout title="Resource Allocation"
      subtitle="Decides where AI budget, human time, founder attention, sales effort, build effort and cash should go across every business. Recommendations are live; committing spend, assigning external humans or pausing businesses requires approval.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <RAStat label="Active plans" value={sum.plans} />
        <RAStat label="Pending review" value={sum.plans_pending_review} hint="Founder approval" />
        <RAStat label="Allocation items" value={sum.items} />
        <RAStat label="Recommended" value={sum.items_recommended} />
        <RAStat label="Active" value={sum.items_active} />
      </div>

      <RASection title="Allocation vs actual" description="Per resource type, across all businesses">
        {Object.keys(sum.totals_by_type).length === 0 ? (
          <p className="text-xs text-muted-foreground">No plans yet. Create a plan from Recommendations.</p>
        ) : (
          <div className="space-y-3">
            {(Object.entries(sum.totals_by_type) as Array<[AllocationType, { available: number; allocated: number; used: number }]>).map(([t, v]) => (
              <div key={t} className="border border-border/50 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={t} />
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Allocated <span className="text-foreground">{fmt(v.allocated, TYPE_META[t].unit)}</span> · Used <span className="text-foreground">{fmt(v.used, TYPE_META[t].unit)}</span> · Available <span className="text-foreground">{fmt(v.available, TYPE_META[t].unit)}</span>
                  </span>
                </div>
                <ProgressBar value={v.used} max={Math.max(v.allocated, v.available, 1)} />
              </div>
            ))}
          </div>
        )}
      </RASection>

      <RASection title="Warnings" description="Resource Allocation Agent diagnostics">
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={w.severity === "block" ? "text-destructive" : "text-yellow-300"}>•</span>
                <span className="font-mono text-muted-foreground">{w.business_id.slice(0,8)}</span>
                <TypeBadge type={w.allocation_type} />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </RASection>

      <RASection title="Plans" actions={<Link to="/founder/resource-allocation/recommendations" className="text-xs text-primary hover:underline">Recommendations →</Link>}>
        {plans.length === 0 ? <p className="text-xs text-muted-foreground">No plans yet.</p> : (
          <div className="space-y-2 text-xs">
            {plans.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center gap-2 border border-border/50 rounded p-2 flex-wrap">
                <TypeBadge type={p.allocation_type} />
                <span className="text-muted-foreground">{p.allocation_period_start} → {p.allocation_period_end}</span>
                <span className="ml-auto">{fmt(Number(p.total_available), p.unit)}</span>
                <span className="text-[10px] text-muted-foreground">{p.plan_status}</span>
              </div>
            ))}
          </div>
        )}
      </RASection>
    </RALayout>
  );
}