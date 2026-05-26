import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRLayout, statusBadge } from "./_shared";
import { fetchConnectors, fetchHealthChecks, runInternalConfigCheck, type Connector, type HealthCheck } from "@/lib/connectorRegistry";
import { toast } from "sonner";

export default function ConnectorsHealth() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const load = () => Promise.all([fetchConnectors(), fetchHealthChecks(200)]).then(([c,h]) => { setConnectors(c); setChecks(h); });
  useEffect(() => { load(); }, []);
  const nameOf = (id: string) => connectors.find(c => c.id === id)?.connector_name ?? id;

  async function runCheck(id: string) {
    const r = await runInternalConfigCheck(id, null);
    if (r) { toast.success(`Internal check: ${r.health_status}`); load(); }
    else toast.error("Check failed");
  }

  return (
    <CRLayout title="Provider Health Board" subtitle="Internal config checks run live. Provider pings and dry-runs need founder approval.">
      <Card className="tech-card p-3">
        <p className="text-xs text-muted-foreground mb-2">Run a safe internal config check (no provider mutation, no outbound calls):</p>
        <div className="flex flex-wrap gap-2">
          {connectors.slice(0,8).map(c => (
            <Button key={c.id} size="sm" variant="outline" onClick={() => runCheck(c.id)} className="text-xs">{c.connector_name}</Button>
          ))}
        </div>
      </Card>
      <Card className="tech-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Connector</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {checks.map(h => (
              <tr key={h.id} className="border-b border-border/30">
                <td className="p-2 text-muted-foreground">{new Date(h.checked_at).toLocaleString()}</td>
                <td className="p-2 font-medium">{nameOf(h.connector_id)}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{h.check_type}</Badge></td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(h.health_status)}`}>{h.health_status}</Badge></td>
                <td className="p-2 text-muted-foreground">{h.check_summary ?? h.error_message ?? "—"}</td>
              </tr>
            ))}
            {checks.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No checks yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </CRLayout>
  );
}