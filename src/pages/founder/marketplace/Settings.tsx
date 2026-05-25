import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MarketplaceSettings() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_profiles").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Marketplace Settings" subtitle="Marketplace profile, supply/demand vocabulary, commission, fees and payout model.">
      <MPSection title="Marketplaces">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No marketplace profile yet" hint="Create a marketplace_profiles row to enable the supply-side engine for a Liftor business." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(m => (
              <div key={m.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.marketplace_name}</span>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-[10px] capitalize">{m.marketplace_type}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${m.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                      {m.active ? "active" : "inactive"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supply: {m.supply_side_name ?? "—"} · Demand: {m.demand_side_name ?? "—"} · Commission: {m.commission_model ?? "—"} · Payout: {m.payout_model ?? "—"}
                </p>
                {m.seller_value_proposition && <p className="text-xs"><span className="text-muted-foreground">Seller VP:</span> {m.seller_value_proposition}</p>}
                {m.buyer_value_proposition && <p className="text-xs"><span className="text-muted-foreground">Buyer VP:</span> {m.buyer_value_proposition}</p>}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}