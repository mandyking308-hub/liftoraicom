import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueOverdue() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ overdue_only: true }).then(setItems); }, []);
  return (
    <WQLayout title="Overdue work" subtitle="Open items past their due date.">
      <WQSection title={`Overdue (${items.length})`}>
        {items.length === 0 ? <p className="text-xs text-muted-foreground">Nothing overdue.</p>
          : <div className="space-y-2">{items.map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
      </WQSection>
    </WQLayout>
  );
}