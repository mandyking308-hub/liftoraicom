import { useEffect, useMemo, useState } from "react";
import { CapLayout, CapSection, CapEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Props { title: string; subtitle: string; filterAssignee?: "ai_agent" | "human" | "founder" | "vendor"; filterSource?: string }

export default function WorkloadView({ title, subtitle, filterAssignee, filterSource }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      let q = (supabase as any).from("workload_items").select("*").order("due_at", { ascending: true });
      if (filterAssignee) q = q.eq("assigned_to_type", filterAssignee);
      if (filterSource) q = q.eq("source_type", filterSource);
      const { data } = await q;
      setRows(data ?? []); setLoading(false);
    })();
  }, [filterAssignee, filterSource]);

  const buckets = useMemo(() => {
    const order = ["pending", "active", "blocked", "completed", "cancelled"] as const;
    return order.map(s => ({ status: s, items: rows.filter(r => r.workload_status === s) }));
  }, [rows]);

  const sevTone = (p: string) => p === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : p === "high" ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
    : p === "medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-secondary/40 text-muted-foreground border-border/40";

  return (
    <CapLayout title={title} subtitle={subtitle}>
      {loading ? <p className="text-sm text-muted-foreground">Loading workload…</p>
       : rows.length === 0 ? <CapEmpty title="No workload items yet" hint="Items appear as delivery, support, sales, onboarding and finance work is queued." />
       : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {buckets.map(b => (
            <CapSection key={b.status} title={`${b.status} (${b.items.length})`}>
              <div className="space-y-2">
                {b.items.length === 0 && <p className="text-xs text-muted-foreground">No items.</p>}
                {b.items.map((w: any) => (
                  <div key={w.id} className="rounded border border-border/40 p-2 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{w.workload_name}</p>
                      <Badge variant="outline" className={sevTone(w.priority)}>{w.priority}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground capitalize">{w.source_type} · {w.assigned_to_type}{w.assigned_to ? ` · ${w.assigned_to}` : ""}</p>
                    <p className="text-[10px] text-muted-foreground">{Number(w.estimated_hours).toFixed(1)}h · due {w.due_at ? new Date(w.due_at).toLocaleDateString() : "—"}</p>
                  </div>
                ))}
              </div>
            </CapSection>
          ))}
        </div>
      )}
    </CapLayout>
  );
}