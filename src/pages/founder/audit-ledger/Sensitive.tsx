import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAuditEvents } from "@/lib/globalAuditLedger";
import { AuditLayout, categoryBadge, sensitivityBadge } from "./_shared";

export default function AuditSensitive() {
  const q = useQuery({
    queryKey: ["audit-sensitive"],
    queryFn: async () => {
      const [high, critical, ext] = await Promise.all([
        fetchAuditEvents({ limit: 200, sensitivity_level: "high", include_test: true }),
        fetchAuditEvents({ limit: 200, sensitivity_level: "critical", include_test: true }),
        fetchAuditEvents({ limit: 200, external_only: true, include_test: true }),
      ]);
      const merged = new Map<string, any>();
      [...critical, ...high, ...ext].forEach(e => merged.set(e.id, e));
      return [...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
  return (
    <AuditLayout title="Sensitive audit events" subtitle="High/critical sensitivity rows plus anything flagged with an external side-effect. Raw secrets and large payloads are redacted before write.">
      <div className="space-y-2">
        {(q.data ?? []).map((e: any) => (
          <Card key={e.id} className="tech-card p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${categoryBadge(e.event_category)}`}>{e.event_category}</Badge>
              <Badge variant="outline" className={`text-[10px] ${sensitivityBadge(e.sensitivity_level)}`}>{e.sensitivity_level}</Badge>
              {e.external_side_effect && <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">external</Badge>}
              {e.is_test_data && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
              <code className="text-[10px]">{e.source_module}</code>
              <span className="text-[10px] text-muted-foreground ml-auto">{e.created_at.slice(0,19).replace("T"," ")}</span>
            </div>
            <p className="mt-1">{e.action_summary}</p>
            <p className="text-[10px] text-muted-foreground">{e.actor_type}{e.actor_label ? ` · ${e.actor_label}` : ""}{e.trace_id ? ` · trace ${e.trace_id}` : ""}</p>
          </Card>
        ))}
        {!q.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No sensitive events.</Card>}
      </div>
    </AuditLayout>
  );
}