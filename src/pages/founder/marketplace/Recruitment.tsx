import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MarketplaceRecruitment() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_recruitment_campaigns").select("*").order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Recruitment Campaigns" subtitle="Internal drafts run live. External outreach launches require approval.">
      <MPSection title="Campaigns" description="Each campaign targets a category/location with a tailored seller value proposition.">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No recruitment campaigns yet" hint="The Marketplace Agent will draft campaigns when supply gaps are detected. Sending outreach always requires approval." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(r => (
              <div key={r.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.campaign_name}</span>
                  <Badge variant="outline" className="text-[10px]">{r.campaign_status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.target_category ?? "any category"} · {r.target_location ?? "any location"} · {r.target_seller_profile ?? "—"}</p>
                {r.value_proposition && <p className="text-xs">{r.value_proposition}</p>}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}