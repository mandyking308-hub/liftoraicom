import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAuditEvents } from "@/lib/globalAuditLedger";
import { AuditLayout } from "./_shared";

export default function AuditByUser() {
  const q = useQuery({ queryKey: ["audit-by-user"], queryFn: () => fetchAuditEvents({ limit: 1000, include_test: true }) });
  const grouped = useMemo(() => {
    const m = new Map<string, { label: string; type: string; count: number; high: number; latest: string }>();
    for (const e of q.data ?? []) {
      const k = e.actor_id ?? `__${e.actor_type}:${e.actor_label ?? "unknown"}`;
      const cur = m.get(k) ?? { label: e.actor_label ?? "(no label)", type: e.actor_type, count: 0, high: 0, latest: e.created_at };
      cur.count += 1;
      if (e.sensitivity_level === "high" || e.sensitivity_level === "critical") cur.high += 1;
      if (e.created_at > cur.latest) cur.latest = e.created_at;
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [q.data]);
  return (
    <AuditLayout title="Audit by user" subtitle="Per-actor breakdown. Useful for investigations and access reviews. AI agents, webhooks and system actors are grouped here too.">
      <div className="space-y-2">
        {grouped.map(([k, s]) => (
          <Card key={k} className="tech-card p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
              <span className="font-medium">{s.label}</span>
              <Badge variant="outline" className="text-[10px]">{s.count} events</Badge>
              {s.high > 0 && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{s.high} high</Badge>}
              <span className="text-[10px] text-muted-foreground ml-auto">latest {s.latest.slice(0,19).replace("T"," ")}</span>
            </div>
          </Card>
        ))}
        {!grouped.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No audit events.</Card>}
      </div>
    </AuditLayout>
  );
}