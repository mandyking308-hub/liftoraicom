import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, OPEN_STATUSES, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueApprovals() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ status: OPEN_STATUSES, approvals_only: true }).then(setItems); }, []);
  return (
    <WQLayout title="Approval-gated work" subtitle="Work that requires explicit founder approval before any external action.">
      <WQSection title={`Awaiting approval (${items.length})`}>
        {items.length === 0 ? <p className="text-xs text-muted-foreground">No approvals pending.</p>
          : <div className="space-y-2">{items.map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
      </WQSection>
    </WQLayout>
  );
}