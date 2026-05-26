import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRLayout, riskBadge } from "./_shared";
import { fetchConnectors, type Connector } from "@/lib/connectorRegistry";

export default function ConnectorsRegistry() {
  const [items, setItems] = useState<Connector[]>([]);
  useEffect(() => { fetchConnectors().then(setItems).catch(() => setItems([])); }, []);
  return (
    <CRLayout title="Provider Registry" subtitle="Catalogue of every provider Liftor knows about. Read-only. Add or deactivate connectors via founder-approved migrations.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Paid</th>
              <th className="text-left p-2">Webhooks</th>
              <th className="text-left p-2">Sandbox</th>
              <th className="text-left p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-b border-border/30 hover:bg-secondary/40">
                <td className="p-2 font-medium">{c.connector_name}<div className="text-[10px] text-muted-foreground">{c.connector_key}</div></td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.provider_type}</Badge></td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${riskBadge(c.external_action_risk_level)}`}>{c.external_action_risk_level}</Badge></td>
                <td className="p-2">{c.paid_api_possible ? "yes" : "—"}</td>
                <td className="p-2">{c.supports_webhooks ? "yes" : "—"}</td>
                <td className="p-2">{c.supports_sandbox ? "yes" : "—"}</td>
                <td className="p-2 text-muted-foreground">{c.description}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No connectors.</td></tr>}
          </tbody>
        </table>
      </Card>
    </CRLayout>
  );
}