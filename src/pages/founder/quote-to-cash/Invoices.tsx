import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty, statusTone } from "./_shared";

type I = { id: string; invoice_number: string | null; invoice_status: string; invoice_amount: number; currency: string; due_date: string | null; payment_provider: string | null; payment_link_url: string | null; founder_approval_required: boolean; created_at: string };

export default function QTCInvoices() {
  const [rows, setRows] = useState<I[]>([]);
  const load = () => supabase.from("qtc_invoices").select("id,invoice_number,invoice_status,invoice_amount,currency,due_date,payment_provider,payment_link_url,founder_approval_required,created_at").order("created_at",{ascending:false}).limit(200).then(r=>setRows((r.data as I[])||[]));
  useEffect(()=>{ load(); },[]);

  const setStatus = async (id: string, invoice_status: string, extra: Record<string,any> = {}) => {
    const { error } = await supabase.from("qtc_invoices").update({ invoice_status, ...extra }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Invoice → ${invoice_status}`); load(); }
  };

  return (
    <QTCLayout title="Invoices" subtitle="Drafts and approvals run live. No external provider mutation yet — the engine prepares; the founder sends.">
      {rows.length === 0 ? <QTCEmpty title="No invoices yet" hint="Invoices appear here when a quote is accepted or created manually." /> : (
        <QTCSection title={`Invoices (${rows.length})`}>
          <div className="space-y-2">
            {rows.map(i => (
              <div key={i.id} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{i.invoice_number || i.id.slice(0,8)} — {i.currency} {Math.round(i.invoice_amount||0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{i.due_date ? `due ${i.due_date}` : "no due date"}{i.payment_provider ? ` · ${i.payment_provider}` : ""}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusTone[i.invoice_status]||""}`}>{i.invoice_status}</Badge>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={i.invoice_status!=="draft"} onClick={()=>setStatus(i.id,"approval_required")}>Request approval</Button>
                  <Button size="sm" variant="outline" disabled={i.invoice_status!=="approval_required"} onClick={()=>setStatus(i.id,"approved",{ founder_approved_at: new Date().toISOString() })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={i.invoice_status!=="approved"} onClick={()=>setStatus(i.id,"sent",{ sent_at: new Date().toISOString() })}>Mark sent</Button>
                  <Button size="sm" variant="ghost" disabled={["paid","cancelled","void"].includes(i.invoice_status)} onClick={()=>setStatus(i.id,"void")}>Void</Button>
                </div>
              </div>
            ))}
          </div>
        </QTCSection>
      )}
    </QTCLayout>
  );
}