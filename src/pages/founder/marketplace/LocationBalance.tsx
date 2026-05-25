import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { LiquidityRow } from "@/lib/marketplaceGrowthEngine";

export default function LocationBalance() {
  const [rows, setRows] = useState<LiquidityRow[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_liquidity_scores")
      .select("*").order("created_at", { ascending: false }).limit(500)
      .then((r: any) => setRows(r.data ?? []));
  }, []);

  const grouped: Record<string, { supply: number; demand: number; matched: number; failed: number; cells: number }> = {};
  (rows ?? []).forEach(r => {
    const k = r.location ?? "(no location)";
    const g = grouped[k] ?? { supply: 0, demand: 0, matched: 0, failed: 0, cells: 0 };
    g.supply += r.active_supply; g.demand += r.active_demand;
    g.matched += r.matched_transactions; g.failed += r.failed_matches;
    g.cells += 1;
    grouped[k] = g;
  });
  const items = Object.entries(grouped).sort((a, b) => b[1].demand + b[1].supply - (a[1].demand + a[1].supply));

  return (
    <MPLayout title="Location balance" subtitle="Supply vs demand per location — decide new geographies or growth caps.">
      <MPSection title="Locations">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
         items.length === 0 ? <MPEmpty title="No location data" hint="Record liquidity snapshots with location labels to see this view." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border/40">
                <th className="text-left p-2">Location</th>
                <th className="text-right p-2">Cells</th>
                <th className="text-right p-2">Supply</th>
                <th className="text-right p-2">Demand</th>
                <th className="text-right p-2">Matched</th>
                <th className="text-right p-2">Failed</th>
                <th className="text-left p-2">Recommendation</th>
              </tr></thead>
              <tbody>
                {items.map(([loc, g]) => {
                  const rec = g.supply === 0 && g.demand === 0 ? "Skip / cold start" :
                              g.supply < g.demand * 0.6 ? "Recruit sellers in location" :
                              g.demand < g.supply * 0.6 ? "Marketing push in location" :
                              "Balanced";
                  return (
                    <tr key={loc} className="border-b border-border/20">
                      <td className="p-2 font-medium">{loc}</td>
                      <td className="p-2 text-right font-mono">{g.cells}</td>
                      <td className="p-2 text-right font-mono">{g.supply}</td>
                      <td className="p-2 text-right font-mono">{g.demand}</td>
                      <td className="p-2 text-right font-mono">{g.matched}</td>
                      <td className="p-2 text-right font-mono">{g.failed}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{rec}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
         )}
      </MPSection>
    </MPLayout>
  );
}