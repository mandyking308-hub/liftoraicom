import { useQuery } from "@tanstack/react-query";
import { SlaLayout, HandoffTable, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { listHandoffs } from "@/lib/internalSla";

export default function SlaByHuman() {
  const { data: all = [] } = useQuery({ queryKey: ["sla-by-human"], queryFn: () => listHandoffs({ limit: 500 }) });
  const toHuman = all.filter(h => {
    const t = (h.to_actor_type ?? "").toLowerCase();
    return t === "founder" || t === "human" || t === "operator" || t === "adviser";
  });
  const groups: Record<string, typeof toHuman> = {};
  for (const h of toHuman) {
    const key = `${h.to_actor_type ?? "human"}:${h.to_actor_id ?? "unassigned"}`;
    (groups[key] ||= []).push(h);
  }
  return (
    <SlaLayout title="Human / operator workload" subtitle="Handoffs assigned to (or pending) the founder, human operators and advisers. Assignments to external humans require approval if access is not yet provisioned.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="To humans" value={toHuman.length} />
        <Stat label="Operators" value={Object.keys(groups).length} />
        <Stat label="Unassigned" value={toHuman.filter(h => !h.to_actor_id && h.handoff_status !== "completed").length} tone="warn" />
        <Stat label="Overdue" value={toHuman.filter(h => h.due_at && new Date(h.due_at).getTime() < Date.now() && h.handoff_status !== "completed").length} tone="bad" />
      </div>
      {Object.entries(groups).map(([k, rows]) => (
        <div key={k} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Assignee: <span className="font-mono">{k}</span> · {rows.length} handoff(s)</h3>
          <HandoffTable rows={rows} />
        </div>
      ))}
      {Object.keys(groups).length === 0 && <Card className="tech-card p-4 text-xs text-muted-foreground">No human-bound handoffs yet.</Card>}
    </SlaLayout>
  );
}