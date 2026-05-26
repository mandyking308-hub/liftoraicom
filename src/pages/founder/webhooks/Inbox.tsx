import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WHLayout, procBadge, verBadge } from "./_shared";
import { fetchInbox, type InboxEvent } from "@/lib/webhookInbox";

export default function WebhooksInbox() {
  const [items, setItems] = useState<InboxEvent[]>([]);
  useEffect(() => { fetchInbox(300).then(setItems).catch(() => setItems([])); }, []);
  return (
    <WHLayout title="Webhook Inbox" subtitle="Every webhook received, with verification status and processing outcome. Payload summaries only — never raw secrets.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Received</th>
              <th className="text-left p-2">Provider</th>
              <th className="text-left p-2">Event type</th>
              <th className="text-left p-2">Verification</th>
              <th className="text-left p-2">Processing</th>
              <th className="text-left p-2">Provider event id</th>
              <th className="text-left p-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id} className="border-b border-border/30">
                <td className="p-2 text-muted-foreground">{new Date(e.received_at).toLocaleString()}</td>
                <td className="p-2 font-medium">{e.provider_name}</td>
                <td className="p-2 font-mono text-[11px]">{e.webhook_event_type}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${verBadge(e.verification_status)}`}>{e.verification_status}</Badge></td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${procBadge(e.processing_status)}`}>{e.processing_status}</Badge></td>
                <td className="p-2 font-mono text-[10px] truncate max-w-[160px]">{e.provider_event_id ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{e.error_message ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No webhook events yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </WHLayout>
  );
}