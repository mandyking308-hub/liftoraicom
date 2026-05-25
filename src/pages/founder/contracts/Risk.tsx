import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty, CTR_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsRisk() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contract_obligations")
      .select("id,contract_id,obligation_summary,risk_level,obligation_status,due_date")
      .in("risk_level", ["high", "critical"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("contract_events")
      .select("id,contract_id,event_type,event_summary,created_at")
      .eq("event_type", "risk_flag")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: any) => setEvents(data ?? []));
  }, []);

  return (
    <CTRLayout title="Risk dashboard" subtitle="High-risk clauses and obligations. Escalated to legal review before any commitment is made.">
      <CTRSection title="High-risk obligations">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No high-risk obligations" hint="The Contract Agent flags high-risk clauses here for legal review." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={CTR_RISK_TONE[r.risk_level] || ""}>{r.risk_level}</Badge>
                    <Badge variant="outline">{r.obligation_status}</Badge>
                    {r.due_date && <span className="text-muted-foreground">due {r.due_date}</span>}
                  </div>
                  <p>{r.obligation_summary}</p>
                  <p className="text-[10px] text-muted-foreground">Contract {r.contract_id?.slice(0,8)}</p>
                </div>
              ))}
            </div>
          )}
      </CTRSection>
      <CTRSection title="Risk flags timeline" description="Append-only events raised by the Contract Agent.">
        {!events ? <p className="text-xs text-muted-foreground">Loading…</p>
          : events.length === 0 ? <CTREmpty title="No risk flags yet" />
          : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="rounded border border-border/40 p-3 text-xs">
                  <p>{e.event_summary}</p>
                  <p className="text-[10px] text-muted-foreground">Contract {e.contract_id?.slice(0,8)} · {new Date(e.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
      </CTRSection>
    </CTRLayout>
  );
}