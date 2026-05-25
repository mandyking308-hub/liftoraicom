import { useEffect, useState } from "react";
import { CMPLayout, CMPSection, CMPEmpty, CMP_STATUS_TONE, CMP_SEVERITY_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ComplaintsEscalations() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("complaint_cases")
      .select("id,complaint_type,complaint_status,severity,customer_sentiment,complaint_summary,created_at")
      .or("complaint_status.eq.escalated,severity.eq.critical")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CMPLayout title="Escalations" subtitle="Critical or escalated complaints requiring founder decision. Legal/compliance risk is surfaced here first.">
      <CMPSection title="Escalated & critical cases">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CMPEmpty title="No escalations" hint="Critical or escalated complaints appear here for immediate founder decision." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={CMP_STATUS_TONE[r.complaint_status] || ""}>{r.complaint_status}</Badge>
                    <Badge variant="outline" className={CMP_SEVERITY_TONE[r.severity] || ""}>{r.severity}</Badge>
                    <span>{r.complaint_type}</span>
                    {r.customer_sentiment && <span className="text-muted-foreground">sentiment: {r.customer_sentiment}</span>}
                  </div>
                  {r.complaint_summary && <p>{r.complaint_summary}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
      </CMPSection>
    </CMPLayout>
  );
}