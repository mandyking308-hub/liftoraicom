import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty, CTR_OBL_TONE, CTR_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsObligations() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contract_obligations")
      .select("id,contract_id,obligation_summary,obligation_owner,due_date,obligation_status,risk_level")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  const now = Date.now();

  return (
    <CTRLayout title="Obligations board" subtitle="Obligations extracted from contract terms — owner, due date, status, risk. Overdue items escalate automatically.">
      <CTRSection title="All obligations">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No obligations yet" hint="Obligations will be created automatically from approved contract terms." />
          : (
            <div className="space-y-2">
              {rows.map((r) => {
                const overdue = r.due_date && new Date(r.due_date).getTime() < now && !["completed", "waived", "cancelled"].includes(r.obligation_status);
                return (
                  <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={CTR_OBL_TONE[overdue ? "overdue" : r.obligation_status] || ""}>{overdue ? "overdue" : r.obligation_status}</Badge>
                      {r.risk_level && <Badge variant="outline" className={CTR_RISK_TONE[r.risk_level] || ""}>{r.risk_level} risk</Badge>}
                      {r.obligation_owner && <span className="text-muted-foreground">owner: {r.obligation_owner}</span>}
                      {r.due_date && <span className="text-muted-foreground">due {r.due_date}</span>}
                    </div>
                    <p>{r.obligation_summary}</p>
                    <p className="text-[10px] text-muted-foreground">Contract {r.contract_id?.slice(0,8)}</p>
                  </div>
                );
              })}
            </div>
          )}
      </CTRSection>
    </CTRLayout>
  );
}