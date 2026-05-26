import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NCLayout, NCSection, NCStat, NotificationRow } from "./_shared";
import { fetchNotifications, fetchEscalations, summarize, rankNotification, NOTIF_SOURCES, OPEN_NOTIF_STATUSES, type Notification, type Escalation, type NotifSummary } from "@/lib/notificationCentreEngine";

export default function NotificationsOverview() {
  const [items, setItems] = useState<Notification[]>([]);
  const [esc, setEsc] = useState<Escalation[]>([]);
  const [sum, setSum] = useState<NotifSummary | null>(null);
  const load = () => Promise.all([
    fetchNotifications({ status: OPEN_NOTIF_STATUSES }),
    fetchEscalations(),
  ]).then(([n, e]) => { setItems(n); setEsc(e); setSum(summarize(n, e)); });
  useEffect(() => { load(); }, []);
  const top = [...items].filter(i => !i.is_test_data && OPEN_NOTIF_STATUSES.includes(i.notification_status))
    .sort((a, b) => rankNotification(b) - rankNotification(a)).slice(0, 10);
  return (
    <NCLayout title="Unified Notification & Escalation Centre"
      subtitle="Every alert, approval, warning, incident and escalation across Liftor — ranked by severity, value and risk. Resolving items here never sends external messages; external channels remain off until founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <NCStat label="Open" value={sum?.total_open} />
        <NCStat label="New" value={sum?.new_count} />
        <NCStat label="Critical" value={sum?.critical} tone={(sum?.critical ?? 0) > 0 ? "bad" : "ok"} />
        <NCStat label="High" value={sum?.high} tone={(sum?.high ?? 0) > 0 ? "warn" : "ok"} />
        <NCStat label="Overdue" value={sum?.overdue} tone={(sum?.overdue ?? 0) > 0 ? "bad" : "ok"} />
        <NCStat label="Escalations" value={sum?.open_escalations} tone={(sum?.open_escalations ?? 0) > 0 ? "warn" : "ok"} />
        <NCStat label="Revenue-blocking" value={sum?.revenue_blocking} />
        <NCStat label="Customer-risk" value={sum?.customer_risk} />
        <NCStat label="Privacy/compliance" value={sum?.privacy_compliance} />
        <NCStat label="Test rows" value={sum?.test_records} hint="excluded from KPIs" />
      </div>
      <NCSection title="Top 10 by urgency" description="Severity + priority + overdue + action-required ranking.">
        {top.length === 0 ? <p className="text-xs text-muted-foreground">Nothing open right now.</p>
          : <div className="space-y-2">{top.map(n => <NotificationRow key={n.id} n={n} onChange={load} />)}</div>}
      </NCSection>
      <NCSection title="Connected sources" description="Modules the Notification Agent ingests from. Missing tables fail gracefully as 'not connected yet'.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {NOTIF_SOURCES.map(s => (
            <div key={s.module} className="border border-border/50 rounded p-2">
              <p className="text-[11px] font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.table}</p>
            </div>
          ))}
        </div>
      </NCSection>
      <NCSection title="Where it appears" description="The Notification Centre surfaces inside these Command Centre and operating views.">
        <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-1">
          <li>· <Link to="/founder/command-centre" className="text-primary hover:underline">Command Centre</Link> – Unified Notifications card</li>
          <li>· <Link to="/founder/work-queue" className="text-primary hover:underline">Master Work Queue</Link> – cross-linked work items</li>
          <li>· Today's Founder Cockpit, What Needs Attention Today</li>
          <li>· Business / Agent Operating Status, First-Use Configuration</li>
          <li>· User Manual, Technical Manual</li>
        </ul>
      </NCSection>
    </NCLayout>
  );
}