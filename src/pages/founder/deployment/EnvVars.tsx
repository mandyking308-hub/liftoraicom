import { useQuery } from "@tanstack/react-query";
import { DepLayout, SensitivityBadge, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listEnvVars } from "@/lib/deploymentControl";

export default function DepEnvVars() {
  const { data: rows = [] } = useQuery({ queryKey: ["dep-vars"], queryFn: () => listEnvVars(1000) });
  const missingCritical = rows.filter(r => !r.configured && r.sensitivity_level === "critical").length;
  const missingHigh = rows.filter(r => !r.configured && r.sensitivity_level === "high").length;
  const configured = rows.filter(r => r.configured).length;
  return (
    <DepLayout title="Environment variables" subtitle="Only the configured yes/no status and sensitivity level are tracked. Secret values are never read or stored by this module.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Variables tracked" value={rows.length} />
        <Stat label="Configured" value={configured} tone="ok" />
        <Stat label="Missing critical" value={missingCritical} tone={missingCritical ? "bad" : "ok"} />
        <Stat label="Missing high" value={missingHigh} tone={missingHigh ? "warn" : "ok"} />
      </div>
      <Card className="tech-card p-3 text-[11px] text-yellow-300 border-yellow-500/40">
        Secret values are never displayed. Add or rotate secrets in the Lovable Cloud secrets store; this module only reflects whether each name is configured.
      </Card>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Variable</th><th className="text-left p-2">Sensitivity</th><th className="text-left p-2">Configured</th><th className="text-left p-2">Last verified</th><th className="text-left p-2">Notes</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No variables tracked.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 font-mono text-[11px]">{r.variable_name}</td>
                <td className="p-2"><SensitivityBadge s={r.sensitivity_level} /></td>
                <td className="p-2">{r.configured
                  ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Yes</Badge>
                  : <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">Missing</Badge>}</td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">{r.last_verified_at ? new Date(r.last_verified_at).toLocaleString() : "—"}</td>
                <td className="p-2 max-w-[260px] truncate text-muted-foreground">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DepLayout>
  );
}