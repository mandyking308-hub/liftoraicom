import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty, NoExternalActionBanner } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function SellerRisk() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data: perf = [] } = await sb.from("seller_performance_metrics").select("*").in("performance_status", ["poor", "suspend_review"]).order("created_at", { ascending: false });
      const { data: accounts = [] } = await sb.from("seller_accounts").select("*").in("seller_status", ["paused", "suspended"]);
      setRows([
        ...(perf ?? []).map((p: any) => ({ kind: "performance", ...p })),
        ...(accounts ?? []).map((a: any) => ({ kind: "account", ...a })),
      ]);
    })();
  }, []);
  return (
    <MPLayout title="Seller Risk & Suspension" subtitle="Sellers flagged for review or suspended. Suspension and offboarding require founder approval.">
      <NoExternalActionBanner />
      <MPSection title="Risk queue">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No sellers flagged for risk" hint="The Supply Quality Agent surfaces poor performers and suspension candidates here." /> : (
          <div className="space-y-2 text-sm">
            {rows.map((r: any, i: number) => (
              <div key={r.id ?? i} className="rounded border border-border/40 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.kind === "account" ? r.seller_name : `Performance flag · ${r.performance_status}`}</span>
                  <div className="flex gap-2 items-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400"><Lock size={9}/> suspend/offboard requires approval</span>
                    <Badge variant="outline" className="text-[10px]">{r.kind === "account" ? r.seller_status : r.performance_status}</Badge>
                  </div>
                </div>
                {r.kind === "performance" && (
                  <p className="text-xs text-muted-foreground">
                    rating {Number(r.customer_rating ?? 0).toFixed(2)} · disputes {r.dispute_count} · refunds {r.refund_count} · {r.recommended_action ?? "review"}
                  </p>
                )}
                {r.kind === "account" && (
                  <p className="text-xs text-muted-foreground">
                    {r.seller_category ?? "—"} · {r.seller_location ?? "—"} · disputes {(Number(r.dispute_rate ?? 0) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}