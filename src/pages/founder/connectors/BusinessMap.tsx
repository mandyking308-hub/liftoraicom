import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRLayout, statusBadge, riskBadge } from "./_shared";
import { fetchConnectors, fetchAssignments, type Connector, type Assignment } from "@/lib/connectorRegistry";

export default function ConnectorsBusinessMap() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  useEffect(() => { Promise.all([fetchConnectors(), fetchAssignments()]).then(([c,a]) => { setConnectors(c); setAssignments(a); }); }, []);
  const nameOf = (id: string) => connectors.find(c => c.id === id);
  return (
    <CRLayout title="Business ↔ Connector Map" subtitle="Which businesses use which providers, and at what status. External actions remain off unless explicitly approved.">
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Business</th>
              <th className="text-left p-2">Connector</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Secret</th>
              <th className="text-left p-2">Webhook</th>
              <th className="text-left p-2">External actions</th>
              <th className="text-left p-2">Last health</th>
              <th className="text-left p-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => {
              const c = nameOf(a.connector_id);
              return (
                <tr key={a.id} className="border-b border-border/30">
                  <td className="p-2 font-mono text-[10px]">{a.business_id ?? "—"}</td>
                  <td className="p-2 font-medium">{c?.connector_name ?? a.connector_id}</td>
                  <td className="p-2">{c && <Badge variant="outline" className={`text-[10px] ${riskBadge(c.external_action_risk_level)}`}>{c.external_action_risk_level}</Badge>}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(a.connector_status)}`}>{a.connector_status}</Badge></td>
                  <td className="p-2">{a.secret_configured ? "yes" : "—"}</td>
                  <td className="p-2">{a.webhook_configured ? "yes" : "—"}</td>
                  <td className="p-2">{a.external_action_enabled
                    ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">ENABLED</Badge>
                    : <Badge variant="outline" className="text-[10px]">off</Badge>}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(a.last_health_status ?? "unknown")}`}>{a.last_health_status ?? "unknown"}</Badge></td>
                  <td className="p-2 text-muted-foreground">{a.last_error ?? "—"}</td>
                </tr>
              );
            })}
            {assignments.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No business assignments yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </CRLayout>
  );
}