import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listViolations } from "@/lib/agentCapabilityEngine";

export default function AuditPage() {
  const { data: viol = [] } = useQuery({ queryKey: ["acr-violations"], queryFn: listViolations });
  return (
    <FounderLayout>
      <AcrLayout title="Boundary Violation Audit" subtitle="Every attempted boundary violation. Each open item creates a notification and a work item.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audit log ({viol.length})</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {viol.length === 0 && <p className="text-muted-foreground">No violations recorded.</p>}
            {viol.map(v => (
              <div key={v.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <TagBadge label={v.severity} tone={v.severity === "high" || v.severity === "critical" ? "bad" : "warn"} />
                  <TagBadge label={v.status} tone={v.status === "open" ? "bad" : v.status === "resolved" ? "ok" : "muted"} />
                  <span className="font-medium">{v.agent_name}</span>
                  <span className="ml-auto text-muted-foreground text-[10px]">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                <div><strong>{v.violation_type.replace(/_/g," ")}</strong>: {v.attempted_action}</div>
                {v.detail && <div className="text-muted-foreground">{v.detail}</div>}
                {v.resolution && <div className="text-emerald-400">Resolution: {v.resolution}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </AcrLayout>
    </FounderLayout>
  );
}