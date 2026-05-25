import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MarketplaceOnboarding() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_onboarding_records").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Onboarding" subtitle="Onboarding checklist runs live. Account creation, contracts and payout setup require approval.">
      <MPSection title="Records">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No onboarding in progress" hint="Once a prospect accepts an invite, the agent creates a checklist here." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(r => (
              <div key={r.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Onboarding · {r.onboarding_status}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">payout: {r.payout_setup_status}</Badge>
                    <Badge variant="outline" className="text-[10px]">listing: {r.listing_setup_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  terms accepted: {r.terms_accepted ? "yes" : "no"} · verification: {r.verification_status}
                </p>
                {Array.isArray(r.missing_information) && r.missing_information.length > 0 && (
                  <p className="text-xs text-yellow-400">Missing: {r.missing_information.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}