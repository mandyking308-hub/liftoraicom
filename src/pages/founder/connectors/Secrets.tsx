import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRLayout } from "./_shared";
import { fetchConnectors, fetchAssignments, type Connector, type Assignment } from "@/lib/connectorRegistry";
import { Lock } from "lucide-react";

export default function ConnectorsSecrets() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  useEffect(() => { Promise.all([fetchConnectors(), fetchAssignments()]).then(([c,a]) => { setConnectors(c); setAssignments(a); }); }, []);

  const grouped = connectors.map(c => {
    const rows = assignments.filter(a => a.connector_id === c.id);
    const anyConfigured = rows.some(r => r.secret_configured);
    const anyNeeded = rows.some(r => !r.secret_configured && r.connector_status !== "not_needed" && r.connector_status !== "not_connected");
    return { c, anyConfigured, anyNeeded, count: rows.length };
  });

  return (
    <CRLayout title="Secrets Map" subtitle="This view never shows raw secret values. It only shows whether a secret is configured for each connector.">
      <Card className="tech-card p-3 text-xs text-muted-foreground flex items-center gap-2"><Lock size={12}/> Secrets live in Lovable Cloud encrypted storage. Use the Lovable secrets manager to add or rotate values.</Card>
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">Connector</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Assignments</th>
              <th className="text-left p-2">Secret configured</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({c, anyConfigured, anyNeeded, count}) => (
              <tr key={c.id} className="border-b border-border/30">
                <td className="p-2 font-medium">{c.connector_name}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.provider_type}</Badge></td>
                <td className="p-2">{count}</td>
                <td className="p-2">
                  {anyConfigured && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">yes</Badge>}
                  {!anyConfigured && anyNeeded && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">needed</Badge>}
                  {!anyConfigured && !anyNeeded && <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </CRLayout>
  );
}