import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, OPEN_STATUSES, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueByAgent() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems().then(setItems); }, []);
  const open = items.filter(i => OPEN_STATUSES.includes(i.status));
  const map: Record<string, WorkItem[]> = {};
  for (const i of open) {
    const key = i.assigned_agent ?? i.owner_type ?? "unassigned";
    (map[key] = map[key] ?? []).push(i);
  }
  return (
    <WQLayout title="Work by agent" subtitle="Open work per agent or human owner.">
      {Object.entries(map).sort((a, b) => b[1].length - a[1].length).map(([agent, rows]) => {
        const completedToday = items.filter(i => i.completed_at && (i.assigned_agent ?? i.owner_type) === agent && new Date(i.completed_at).toDateString() === new Date().toDateString()).length;
        const blocked = rows.filter(r => r.status === "blocked").length;
        const approvals = rows.filter(r => r.approval_required).length;
        return (
          <WQSection key={agent} title={agent} description={`Assigned ${rows.length} · Completed today ${completedToday} · Blocked ${blocked} · Approvals ${approvals}`}>
            <div className="space-y-2">{rows.slice(0, 10).map(i => <WorkItemRow key={i.id} item={i} />)}</div>
          </WQSection>
        );
      })}
    </WQLayout>
  );
}