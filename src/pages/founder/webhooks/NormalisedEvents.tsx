import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WHLayout } from "./_shared";
import { fetchNormalised, type NormalisedEvent } from "@/lib/webhookInbox";

export default function WebhooksNormalised() {
  const [items, setItems] = useState<NormalisedEvent[]>([]);
  useEffect(() => { fetchNormalised(300).then(setItems).catch(() => setItems([])); }, []);
  return (
    <WHLayout title="Normalised Events" subtitle="Liftor-shaped events produced from webhook payloads. Each one carries a link back to the original inbox row and forward to the Event Bus.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Event type</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Confidence</th>
              <th className="text-left p-2">Inbox event</th>
              <th className="text-left p-2">Liftor event</th>
              <th className="text-left p-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {items.map(n => (
              <tr key={n.id} className="border-b border-border/30">
                <td className="p-2 text-muted-foreground">{new Date(n.created_at).toLocaleString()}</td>
                <td className="p-2 font-mono text-[11px]">{n.event_type}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{n.event_category}</Badge></td>
                <td className="p-2">{n.confidence_score ?? "—"}</td>
                <td className="p-2 font-mono text-[10px] truncate max-w-[140px]">{n.webhook_inbox_event_id ?? "—"}</td>
                <td className="p-2 font-mono text-[10px] truncate max-w-[140px]">{n.liftor_event_id ?? "—"}</td>
                <td className="p-2 text-muted-foreground truncate max-w-[260px]">{JSON.stringify(n.normalised_payload).slice(0, 120)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No normalised events.</td></tr>}
          </tbody>
        </table>
      </Card>
    </WHLayout>
  );
}