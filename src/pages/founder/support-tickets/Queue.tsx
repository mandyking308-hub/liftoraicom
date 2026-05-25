import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, STATUS_TONE, SEVERITY_TONE, SENTIMENT_TONE } from "./_shared";

export default function SupportQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(300)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <STLayout title="Ticket queue" subtitle="All support tickets. Replies are drafted internally; nothing goes to the customer without approval.">
      <STSection title="Tickets">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <STEmpty title="No tickets yet" hint="Tickets are created from customer interactions, transcripts, messages, or manually." /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/40">
                  <th className="py-2 pr-3">Ticket</th>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Sentiment</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">SLA due</th>
                  <th className="py-2 pr-3">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id} className="border-b border-border/30">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{t.ticket_title}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">{t.id.slice(0, 8)}</p>
                    </td>
                    <td className="py-2 pr-3">{t.source_channel}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[t.severity]}`}>{t.severity}</Badge></td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${SENTIMENT_TONE[t.sentiment]}`}>{t.sentiment}</Badge></td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${STATUS_TONE[t.ticket_status]}`}>{t.ticket_status}</Badge></td>
                    <td className="py-2 pr-3">{t.sla_due_at ? new Date(t.sla_due_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{t.assigned_to_type}{t.assigned_to ? ` · ${t.assigned_to}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </STSection>
    </STLayout>
  );
}