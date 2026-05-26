import { useEffect, useState } from "react";
import { NCLayout, NCSection, NotificationRow } from "./_shared";
import { fetchNotifications, OPEN_NOTIF_STATUSES, type Notification } from "@/lib/notificationCentreEngine";

export default function NotificationsUrgent() {
  const [items, setItems] = useState<Notification[]>([]);
  const load = () => fetchNotifications({ status: OPEN_NOTIF_STATUSES }).then(setItems);
  useEffect(() => { load(); }, []);
  const live = items.filter(i => !i.is_test_data);
  const now = Date.now();
  const critical = live.filter(i => i.severity === "critical" || i.priority === "critical");
  const high = live.filter(i => (i.severity === "high" || i.priority === "urgent" || i.priority === "high") && !(i.severity === "critical" || i.priority === "critical"));
  const today = live.filter(i => i.due_at && new Date(i.due_at).toDateString() === new Date().toDateString());
  const overdue = live.filter(i => i.due_at && Date.parse(i.due_at) < now);
  const revenue = live.filter(i => ["sales_close","qtc_invoices","qtc_payments","upgrades","marketplace","revenue"].includes(i.source_module) || i.notification_type === "revenue");
  const customer = live.filter(i => ["customer","delivery","support"].includes(i.notification_type));
  const legal = live.filter(i => ["privacy","compliance"].includes(i.notification_type));
  const awaiting = live.filter(i => i.action_required && i.notification_type === "approval");
  const block = (title: string, list: Notification[]) => (
    <NCSection title={`${title} (${list.length})`}>
      {list.length === 0 ? <p className="text-xs text-muted-foreground">None.</p>
        : <div className="space-y-2">{list.map(n => <NotificationRow key={n.id} n={n} onChange={load} />)}</div>}
    </NCSection>
  );
  return (
    <NCLayout title="Urgent Centre" subtitle="Critical, high, overdue, revenue-blocking, customer-risk and compliance items. External actions remain approval-gated.">
      {block("Critical", critical)}
      {block("High", high)}
      {block("Due today", today)}
      {block("Overdue", overdue)}
      {block("Revenue-blocking", revenue)}
      {block("Customer-risk", customer)}
      {block("Legal / privacy / compliance", legal)}
      {block("External action awaiting approval", awaiting)}
    </NCLayout>
  );
}