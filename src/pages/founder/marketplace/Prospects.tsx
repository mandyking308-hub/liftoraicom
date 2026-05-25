import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function MarketplaceProspects() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_prospects").select("*").order("fit_score", { ascending: false }).limit(200)
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Prospects" subtitle="Pipeline of researched sellers/providers. Outreach locked until founder approval.">
      <MPSection title="Pipeline">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No prospects yet" hint="Import or add seller prospects to start qualification scoring." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Fit</th>
                  <th className="text-right p-2">Quality</th>
                  <th className="text-right p-2">Reputation</th>
                  <th className="text-right p-2">Capacity</th>
                  <th className="text-left p-2">External</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{p.prospect_name}</td>
                    <td className="p-2 capitalize">{p.prospect_type}</td>
                    <td className="p-2">{p.category ?? "—"}</td>
                    <td className="p-2">{p.location ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.qualification_status}</Badge></td>
                    <td className="p-2 text-right font-mono">{Number(p.fit_score ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(p.supply_quality_score ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(p.reputation_score ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(p.capacity_score ?? 0).toFixed(2)}</td>
                    <td className="p-2">{p.external_action_locked ? <span className="inline-flex items-center gap-1 text-yellow-400"><Lock size={10}/> locked</span> : <span className="text-emerald-400">unlocked</span>}</td>
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