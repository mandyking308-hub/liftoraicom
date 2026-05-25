import { useEffect, useState } from "react";
import { VNDLayout, VNDSection, VNDEmpty, VND_SUB_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsRenewals() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendor_subscriptions")
      .select("id,subscription_name,subscription_status,renewal_date,cancellation_deadline,monthly_cost,annual_cost,currency,owner")
      .or("renewal_date.not.is.null,cancellation_deadline.not.is.null")
      .order("renewal_date", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <VNDLayout title="Renewal calendar" subtitle="Upcoming renewals and cancellation deadlines. Cancellations require founder approval — never sent automatically.">
      <VNDSection title="Renewals & cancellation deadlines">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <VNDEmpty title="No renewal or cancellation dates set" hint="Set renewal_date or cancellation_deadline on a subscription to schedule a warning." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={VND_SUB_TONE[r.subscription_status] || ""}>{r.subscription_status.replace("_", " ")}</Badge>
                    <span className="font-medium">{r.subscription_name}</span>
                    {r.monthly_cost != null && <span className="text-muted-foreground">{r.currency || "GBP"} {Number(r.monthly_cost).toFixed(2)}/mo</span>}
                    {r.owner && <span className="text-muted-foreground">owner: {r.owner}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {r.renewal_date ? `Renews ${r.renewal_date}` : ""}{r.cancellation_deadline ? ` · Cancel by ${r.cancellation_deadline}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </VNDSection>
    </VNDLayout>
  );
}