import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty, NoExternalActionBanner } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const statusTone: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  verified: "bg-primary/15 text-primary border-primary/30",
  invited: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  applying: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  paused: "bg-muted text-muted-foreground border-border/60",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  offboarded: "bg-muted text-muted-foreground border-border/60",
  draft: "bg-muted text-muted-foreground border-border/60",
};

export default function SellerAccounts() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_accounts").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Accounts" subtitle="Master record per seller. Activation, suspension and offboarding require approval.">
      <NoExternalActionBanner />
      <MPSection title="Accounts">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No seller accounts yet" hint="Accounts appear here once a prospect is invited or applies." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Seller</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Terms</th>
                  <th className="text-left p-2">Payout</th>
                  <th className="text-right p-2">Rating</th>
                  <th className="text-right p-2">Fulfilment</th>
                  <th className="text-right p-2">Response</th>
                  <th className="text-right p-2">Disputes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{s.seller_name}</td>
                    <td className="p-2">{s.seller_category ?? "—"}</td>
                    <td className="p-2">{s.seller_location ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusTone[s.seller_status] ?? ""}`}>{s.seller_status}</Badge></td>
                    <td className="p-2">{s.terms_status}</td>
                    <td className="p-2">{s.payout_status}</td>
                    <td className="p-2 text-right font-mono">{Number(s.seller_rating ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(s.fulfilment_score ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(s.response_time_score ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{(Number(s.dispute_rate ?? 0) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}