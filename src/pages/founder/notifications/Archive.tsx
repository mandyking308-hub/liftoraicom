import { useEffect, useState } from "react";
import { NCLayout, NCSection, NotificationRow } from "./_shared";
import { fetchNotifications, type Notification } from "@/lib/notificationCentreEngine";

export default function NotificationsArchive() {
  const [items, setItems] = useState<Notification[]>([]);
  const load = () => fetchNotifications({ status: ["resolved", "archived"] }).then(setItems);
  useEffect(() => { load(); }, []);
  return (
    <NCLayout title="Archive" subtitle="Resolved and archived notifications.">
      <NCSection title={`Archived (${items.length})`}>
        {items.length === 0 ? <p className="text-xs text-muted-foreground">Nothing archived yet.</p>
          : <div className="space-y-2">{items.map(n => <NotificationRow key={n.id} n={n} onChange={load} />)}</div>}
      </NCSection>
    </NCLayout>
  );
}