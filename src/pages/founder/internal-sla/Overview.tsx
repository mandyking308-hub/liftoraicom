import { useQuery } from "@tanstack/react-query";
import { SlaLayout, Stat, HandoffTable } from "./_shared";
import { summariseInternalSla, listHandoffs, listBreaches } from "@/lib/internalSla";
import { Card } from "@/components/ui/card";

export default function SlaOverview() {
  const { data: s } = useQuery({ queryKey: ["sla-summary"], queryFn: summariseInternalSla, refetchInterval: 60000 });
  const { data: recent = [] } = useQuery({ queryKey: ["sla-recent"], queryFn: () => listHandoffs({ limit: 20 }) });
  const { data: breaches = [] } = useQuery({ queryKey: ["sla-breach-recent"], queryFn: () => listBreaches({ limit: 10 }) });
  return (
    <SlaLayout title="Internal SLA & Handoff Control" subtitle="Tracks every handoff between AI agents, the founder and human operators. Overdue work escalates. No external messages are sent from this module.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Handoffs" value={s?.totalHandoffs ?? 0} />
        <Stat label="Open" value={s?.open ?? 0} tone={s?.open ? "warn" : undefined} />
        <Stat label="In progress" value={s?.inProgress ?? 0} />
        <Stat label="Blocked" value={s?.blocked ?? 0} tone={s?.blocked ? "bad" : undefined} />
        <Stat label="Overdue" value={s?.overdue ?? 0} tone={s?.overdue ? "bad" : undefined} />
        <Stat label="Unassigned" value={s?.unassigned ?? 0} tone={s?.unassigned ? "warn" : undefined} />
        <Stat label="Awaiting founder" value={s?.awaitingFounder ?? 0} tone={s?.awaitingFounder ? "warn" : undefined} />
        <Stat label="Awaiting human" value={s?.awaitingHuman ?? 0} tone={s?.awaitingHuman ? "warn" : undefined} />
        <Stat label="Open breaches" value={s?.openBreaches ?? 0} tone={s?.openBreaches ? "bad" : undefined} />
        <Stat label="Completed" value={s?.completed ?? 0} tone="ok" />
      </div>
      {s && s.watchItems.length > 0 && (
        <Card className="tech-card p-3 border-yellow-500/40">
          <p className="text-xs text-yellow-300 font-semibold mb-1">Watch items</p>
          <ul className="text-xs text-yellow-200/90 list-disc pl-5">{s.watchItems.map((w,i) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <h2 className="text-sm font-semibold mt-2">Recent handoffs</h2>
      <HandoffTable rows={recent} />
      <h2 className="text-sm font-semibold mt-2">Recent breaches</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">When</th><th className="text-left p-2">Type</th><th className="text-left p-2">Severity</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Escalated</th><th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>
            {breaches.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No breaches.</td></tr>}
            {breaches.map(b => (
              <tr key={b.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(b.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{b.breach_type.replace(/_/g," ")}</td>
                <td className="p-2 capitalize">{b.severity}</td>
                <td className="p-2 max-w-[280px] truncate">{b.breach_summary ?? "—"}</td>
                <td className="p-2">{b.escalation_created ? "yes" : "no"}</td>
                <td className="p-2 capitalize">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SlaLayout>
  );
}