import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueBlocked() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ status: ["blocked"] }).then(setItems); }, []);
  return (
    <WQLayout title="Blocked work" subtitle="Items that need a blocker removed before progress can continue.">
      <WQSection title={`Blocked (${items.length})`}>
        {items.length === 0 ? <p className="text-xs text-muted-foreground">Nothing blocked right now.</p>
          : <div className="space-y-2">{items.map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
      </WQSection>
    </WQLayout>
  );
}