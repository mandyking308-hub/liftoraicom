import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAuditEvents } from "@/lib/globalAuditLedger";
import { AuditLayout } from "./_shared";

export default function AuditByModule() {
  const q = useQuery({ queryKey: ["audit-by-module"], queryFn: () => fetchAuditEvents({ limit: 1000, include_test: true }) });
  const grouped = useMemo(() => {
    const m = new Map<string, { count: number; high: number; external: number; categories: Set<string> }>();
    for (const e of q.data ?? []) {
      const cur = m.get(e.source_module) ?? { count: 0, high: 0, external: 0, categories: new Set<string>() };
      cur.count += 1;
      if (e.sensitivity_level === "high" || e.sensitivity_level === "critical") cur.high += 1;
      if (e.external_side_effect) cur.external += 1;
      cur.categories.add(e.event_category);
      m.set(e.source_module, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [q.data]);
  return (
    <AuditLayout title="Audit by module" subtitle="Volume by source module across the platform. Useful for sanity-checking which modules are generating the most audit activity.">
      <div className="space-y-2">
        {grouped.map(([k, s]) => (
          <Card key={k} className="tech-card p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-[11px]">{k}</code>
              <Badge variant="outline" className="text-[10px]">{s.count} events</Badge>
              {s.high > 0 && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{s.high} high</Badge>}
              {s.external > 0 && <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">{s.external} external</Badge>}
              <span className="text-[10px] text-muted-foreground ml-auto">{[...s.categories].join(", ")}</span>
            </div>
          </Card>
        ))}
        {!grouped.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No audit events.</Card>}
      </div>
    </AuditLayout>
  );
}