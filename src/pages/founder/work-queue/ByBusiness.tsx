import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, OPEN_STATUSES, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueByBusiness() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ status: OPEN_STATUSES }).then(setItems); }, []);
  const map: Record<string, WorkItem[]> = {};
  for (const i of items) {
    const key = i.business_id ?? "no-business";
    (map[key] = map[key] ?? []).push(i);
  }
  return (
    <WQLayout title="Work by business" subtitle="Open work grouped per business.">
      {Object.entries(map).sort((a, b) => b[1].length - a[1].length).map(([bid, rows]) => {
        const urgent = rows.filter(r => r.priority === "urgent" || r.priority === "critical").length;
        const revenue = rows.filter(r => (r.estimated_value_amount ?? 0) > 0).length;
        const risk = rows.filter(r => Number(r.risk_score ?? 0) >= 50).length;
        const overdue = rows.filter(r => r.due_at && new Date(r.due_at) < new Date()).length;
        return (
          <WQSection key={bid} title={`Business ${bid.slice(0, 8)}`} description={`Open ${rows.length} · Urgent ${urgent} · Revenue-linked ${revenue} · Risk-linked ${risk} · Overdue ${overdue}`}>
            <div className="space-y-2">{rows.slice(0, 10).map(i => <WorkItemRow key={i.id} item={i} />)}</div>
          </WQSection>
        );
      })}
    </WQLayout>
  );
}