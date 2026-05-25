import { useEffect, useState } from "react";
import { VNDLayout, VNDSection, VNDEmpty, VND_SUB_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsSaas() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendor_subscriptions")
      .select("id,subscription_name,subscription_status,monthly_cost,annual_cost,currency,renewal_date,cancellation_deadline,owner,login_method_summary,payment_method_summary,vendor_id")
      .order("subscription_name")
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <VNDLayout title="SaaS subscriptions" subtitle="Every SaaS / API subscription tracked with cost, owner, login method, renewal and cancellation deadline. Activation of paid subs requires founder approval.">
      <VNDSection title="Subscriptions">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <VNDEmpty title="No subscriptions recorded" hint="Add a subscription to begin cost, renewal and access tracking." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={VND_SUB_TONE[r.subscription_status] || ""}>{r.subscription_status.replace("_", " ")}</Badge>
                    <span className="font-medium">{r.subscription_name}</span>
                    {r.monthly_cost != null && <span className="text-muted-foreground">{r.currency || "GBP"} {Number(r.monthly_cost).toFixed(2)}/mo</span>}
                    {r.annual_cost != null && <span className="text-muted-foreground">{r.currency || "GBP"} {Number(r.annual_cost).toFixed(2)}/yr</span>}
                  </div>
                  <p className="text-muted-foreground">
                    {r.owner ? `owner: ${r.owner}` : <span className="text-yellow-400">owner missing</span>}
                    {" · "}
                    {r.payment_method_summary ? `pay: ${r.payment_method_summary}` : <span className="text-yellow-400">payment method missing</span>}
                    {r.login_method_summary ? ` · login: ${r.login_method_summary}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.renewal_date ? `Renewal ${r.renewal_date}` : ""}{r.cancellation_deadline ? ` · Cancel by ${r.cancellation_deadline}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </VNDSection>
    </VNDLayout>
  );
}