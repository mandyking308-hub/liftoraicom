import { useEffect, useMemo, useState } from "react";
import { RALayout, RASection, RAStat, TypeBadge, ProgressBar, fmt } from "./_shared";
import {
  fetchPlans, fetchItems, fetchActuals,
  type AllocationPlan, type AllocationItem, type UsageActual, type AllocationType,
  TYPE_META,
} from "@/lib/resourceAllocationEngine";

export function TypePage({ type, title, subtitle }: { type: AllocationType; title: string; subtitle: string }) {
  const [plans, setPlans] = useState<AllocationPlan[]>([]);
  const [items, setItems] = useState<AllocationItem[]>([]);
  const [actuals, setActuals] = useState<UsageActual[]>([]);

  useEffect(() => {
    fetchPlans(type).then(setPlans).catch(() => {});
    fetchActuals(type).then(setActuals).catch(() => {});
  }, [type]);

  useEffect(() => {
    if (plans.length === 0) { setItems([]); return; }
    Promise.all(plans.map(p => fetchItems(p.id)))
      .then(arr => setItems(arr.flat()))
      .catch(() => setItems([]));
  }, [plans]);

  const totals = useMemo(() => {
    const available = plans.filter(p => p.plan_status === "active" || p.plan_status === "approved")
      .reduce((a, p) => a + Number(p.total_available), 0);
    const allocated = items.reduce((a, it) => a + Number(it.allocated_amount), 0);
    const used = actuals.reduce((a, x) => a + Number(x.actual_used), 0);
    return { available, allocated, used };
  }, [plans, items, actuals]);

  const unit = TYPE_META[type].unit;

  const byBusiness = useMemo(() => {
    const map = new Map<string, { allocated: number; used: number }>();
    for (const it of items) {
      const e = map.get(it.business_id) ?? { allocated: 0, used: 0 };
      e.allocated += Number(it.allocated_amount);
      map.set(it.business_id, e);
    }
    for (const a of actuals) {
      const e = map.get(a.business_id) ?? { allocated: 0, used: 0 };
      e.used += Number(a.actual_used);
      map.set(a.business_id, e);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].allocated - a[1].allocated);
  }, [items, actuals]);

  return (
    <RALayout title={title} subtitle={subtitle} actions={<TypeBadge type={type} />}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RAStat label="Available" value={fmt(totals.available, unit)} />
        <RAStat label="Allocated" value={fmt(totals.allocated, unit)} />
        <RAStat label="Used" value={fmt(totals.used, unit)} />
        <RAStat label="Businesses" value={byBusiness.length} />
      </div>

      <RASection title="By business" description="Allocation vs actual usage">
        {byBusiness.length === 0 ? (
          <p className="text-xs text-muted-foreground">No allocations yet for {TYPE_META[type].label}.</p>
        ) : (
          <div className="space-y-3">
            {byBusiness.map(([business_id, v]) => (
              <div key={business_id} className="border border-border/50 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono">{business_id.slice(0, 8)}</span>
                  <span className="ml-auto text-muted-foreground">
                    Allocated <span className="text-foreground">{fmt(v.allocated, unit)}</span> · Used <span className="text-foreground">{fmt(v.used, unit)}</span>
                  </span>
                </div>
                <ProgressBar value={v.used} max={Math.max(v.allocated, 1)} />
              </div>
            ))}
          </div>
        )}
      </RASection>

      <RASection title="Items" description="Recommended / approved / active allocation lines">
        {items.length === 0 ? <p className="text-xs text-muted-foreground">No items.</p> : (
          <div className="space-y-2 text-xs">
            {items.map(it => (
              <div key={it.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{it.business_id.slice(0,8)}</span>
                  <span className="text-[10px] text-muted-foreground">{it.priority}</span>
                  <span className="text-[10px] text-muted-foreground">{it.status}</span>
                  <span className="ml-auto">{fmt(Number(it.allocated_amount), it.unit)}</span>
                </div>
                {it.reason && <p className="text-[11px] text-muted-foreground">{it.reason}</p>}
                {it.expected_return && <p className="text-[11px] text-muted-foreground"><span className="text-foreground">Expected:</span> {it.expected_return}</p>}
                {it.risk_notes && <p className="text-[11px] text-yellow-300">{it.risk_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </RASection>
    </RALayout>
  );
}