import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";

export default function MarketplacePerformance() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_onboarding_records").select("*").eq("onboarding_status", "active")
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Performance" subtitle="Activity, quality and listing health for active sellers.">
      <MPSection title="Active sellers">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No active sellers yet" hint="Performance metrics appear here once sellers complete onboarding and publish listings." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(s => (
              <div key={s.id} className="rounded border border-border/40 p-3 flex items-center justify-between">
                <span>Seller {s.seller_account_id?.slice(0, 8) ?? s.seller_prospect_id?.slice(0, 8) ?? "—"}</span>
                <span className="text-xs text-muted-foreground">payout {s.payout_setup_status} · listing {s.listing_setup_status}</span>
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}