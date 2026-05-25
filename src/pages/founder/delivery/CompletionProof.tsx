import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DLLayout, DLSection, DLEmpty } from "./_shared";

export default function DeliveryCompletionProof() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("delivery_completion_proof").select("*").order("created_at", { ascending: false }).limit(200)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <DLLayout title="Completion proof" subtitle="Verifiable proof per delivery: files, notes, links, screenshots, customer or payment confirmation.">
      <DLSection title="Recent proof entries">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <DLEmpty title="No completion proof recorded yet" hint="Proof is added on delivery and verified by founder or assigned reviewer." /> :
          <ul className="space-y-2 text-xs">
            {rows.map(p => (
              <li key={p.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{p.proof_type}</Badge>
                  {p.customer_confirmed && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">customer confirmed</Badge>}
                  {p.verified_at && <Badge variant="outline" className="text-[10px]">verified {new Date(p.verified_at).toLocaleDateString()}</Badge>}
                </div>
                {p.proof_summary && <p>{p.proof_summary}</p>}
                {p.proof_url && <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{p.proof_url}</a>}
              </li>
            ))}
          </ul>
        }
      </DLSection>
    </DLLayout>
  );
}