import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { QTCLayout, QTCSection, QTCStat, QTCEmpty } from "./_shared";

type R = { id: string; revenue_amount: number; currency: string; revenue_type: string; confirmation_source: string; confirmed_at: string; business_name_snapshot: string | null; brand_name: string | null; legal_entity: string | null; sale_ready: boolean | null; is_test_data: boolean | null; stripe_verified: boolean | null; stripe_event_id: string | null };

export default function QTCRevenueConfirmation() {
  const [rows, setRows] = useState<R[]>([]);
  useEffect(()=>{ supabase.from("qtc_revenue_confirmations").select("id,revenue_amount,currency,revenue_type,confirmation_source,confirmed_at,business_name_snapshot,brand_name,legal_entity,sale_ready,is_test_data,stripe_verified,stripe_event_id").order("confirmed_at",{ascending:false}).limit(200).then(r=>setRows((r.data as R[])||[])); },[]);

  const live = rows.filter(r => !r.is_test_data);
  const total = live.reduce((s,r)=>s+Number(r.revenue_amount||0),0);
  const saleReady = live.filter(r=>r.sale_ready).reduce((s,r)=>s+Number(r.revenue_amount||0),0);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTotal = live.filter(r=>new Date(r.confirmed_at)>=today).reduce((s,r)=>s+Number(r.revenue_amount||0),0);

  return (
    <QTCLayout title="Revenue confirmation" subtitle="Confirmed revenue only — every row is backed by a verified payment, invoice paid event, or signed contract. Test rows are excluded by trigger.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QTCStat label="Confirmed today" value={`$${Math.round(todayTotal).toLocaleString()}`} tone="good" />
        <QTCStat label="Confirmed total" value={`$${Math.round(total).toLocaleString()}`} tone="good" />
        <QTCStat label="Sale-ready total" value={`$${Math.round(saleReady).toLocaleString()}`} tone="good" hint="Backed by business_id + legal entity, non-test, fully transferred." />
        <QTCStat label="Confirmations" value={rows.length} />
      </div>
      {rows.length === 0 ? <QTCEmpty title="No confirmed revenue yet" hint="Confirmations appear when a payment succeeds, an invoice is marked paid, or a contract is signed." /> : (
        <QTCSection title="Confirmation log">
          <ul className="text-xs space-y-1">
            {rows.map(r => (
              <li key={r.id} className={`flex justify-between gap-2 border-b border-border/40 py-1 ${r.is_test_data ? "opacity-60" : ""}`}>
                <span className="min-w-0">
                  <span className="font-medium">{r.business_name_snapshot || "— unassigned —"}</span>
                  {r.brand_name && <span className="text-muted-foreground"> · {r.brand_name}</span>}
                  <span className="text-muted-foreground"> · {r.legal_entity || "GSM_LLC"}</span>
                  <br/>
                  {r.currency} {Math.round(r.revenue_amount||0).toLocaleString()}
                  <Badge variant="outline" className="ml-2 text-[10px]">{r.revenue_type}</Badge>
                  <Badge variant="outline" className="ml-1 text-[10px]">{r.confirmation_source}</Badge>
                  {r.sale_ready
                    ? <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">sale-ready</Badge>
                    : <Badge variant="outline" className="ml-1 text-[10px] bg-muted text-muted-foreground">not sale-ready</Badge>}
                  {r.stripe_verified
                    ? <Badge variant="outline" className="ml-1 text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">stripe-verified</Badge>
                    : <Badge variant="outline" className="ml-1 text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">manual</Badge>}
                  {r.is_test_data && <Badge variant="outline" className="ml-1 text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
                </span>
                <span className="text-muted-foreground shrink-0">{new Date(r.confirmed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </QTCSection>
      )}
    </QTCLayout>
  );
}