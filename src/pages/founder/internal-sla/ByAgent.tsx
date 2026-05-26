import { useQuery } from "@tanstack/react-query";
import { SlaLayout, HandoffTable, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { listHandoffs } from "@/lib/internalSla";

export default function SlaByAgent() {
  const { data: all = [] } = useQuery({ queryKey: ["sla-by-agent"], queryFn: () => listHandoffs({ limit: 500 }) });
  const fromAgent = all.filter(h => {
    const t = (h.from_actor_type ?? "").toLowerCase();
    return t.includes("agent") || t === "ai";
  });
  const groups: Record<string, typeof fromAgent> = {};
  for (const h of fromAgent) {
    const key = h.from_actor_id ?? h.from_actor_type ?? "unknown";
    (groups[key] ||= []).push(h);
  }
  return (
    <SlaLayout title="By agent" subtitle="Handoffs originating from AI agents to founders, humans or other agents.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="From agents" value={fromAgent.length} />
        <Stat label="Distinct agents" value={Object.keys(groups).length} />
        <Stat label="Open" value={fromAgent.filter(h => h.handoff_status !== "completed" && h.handoff_status !== "cancelled").length} />
        <Stat label="Overdue" value={fromAgent.filter(h => h.due_at && new Date(h.due_at).getTime() < Date.now() && h.handoff_status !== "completed" && h.handoff_status !== "cancelled").length} tone="bad" />
      </div>
      {Object.entries(groups).map(([k, rows]) => (
        <div key={k} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Agent: <span className="font-mono">{k}</span> · {rows.length} handoff(s)</h3>
          <HandoffTable rows={rows} />
        </div>
      ))}
      {Object.keys(groups).length === 0 && <Card className="tech-card p-4 text-xs text-muted-foreground">No agent-originated handoffs yet.</Card>}
    </SlaLayout>
  );
}