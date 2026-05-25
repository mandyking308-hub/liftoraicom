import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, SEVERITY_TONE, STATUS_TONE } from "./_shared";

export default function SupportSLA() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from("support_tickets").select("*").not("sla_due_at", "is", null).order("sla_due_at", { ascending: true }).limit(300),
      supabase.from("support_sla_policies").select("*").order("severity"),
    ]).then(([t, p]) => { setTickets(t.data || []); setPolicies(p.data || []); setLoading(false); });
  }, []);

  const now = Date.now();

  return (
    <STLayout title="SLA board" subtitle="Tickets ranked by deadline. Overdue and at-risk tickets surface to the top.">
      <STSection title="Tickets by SLA">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          tickets.length === 0 ? <STEmpty title="No tickets with SLA deadlines" /> :
          <ul className="text-xs space-y-2">
            {tickets.map(t => {
              const due = new Date(t.sla_due_at).getTime();
              const overdue = due < now;
              const at_risk = !overdue && due - now < 1000 * 60 * 60;
              return (
                <li key={t.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[t.severity]}`}>{t.severity}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[t.ticket_status]}`}>{t.ticket_status}</Badge>
                  <span className="font-medium">{t.ticket_title}</span>
                  <span className={`ml-auto ${overdue ? "text-red-400" : at_risk ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {overdue ? "OVERDUE · " : at_risk ? "AT RISK · " : ""}due {new Date(t.sla_due_at).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        }
      </STSection>

      <STSection title={`SLA policies (${policies.length})`} description="Per-severity response, resolution and escalation time targets.">
        {policies.length === 0 ? <STEmpty title="No SLA policies configured" hint="Add policies per severity to enable deadline tracking." /> :
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left border-b border-border/40">
                <th className="py-2 pr-3">Policy</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Response</th>
                <th className="py-2 pr-3">Resolution</th>
                <th className="py-2 pr-3">Escalation</th>
                <th className="py-2 pr-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="py-2 pr-3">{p.policy_name}</td>
                  <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[p.severity]}`}>{p.severity}</Badge></td>
                  <td className="py-2 pr-3">{p.response_time_minutes}m</td>
                  <td className="py-2 pr-3">{p.resolution_time_minutes}m</td>
                  <td className="py-2 pr-3">{p.escalation_after_minutes}m</td>
                  <td className="py-2 pr-3">{p.active ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </STSection>
    </STLayout>
  );
}