import { useEffect, useState } from "react";
import { CMPLayout, CMPSection, CMPEmpty, CMP_REFUND_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ComplaintsRefunds() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("refund_requests")
      .select("id,refund_status,amount_requested,amount_approved,currency,refund_reason,policy_match,founder_approved_at,processed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CMPLayout title="Refund queue" subtitle="Every refund creates a founder approval item before any payment-provider mutation. Nothing here is processed automatically.">
      <CMPSection title="Refund requests" description="Requested, reviewing and approval-required refunds. Policy match is checked by the Complaints Agent.">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CMPEmpty title="No refund requests yet" hint="Refund requests will appear here when raised from a complaint case or detected by the Complaints Agent." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={CMP_REFUND_TONE[r.refund_status] || ""}>{r.refund_status}</Badge>
                    <span className="font-medium">{r.currency || "GBP"} {Number(r.amount_requested ?? 0).toFixed(2)}</span>
                    {r.amount_approved != null && <span className="text-muted-foreground">approved: {Number(r.amount_approved).toFixed(2)}</span>}
                    {r.policy_match && <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">policy: {r.policy_match}</Badge>}
                  </div>
                  {r.refund_reason && <p className="text-muted-foreground">{r.refund_reason}</p>}
                  <p className="text-[10px] text-muted-foreground">Created {new Date(r.created_at).toLocaleString()}{r.founder_approved_at ? ` · approved ${new Date(r.founder_approved_at).toLocaleString()}` : ""}{r.processed_at ? ` · processed ${new Date(r.processed_at).toLocaleString()}` : ""}</p>
                </div>
              ))}
            </div>
          )}
      </CMPSection>
    </CMPLayout>
  );
}