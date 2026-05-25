import { useEffect, useState } from "react";
import { CMPLayout, CMPSection, CMPEmpty, CMP_STATUS_TONE, CMP_SEVERITY_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ComplaintsDisputes() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("complaint_cases")
      .select("id,complaint_type,complaint_status,severity,complaint_summary,requested_resolution,proposed_resolution,created_at")
      .in("complaint_type", ["dispute", "chargeback", "legal"])
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CMPLayout title="Disputes & chargebacks" subtitle="Higher-risk cases. Evidence packs collected internally; responses to providers and customers remain approval-gated.">
      <CMPSection title="Active disputes">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CMPEmpty title="No disputes" hint="Chargebacks and legal disputes will appear here for evidence collection and founder response." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={CMP_STATUS_TONE[r.complaint_status] || ""}>{r.complaint_status}</Badge>
                    <Badge variant="outline" className={CMP_SEVERITY_TONE[r.severity] || ""}>{r.severity}</Badge>
                    <span className="font-medium">{r.complaint_type}</span>
                  </div>
                  {r.complaint_summary && <p>{r.complaint_summary}</p>}
                  {r.requested_resolution && <p className="text-muted-foreground">Requested: {r.requested_resolution}</p>}
                  {r.proposed_resolution && <p className="text-muted-foreground">Proposed (draft): {r.proposed_resolution}</p>}
                </div>
              ))}
            </div>
          )}
      </CMPSection>
    </CMPLayout>
  );
}