import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MarketplaceSupplyDemand() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_supply_demand_snapshots").select("*").order("created_at", { ascending: false }).limit(200)
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Supply / Demand Balance" subtitle="Detects supply gaps and demand gaps per category and location.">
      <MPSection title="Latest snapshots">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No snapshots yet" hint="The Marketplace Agent records snapshots as supply and demand signals accumulate." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-right p-2">Supply</th>
                  <th className="text-right p-2">Active sellers</th>
                  <th className="text-right p-2">Demand</th>
                  <th className="text-right p-2">Requests</th>
                  <th className="text-right p-2">Supply gap</th>
                  <th className="text-right p-2">Demand gap</th>
                  <th className="text-left p-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="border-b border-border/20">
                    <td className="p-2">{s.category ?? "—"}</td>
                    <td className="p-2">{s.location ?? "—"}</td>
                    <td className="p-2 text-right font-mono">{s.supply_count}</td>
                    <td className="p-2 text-right font-mono">{s.active_seller_count}</td>
                    <td className="p-2 text-right font-mono">{s.demand_count}</td>
                    <td className="p-2 text-right font-mono">{s.buyer_request_count}</td>
                    <td className="p-2 text-right"><Badge variant="outline" className="text-[10px]">{Number(s.supply_gap_score ?? 0).toFixed(2)}</Badge></td>
                    <td className="p-2 text-right"><Badge variant="outline" className="text-[10px]">{Number(s.demand_gap_score ?? 0).toFixed(2)}</Badge></td>
                    <td className="p-2 text-primary/90">{s.recommended_action ?? "—"}</td>
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