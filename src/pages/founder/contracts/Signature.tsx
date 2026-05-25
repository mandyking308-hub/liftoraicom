import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty, CTR_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsSignature() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contracts")
      .select("id,contract_title,contract_type,contract_status,signed_at,start_date,end_date,created_at")
      .in("contract_status", ["approved", "sent", "signed", "active"])
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CTRLayout title="Signature status" subtitle="Contracts approved internally and tracked through sending, signature and activation. No signature provider call is made automatically.">
      <CTRSection title="Awaiting & completed signatures">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No contracts at signature stage" hint="Once a draft is approved, signature status appears here." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={CTR_STATUS_TONE[r.contract_status] || ""}>{r.contract_status}</Badge>
                    <span className="font-medium">{r.contract_title}</span>
                    <Badge variant="outline">{r.contract_type}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {r.start_date ? `Start ${r.start_date}` : ""}{r.end_date ? ` · End ${r.end_date}` : ""}{r.signed_at ? ` · Signed ${new Date(r.signed_at).toLocaleString()}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </CTRSection>
    </CTRLayout>
  );
}