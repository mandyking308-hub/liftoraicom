import { useQuery } from "@tanstack/react-query";
import { SlaLayout, HandoffTable, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { listHandoffs, listBreaches } from "@/lib/internalSla";

export default function SlaOverdue() {
  const { data: all = [] } = useQuery({ queryKey: ["sla-all"], queryFn: () => listHandoffs({ limit: 500 }) });
  const overdue = all.filter(h => h.handoff_status === "overdue" || (h.due_at && new Date(h.due_at).getTime() < Date.now() && h.handoff_status !== "completed" && h.handoff_status !== "cancelled"));
  const blocked = all.filter(h => h.handoff_status === "blocked");
  const { data: breaches = [] } = useQuery({ queryKey: ["sla-breaches"], queryFn: () => listBreaches({ limit: 500 }) });
  const openBreaches = breaches.filter(b => b.status === "open");
  const critical = openBreaches.filter(b => b.severity === "critical").length;
  return (
    <SlaLayout title="Overdue & breaches" subtitle="Handoffs past their due date, blocked work, and detected SLA breaches. Escalations are recommendations — no external action is taken automatically.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : "ok"} />
        <Stat label="Blocked" value={blocked.length} tone={blocked.length ? "bad" : undefined} />
        <Stat label="Open breaches" value={openBreaches.length} tone={openBreaches.length ? "bad" : "ok"} />
        <Stat label="Critical" value={critical} tone={critical ? "bad" : "ok"} />
      </div>
      <h2 className="text-sm font-semibold mt-2">Overdue handoffs</h2>
      <HandoffTable rows={overdue} />
      <h2 className="text-sm font-semibold mt-2">Blocked handoffs</h2>
      <HandoffTable rows={blocked} />
      <h2 className="text-sm font-semibold mt-2">SLA breaches</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Type</th><th className="text-left p-2">Severity</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Escalated</th><th className="text-left p-2">Status</th><th className="text-left p-2">Handoff</th>
          </tr></thead>
          <tbody>
            {breaches.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No breaches.</td></tr>}
            {breaches.map(b => (
              <tr key={b.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(b.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{b.breach_type.replace(/_/g," ")}</td>
                <td className="p-2 capitalize">{b.severity}</td>
                <td className="p-2 max-w-[320px] truncate">{b.breach_summary ?? "—"}</td>
                <td className="p-2">{b.escalation_created ? "yes" : "no"}</td>
                <td className="p-2 capitalize">{b.status}</td>
                <td className="p-2 font-mono text-[10px] text-muted-foreground">{b.handoff_record_id.slice(0,8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SlaLayout>
  );
}