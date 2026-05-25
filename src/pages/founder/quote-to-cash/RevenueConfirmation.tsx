import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { QTCLayout, QTCSection, QTCStat, QTCEmpty } from "./_shared";

type R = { id: string; revenue_amount: number; currency: string; revenue_type: string; confirmation_source: string; confirmed_at: string };

export default function QTCRevenueConfirmation() {
  const [rows, setRows] = useState<R[]>([]);
  useEffect(()=>{ supabase.from("qtc_revenue_confirmations").select("id,revenue_amount,currency,revenue_type,confirmation_source,confirmed_at").order("confirmed_at",{ascending:false}).limit(200).then(r=>setRows((r.data as R[])||[])); },[]);

  const total = rows.reduce((s,r)=>s+Number(r.revenue_amount||0),0);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTotal = rows.filter(r=>new Date(r.confirmed_at)>=today).reduce((s,r)=>s+Number(r.revenue_amount||0),0);

  return (
    <QTCLayout title="Revenue confirmation" subtitle="Confirmed revenue only — every row is backed by a verified payment, invoice paid event, or signed contract. Test rows are excluded by trigger.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <QTCStat label="Confirmed today" value={`$${Math.round(todayTotal).toLocaleString()}`} tone="good" />
        <QTCStat label="Confirmed total" value={`$${Math.round(total).toLocaleString()}`} tone="good" />
        <QTCStat label="Confirmations" value={rows.length} />
      </div>
      {rows.length === 0 ? <QTCEmpty title="No confirmed revenue yet" hint="Confirmations appear when a payment succeeds, an invoice is marked paid, or a contract is signed." /> : (
        <QTCSection title="Confirmation log">
          <ul className="text-xs space-y-1">
            {rows.map(r => (
              <li key={r.id} className="flex justify-between border-b border-border/40 py-1">
                <span>{r.currency} {Math.round(r.revenue_amount||0).toLocaleString()} <Badge variant="outline" className="ml-2 text-[10px]">{r.revenue_type}</Badge> <Badge variant="outline" className="ml-1 text-[10px]">{r.confirmation_source}</Badge></span>
                <span className="text-muted-foreground">{new Date(r.confirmed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </QTCSection>
      )}
    </QTCLayout>
  );
}