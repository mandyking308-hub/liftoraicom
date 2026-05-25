import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty, statusTone } from "./_shared";

type P = { id: string; payment_status: string; amount: number; currency: string; provider_name: string | null; payment_method: string | null; received_at: string | null; confirmed_revenue: boolean; created_at: string };

export default function QTCPayments() {
  const [rows, setRows] = useState<P[]>([]);
  const load = () => supabase.from("qtc_payments").select("id,payment_status,amount,currency,provider_name,payment_method,received_at,confirmed_revenue,created_at").order("created_at",{ascending:false}).limit(200).then(r=>setRows((r.data as P[])||[]));
  useEffect(()=>{ load(); },[]);

  const mark = async (id: string, payment_status: string) => {
    const { error } = await supabase.from("qtc_payments").update({ payment_status, received_at: payment_status==="succeeded" ? new Date().toISOString() : null }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Payment → ${payment_status}`); load(); }
  };

  return (
    <QTCLayout title="Payments" subtitle="Marking a payment 'succeeded' writes a confirmed revenue row and marks the invoice paid (trigger qtc_on_payment_succeeded). Test rows are excluded.">
      {rows.length === 0 ? <QTCEmpty title="No payments yet" /> : (
        <QTCSection title={`Payments (${rows.length})`}>
          <div className="space-y-2">
            {rows.map(p => (
              <div key={p.id} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{p.currency} {Math.round(p.amount||0).toLocaleString()} {p.provider_name && <span className="text-muted-foreground">via {p.provider_name}</span>}</p>
                    <p className="text-[11px] text-muted-foreground">{p.payment_method || "—"} · {p.received_at ? new Date(p.received_at).toLocaleString() : "not received"}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className={`text-[10px] ${statusTone[p.payment_status]||""}`}>{p.payment_status}</Badge>
                    {p.confirmed_revenue && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">revenue confirmed</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={p.payment_status==="succeeded"} onClick={()=>mark(p.id,"succeeded")}>Mark succeeded</Button>
                  <Button size="sm" variant="ghost" disabled={p.payment_status==="failed"} onClick={()=>mark(p.id,"failed")}>Mark failed</Button>
                  <Button size="sm" variant="ghost" disabled={p.payment_status==="refunded"} onClick={()=>mark(p.id,"refunded")}>Mark refunded</Button>
                </div>
              </div>
            ))}
          </div>
        </QTCSection>
      )}
    </QTCLayout>
  );
}