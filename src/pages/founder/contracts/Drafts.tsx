import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty, CTR_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsDrafts() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contracts")
      .select("id,contract_title,contract_type,contract_status,value_amount,currency,created_at,legal_review_required,founder_approval_required")
      .in("contract_status", ["draft", "review_required", "approval_required"])
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CTRLayout title="Drafts & review queue" subtitle="Internally-prepared contracts awaiting legal review or founder approval. Nothing leaves Liftor without explicit approval.">
      <CTRSection title="Drafts in review">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No drafts in review" hint="Contracts prepared by the Contract Agent or attached from Quote-to-Cash will appear here for legal review and founder approval." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={CTR_STATUS_TONE[r.contract_status] || ""}>{r.contract_status}</Badge>
                    <span className="font-medium">{r.contract_title}</span>
                    <Badge variant="outline">{r.contract_type}</Badge>
                    {r.value_amount != null && <span className="text-muted-foreground">{r.currency || "GBP"} {Number(r.value_amount).toFixed(2)}</span>}
                    {r.legal_review_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">legal review</Badge>}
                    {r.founder_approval_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">founder approval</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Created {new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
      </CTRSection>
    </CTRLayout>
  );
}