import { useEffect, useMemo, useState } from "react";
import { NCLayout, NCSection, NotificationRow } from "./_shared";
import { fetchNotifications, type Notification } from "@/lib/notificationCentreEngine";

export default function NotificationsInbox() {
  const [items, setItems] = useState<Notification[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [src, setSrc] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const load = () => fetchNotifications({ limit: 500 }).then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(i =>
    (!severity || i.severity === severity) &&
    (!src || i.source_module === src) &&
    (!status || i.notification_status === status)
  ), [items, severity, src, status]);

  const sources = Array.from(new Set(items.map(i => i.source_module))).sort();

  return (
    <NCLayout title="Inbox" subtitle="Newest first. Filter by severity, source or status. Mark seen, acknowledge, snooze or resolve.">
      <NCSection title={`Notifications (${filtered.length} of ${items.length})`}>
        <div className="flex gap-2 flex-wrap mb-3 text-xs">
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="border border-border/50 bg-background rounded px-2 py-1">
            <option value="">All severities</option>
            {["critical","high","medium","low","info"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={src} onChange={e => setSrc(e.target.value)} className="border border-border/50 bg-background rounded px-2 py-1">
            <option value="">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border border-border/50 bg-background rounded px-2 py-1">
            <option value="">All statuses</option>
            {["new","seen","acknowledged","snoozed","resolved","archived"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <p className="text-xs text-muted-foreground">No notifications match these filters.</p>
          : <div className="space-y-2">{filtered.map(n => <NotificationRow key={n.id} n={n} onChange={load} />)}</div>}
      </NCSection>
    </NCLayout>
  );
}