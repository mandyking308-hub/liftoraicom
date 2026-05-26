import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WHLayout, procBadge, verBadge } from "./_shared";
import { fetchInbox, type InboxEvent } from "@/lib/webhookInbox";

export default function WebhooksFailures() {
  const [items, setItems] = useState<InboxEvent[]>([]);
  useEffect(() => { fetchInbox(500).then(rows => setItems(rows.filter(r => r.processing_status === "failed" || r.processing_status === "duplicate" || r.processing_status === "parked" || r.verification_status === "failed" || r.verification_status === "missing"))).catch(() => setItems([])); }, []);
  return (
    <WHLayout title="Failures, Duplicates & Parked" subtitle="Everything that did not normalise cleanly. Each row is an item for the Webhook Agent to triage.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Provider</th>
              <th className="text-left p-2">Event</th>
              <th className="text-left p-2">Verification</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Reason</th>
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
                <td className="p-2 text-muted-foreground">{e.error_message ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No failures.</td></tr>}
          </tbody>
        </table>
      </Card>
    </WHLayout>
  );
}