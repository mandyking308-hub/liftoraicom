import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty, NoExternalActionBanner } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function ListingQueue() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_listings").select("*").in("listing_status", ["draft", "approval_required", "rejected"]).order("created_at", { ascending: false })
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Listing Queue" subtitle="Listings awaiting review or approval. Publishing requires founder approval.">
      <NoExternalActionBanner />
      <MPSection title="Pending listings">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="Queue empty" hint="No listings awaiting review." /> : (
          <div className="space-y-2 text-sm">
            {rows.map(l => (
              <div key={l.id} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{l.listing_title}</span>
                  <div className="flex gap-2 items-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400"><Lock size={9}/> approval</span>
                    <Badge variant="outline" className="text-[10px]">{l.listing_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.category ?? "—"} · {l.location ?? "—"} · quality {Number(l.quality_score ?? 0).toFixed(2)}
                </p>
                {l.listing_description && <p className="text-xs">{l.listing_description}</p>}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}