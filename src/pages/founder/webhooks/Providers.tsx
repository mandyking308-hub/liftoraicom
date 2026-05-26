import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WHLayout } from "./_shared";
import { fetchRules, type ProcessingRule } from "@/lib/webhookInbox";

export default function WebhooksProviders() {
  const [items, setItems] = useState<ProcessingRule[]>([]);
  useEffect(() => { fetchRules().then(setItems).catch(() => setItems([])); }, []);
  return (
    <WHLayout title="Provider Rules" subtitle="Mapping from raw provider events to Liftor's normalised event types. Signature is required by default for every rule.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Provider</th>
              <th className="text-left p-2">Webhook event</th>
              <th className="text-left p-2">Normalised event</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Signature</th>
              <th className="text-left p-2">Idempotency field</th>
              <th className="text-left p-2">Business mapping</th>
              <th className="text-left p-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b border-border/30">
                <td className="p-2 font-medium">{r.provider_name}</td>
                <td className="p-2 font-mono text-[11px]">{r.webhook_event_type}</td>
                <td className="p-2 font-mono text-[11px]">{r.normalised_event_type}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.event_category}</Badge></td>
                <td className="p-2">{r.required_signature
                  ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">required</Badge>
                  : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">optional</Badge>}</td>
                <td className="p-2 font-mono text-[10px]">{r.idempotency_field ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{r.business_mapping_strategy ?? "—"}</td>
                <td className="p-2">{r.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </WHLayout>
  );
}