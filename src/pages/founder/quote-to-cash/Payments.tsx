import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty, statusTone } from "./_shared";

type P = {
  id: string; payment_status: string;
  amount: number; gross_amount: number | null; tax_amount: number | null; stripe_fee_amount: number | null; net_amount: number | null;
  currency: string; provider_name: string | null; payment_method: string | null; received_at: string | null;
  confirmed_revenue: boolean; sale_ready: boolean | null; is_test_data: boolean | null;
  business_name_snapshot: string | null; brand_name: string | null; saleable_asset_group: string | null;
  legal_entity: string | null; payout_account_status: string | null;
  temporary_payout_account_used: boolean | null; temporary_payout_reason: string | null; transfer_required_to_primary_account: boolean | null;
  created_at: string;
};

export default function QTCPayments() {
  const [rows, setRows] = useState<P[]>([]);
  const load = () => supabase.from("qtc_payments").select("id,payment_status,amount,gross_amount,tax_amount,stripe_fee_amount,net_amount,currency,provider_name,payment_method,received_at,confirmed_revenue,sale_ready,is_test_data,business_name_snapshot,brand_name,saleable_asset_group,legal_entity,payout_account_status,temporary_payout_account_used,temporary_payout_reason,transfer_required_to_primary_account,created_at").order("created_at",{ascending:false}).limit(200).then(r=>setRows((r.data as P[])||[]));
  useEffect(()=>{ load(); },[]);

  const mark = async (id: string, payment_status: string) => {
    const { error } = await supabase.from("qtc_payments").update({ payment_status, received_at: payment_status==="succeeded" ? new Date().toISOString() : null }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Payment → ${payment_status}`); load(); }
  };

  return (
    <QTCLayout title="Payments" subtitle="Marking a payment 'succeeded' writes a confirmed revenue row and marks the invoice paid. Test rows and rows lacking business / legal entity are excluded from sale-ready totals. No external Stripe mutation occurs.">
      {rows.length === 0 ? <QTCEmpty title="No payments yet" /> : (
        <QTCSection title={`Payments (${rows.length})`}>
          <div className="space-y-2">
            {rows.map(p => (
              <div key={p.id} className={`p-3 rounded border text-xs space-y-1 ${p.is_test_data ? "border-yellow-500/40 bg-yellow-500/5" : "border-border/50"}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">
                      {p.business_name_snapshot || "— unassigned business —"}
                      {p.brand_name && <span className="text-muted-foreground"> · {p.brand_name}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      legal: {p.legal_entity || "missing"} · payout: {p.payout_account_status || "not_configured"}
                      {p.saleable_asset_group && <> · group: {p.saleable_asset_group}</>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      gross {p.currency} {Math.round(Number(p.gross_amount ?? p.amount) || 0).toLocaleString()} · tax {Math.round(Number(p.tax_amount)||0).toLocaleString()} · fees {Math.round(Number(p.stripe_fee_amount)||0).toLocaleString()} · net {Math.round(Number(p.net_amount)||0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.provider_name || "no provider"} · {p.payment_method || "—"} · {p.received_at ? new Date(p.received_at).toLocaleString() : "not received"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${statusTone[p.payment_status]||""}`}>{p.payment_status}</Badge>
                    {p.confirmed_revenue && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">revenue confirmed</Badge>}
                    {p.sale_ready
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">sale-ready</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">not sale-ready</Badge>}
                    {p.is_test_data && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
                    {p.temporary_payout_account_used && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">temp payout</Badge>}
                    {p.transfer_required_to_primary_account && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">transfer pending</Badge>}
                  </div>
                </div>
                {p.temporary_payout_account_used && (
                  <p className="text-[11px] text-orange-400">
                    ⚠ Funds temporarily held{p.temporary_payout_reason ? ` (${p.temporary_payout_reason})` : ""} — must be reconciled and transferred to the primary GSM account.
                  </p>
                )}
                {!p.legal_entity && (
                  <p className="text-[11px] text-yellow-400">⚠ Legal entity missing — defaulted to GSM_LLC; confirm before sale evidence pack.</p>
                )}
                {!p.business_name_snapshot && (
                  <p className="text-[11px] text-red-400">⚠ business_id missing — this payment cannot be marked sale-ready.</p>
                )}
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