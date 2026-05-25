import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty, statusTone } from "./_shared";

type Q = { id: string; quote_number: string | null; quote_status: string; total_amount: number; currency: string; validity_until: string | null; founder_approval_required: boolean; created_at: string };

export default function QTCQuotes() {
  const [rows, setRows] = useState<Q[]>([]);
  const load = () => supabase.from("qtc_quotes").select("id,quote_number,quote_status,total_amount,currency,validity_until,founder_approval_required,created_at").order("created_at",{ascending:false}).limit(200).then(r=>setRows((r.data as Q[])||[]));
  useEffect(()=>{ load(); },[]);

  const setStatus = async (id: string, quote_status: string, extra: Record<string,any> = {}) => {
    const { error } = await supabase.from("qtc_quotes").update({ quote_status, ...extra }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Quote → ${quote_status}`); load(); }
  };

  return (
    <QTCLayout title="Quotes" subtitle="Drafts are prepared live. Approval and send remain founder-gated. No external send.">
      {rows.length === 0 ? <QTCEmpty title="No quotes yet" hint="Quotes are created from the Customer Sales Close Engine or directly here." /> : (
        <QTCSection title={`Quotes (${rows.length})`}>
          <div className="space-y-2">
            {rows.map(q => (
              <div key={q.id} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{q.quote_number || q.id.slice(0,8)} — {q.currency} {Math.round(q.total_amount||0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{q.validity_until ? `valid until ${new Date(q.validity_until).toLocaleDateString()}` : "no validity"} · created {new Date(q.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusTone[q.quote_status]||""}`}>{q.quote_status}</Badge>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={q.quote_status!=="draft"} onClick={()=>setStatus(q.id,"approval_required")}>Request approval</Button>
                  <Button size="sm" variant="outline" disabled={q.quote_status!=="approval_required"} onClick={()=>setStatus(q.id,"approved",{ founder_approved_at: new Date().toISOString() })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={q.quote_status!=="approved"} onClick={()=>setStatus(q.id,"sent",{ sent_at: new Date().toISOString() })}>Mark sent</Button>
                  <Button size="sm" variant="outline" disabled={q.quote_status!=="sent"} onClick={()=>setStatus(q.id,"accepted",{ accepted_at: new Date().toISOString() })}>Mark accepted</Button>
                  <Button size="sm" variant="ghost" disabled={["rejected","cancelled","accepted"].includes(q.quote_status)} onClick={()=>setStatus(q.id,"rejected")}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </QTCSection>
      )}
    </QTCLayout>
  );
}