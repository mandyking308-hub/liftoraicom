import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function MarketplaceListings() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_listings").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Listing Approval Board" subtitle="Listings draft live. Publishing requires founder approval.">
      <MPSection title="Listings">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No listings yet" hint="Seller listings drafted by the agent or imported from sellers appear here." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(l => (
              <div key={l.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{l.listing_title}</span>
                  <div className="flex gap-2 items-center">
                    {l.founder_approval_required && <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400"><Lock size={9}/> approval</span>}
                    <Badge variant="outline" className="text-[10px]">{l.listing_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.category ?? "—"} · {l.location ?? "—"} · {l.price_type} {l.price_amount ? `${l.price_currency} ${l.price_amount}` : ""} · quality {Number(l.quality_score ?? 0).toFixed(2)}
                </p>
                {Array.isArray(l.risk_flags) && l.risk_flags.length > 0 && (
                  <p className="text-xs text-yellow-400">Risk: {l.risk_flags.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}