import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, SEVERITY_TONE, SENTIMENT_TONE } from "./_shared";

export default function SupportEscalations() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("support_tickets").select("*").or("ticket_status.eq.escalated,severity.eq.critical,sentiment.in.(angry,vulnerable)")
      .order("created_at", { ascending: false }).limit(200)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <STLayout title="Escalations" subtitle="Vulnerable, angry, legal, refund, payment and complaint cases. Founder review required before any customer-facing action.">
      <STSection title={`Active escalations (${rows.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <STEmpty title="No escalations" /> :
          <ul className="text-xs space-y-2">
            {rows.map(t => (
              <li key={t.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[t.severity]}`}>{t.severity}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${SENTIMENT_TONE[t.sentiment]}`}>{t.sentiment}</Badge>
                  {t.issue_type && <Badge variant="outline" className="text-[10px]">{t.issue_type}</Badge>}
                  <span className="font-medium">{t.ticket_title}</span>
                </div>
                {t.ticket_description && <p className="text-muted-foreground line-clamp-2">{t.ticket_description}</p>}
              </li>
            ))}
          </ul>
        }
      </STSection>
    </STLayout>
  );
}