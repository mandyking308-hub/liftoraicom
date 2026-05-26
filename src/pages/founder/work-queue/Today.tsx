import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow } from "./_shared";
import { fetchWorkItems, OPEN_STATUSES, rankScore, type WorkItem } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueToday() {
  const [items, setItems] = useState<WorkItem[]>([]);
  useEffect(() => { fetchWorkItems({ status: OPEN_STATUSES }).then(setItems); }, []);
  const open = items.filter(i => !i.is_test_data);
  const buckets: Array<[string, (i: WorkItem) => boolean]> = [
    ["Urgent / critical", i => i.priority === "urgent" || i.priority === "critical"],
    ["Approvals blocking revenue", i => i.approval_required || i.status === "waiting_approval"],
    ["High-value sales / close", i => (i.work_type === "sales" || i.source_module.startsWith("sales")) && (i.estimated_value_amount ?? 0) >= 500],
    ["Overdue customer / support / delivery", i => !!i.due_at && new Date(i.due_at) < new Date() && ["support","delivery","onboarding","complaint"].includes(i.work_type)],
    ["Privacy / incidents / compliance", i => ["privacy","incident"].includes(i.work_type)],
    ["Blocked marketplace / seller", i => i.source_module.includes("marketplace") || i.source_module.includes("seller")],
    ["Data quality risks", i => i.work_type === "data_quality"],
    ["Founder decisions needed", i => i.owner_type === "founder"],
  ];
  return (
    <WQLayout title="Today's work" subtitle="Ranked buckets for the live operating day. Test rows are filtered out.">
      {buckets.map(([label, pred]) => {
        const rows = open.filter(pred).sort((a, b) => rankScore(b) - rankScore(a));
        return (
          <WQSection key={label} title={`${label} (${rows.length})`}>
            {rows.length === 0 ? <p className="text-xs text-muted-foreground">Nothing here today.</p>
              : <div className="space-y-2">{rows.slice(0, 25).map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
          </WQSection>
        );
      })}
    </WQLayout>
  );
}