import { useQuery } from "@tanstack/react-query";
import { SlaLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { listPolicies } from "@/lib/internalSla";

export default function SlaSettings() {
  const { data: policies = [] } = useQuery({ queryKey: ["sla-policies"], queryFn: listPolicies });
  return (
    <SlaLayout title="Settings & escalation rules" subtitle="Operating rules for Internal SLA tracking and the Handoff Agent.">
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Operating rules</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Internal SLA tracking and breach detection run live; nothing external is sent.</li>
          <li>Assignment to an external human requires approval if the role / access is not already provisioned.</li>
          <li>Overdue handoffs surface in the Master Work Queue and the Notification Centre.</li>
          <li>Stale approvals over the escalation threshold create an internal_sla_breach with escalation_created = true.</li>
          <li>Records are append-only / update-only; no UI delete path.</li>
          <li>All actions inherit the founder approval gates defined by source-module policies.</li>
        </ul>
      </Card>
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="text-muted-foreground">Master Work Queue · Role-Based Access · People / Ops · Approval Queue · Notification Centre · AI Agents · Command Centre · Manuals.</p>
      </Card>
      <h2 className="text-sm font-semibold mt-2">SLA policies</h2>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Name</th><th className="text-left p-2">Module</th><th className="text-left p-2">Type</th><th className="text-left p-2">Priority</th><th className="text-left p-2">Response (min)</th><th className="text-left p-2">Completion (min)</th><th className="text-left p-2">Escalation (min)</th><th className="text-left p-2">Active</th>
          </tr></thead>
          <tbody>
            {policies.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No policies configured. Defaults apply (response 60m / completion 240m / escalation 480m for normal priority).</td></tr>}
            {policies.map(p => (
              <tr key={p.id} className="border-t border-border/30">
                <td className="p-2">{p.policy_name}</td>
                <td className="p-2 text-muted-foreground">{p.source_module ?? "—"}</td>
                <td className="p-2 capitalize">{p.handoff_type ?? "—"}</td>
                <td className="p-2 capitalize">{p.priority ?? "—"}</td>
                <td className="p-2">{p.response_time_minutes ?? "—"}</td>
                <td className="p-2">{p.completion_time_minutes ?? "—"}</td>
                <td className="p-2">{p.escalation_after_minutes ?? "—"}</td>
                <td className="p-2">{p.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SlaLayout>
  );
}