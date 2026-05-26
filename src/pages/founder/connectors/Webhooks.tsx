import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRLayout, statusBadge } from "./_shared";
import { fetchConnectors, fetchWebhooks, type Connector, type WebhookEndpoint } from "@/lib/connectorRegistry";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export default function ConnectorsWebhooks() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [items, setItems] = useState<WebhookEndpoint[]>([]);
  useEffect(() => { Promise.all([fetchConnectors(), fetchWebhooks()]).then(([c,w]) => { setConnectors(c); setItems(w); }); }, []);
  const nameOf = (id: string) => connectors.find(c => c.id === id)?.connector_name ?? id;
  return (
    <CRLayout title="Webhook Endpoints" subtitle="Every webhook URL Liftor exposes or registers. Signature verification is required by policy.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Connector</th>
              <th className="text-left p-2">Endpoint</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Signature</th>
              <th className="text-left p-2">Last event</th>
              <th className="text-left p-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {items.map(w => (
              <tr key={w.id} className="border-b border-border/30">
                <td className="p-2 font-medium">{nameOf(w.connector_id)}</td>
                <td className="p-2 font-mono text-[11px]">{w.endpoint_name}<div className="text-muted-foreground text-[10px] truncate max-w-xs">{w.endpoint_url}</div></td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(w.webhook_status)}`}>{w.webhook_status}</Badge></td>
                <td className="p-2">{w.signature_verification_required
                  ? <span className="inline-flex items-center gap-1 text-emerald-400"><ShieldCheck size={12}/>required</span>
                  : <span className="inline-flex items-center gap-1 text-red-300"><ShieldAlert size={12}/>missing</span>}</td>
                <td className="p-2 text-muted-foreground">{w.last_event_at ? new Date(w.last_event_at).toLocaleString() : "—"}</td>
                <td className="p-2 text-muted-foreground">{w.last_error ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No webhook endpoints.</td></tr>}
          </tbody>
        </table>
      </Card>
    </CRLayout>
  );
}