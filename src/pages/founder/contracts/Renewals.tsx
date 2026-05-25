import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty, CTR_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsRenewals() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contracts")
      .select("id,contract_title,contract_type,contract_status,renewal_date,end_date,value_amount,currency")
      .or("renewal_date.not.is.null,end_date.not.is.null")
      .order("renewal_date", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CTRLayout title="Renewal calendar" subtitle="Upcoming renewals and expirations. Renewal preparation runs live; renewal commitments require founder approval.">
      <CTRSection title="Renewals & expirations">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No renewal dates set" hint="Set renewal and end dates on contracts to populate the calendar." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={CTR_STATUS_TONE[r.contract_status] || ""}>{r.contract_status}</Badge>
                    <span className="font-medium">{r.contract_title}</span>
                    <Badge variant="outline">{r.contract_type}</Badge>
                    {r.value_amount != null && <span className="text-muted-foreground">{r.currency || "GBP"} {Number(r.value_amount).toFixed(2)}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {r.renewal_date ? `Renewal ${r.renewal_date}` : ""}{r.end_date ? ` · End ${r.end_date}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </CTRSection>
    </CTRLayout>
  );
}