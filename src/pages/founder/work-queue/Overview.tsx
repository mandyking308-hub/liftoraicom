import { useEffect, useState } from "react";
import { WQLayout, WQSection, WorkItemRow, WQStat } from "./_shared";
import { fetchWorkItems, summarize, topN, OPEN_STATUSES, PMO_SOURCES, type WorkItem, type QueueSummary } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueOverview() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [sum, setSum] = useState<QueueSummary | null>(null);
  useEffect(() => {
    fetchWorkItems({ status: OPEN_STATUSES }).then(rows => {
      setItems(rows); setSum(summarize(rows));
    });
  }, []);
  const top = topN(items, 10);
  return (
    <WQLayout title="Master Work Queue / Portfolio PMO" subtitle="Every open task across sales, delivery, support, finance, compliance, marketplace, portfolio and AI cost — ranked by urgency, value and risk. Completing work here never triggers external action; external steps remain approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <WQStat label="Open today" value={sum?.open_today ?? "—"} />
        <WQStat label="Urgent" value={sum?.urgent ?? "—"} tone={(sum?.urgent ?? 0) > 0 ? "warn" : "ok"} />
        <WQStat label="Overdue" value={sum?.overdue ?? "—"} tone={(sum?.overdue ?? 0) > 0 ? "bad" : "ok"} />
        <WQStat label="Approvals" value={sum?.approvals_blocking ?? "—"} />
        <WQStat label="High value" value={sum?.high_value ?? "—"} />
        <WQStat label="Blocked" value={sum?.blocked ?? "—"} tone={(sum?.blocked ?? 0) > 0 ? "bad" : "ok"} />
        <WQStat label="Test rows" value={sum?.test_records ?? "—"} hint="excluded from KPIs" />
      </div>
      <WQSection title="Top 10 things that matter" description="Ranked by priority, value, risk, overdue and approval gating.">
        {top.length === 0 ? <p className="text-xs text-muted-foreground">No open work right now.</p>
          : <div className="space-y-2">{top.map(i => <WorkItemRow key={i.id} item={i} />)}</div>}
      </WQSection>
      <WQSection title="Connected sources" description="Modules the Master PMO ingests from. Missing tables fail gracefully (shown as 'not connected yet').">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {PMO_SOURCES.map(s => (
            <div key={s.module} className="border border-border/50 rounded p-2">
              <p className="text-[11px] font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.table}</p>
            </div>
          ))}
        </div>
      </WQSection>
    </WQLayout>
  );
}