import { useEffect, useState } from "react";
import { CMPLayout, CMPSection, CMPEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ComplaintsEvidence() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("dispute_evidence")
      .select("id,complaint_case_id,evidence_type,evidence_summary,evidence_url,created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CMPLayout title="Dispute evidence pack" subtitle="Collected internally by the Complaints Agent. Used to build defensible responses to disputes, chargebacks and legal queries.">
      <CMPSection title="Evidence items">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CMPEmpty title="No evidence collected yet" hint="Payment proofs, delivery confirmations, transcripts, contracts, screenshots and notes attached to complaint cases appear here." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.evidence_type}</Badge>
                    {r.evidence_url && <a href={r.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">open source</a>}
                  </div>
                  {r.evidence_summary && <p className="text-muted-foreground">{r.evidence_summary}</p>}
                  <p className="text-[10px] text-muted-foreground">Case {r.complaint_case_id?.slice(0,8)} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
      </CMPSection>
    </CMPLayout>
  );
}