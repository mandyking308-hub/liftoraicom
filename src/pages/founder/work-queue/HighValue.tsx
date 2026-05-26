import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, OPEN_STATUSES, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueHighValue() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ status: OPEN_STATUSES, high_value_only: true }).then(setItems); }, []);
  const sorted = [...items].sort((a, b) => (b.estimated_value_amount ?? 0) - (a.estimated_value_amount ?? 0));
  return (
    <WQLayout title="High-value work" subtitle="Open items linked to estimated revenue, upgrade or close opportunities.">
      <WQSection title={`High-value items (${sorted.length})`}>
        {sorted.length === 0 ? <p className="text-xs text-muted-foreground">No high-value items open.</p>
          : <div className="space-y-2">{sorted.map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
      </WQSection>
    </WQLayout>
  );
}