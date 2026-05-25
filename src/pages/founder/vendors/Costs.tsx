import { useEffect, useState } from "react";
import { VNDLayout, VNDSection, VNDStat, VNDEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsCosts() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendor_subscriptions")
      .select("id,subscription_name,subscription_status,monthly_cost,annual_cost,currency,owner")
      .in("subscription_status", ["trial", "active"])
      .order("monthly_cost", { ascending: false, nullsFirst: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  const monthly = (rows ?? []).reduce((s, r) => s + Number(r.monthly_cost ?? (r.annual_cost ? Number(r.annual_cost) / 12 : 0)), 0);
  const annual = (rows ?? []).reduce((s, r) => s + Number(r.annual_cost ?? (r.monthly_cost ? Number(r.monthly_cost) * 12 : 0)), 0);

  // duplicate detection by name
  const nameMap: Record<string, any[]> = {};
  for (const r of rows ?? []) {
    const k = (r.subscription_name || "").trim().toLowerCase();
    if (!k) continue;
    (nameMap[k] = nameMap[k] || []).push(r);
  }
  const duplicates = Object.entries(nameMap).filter(([, arr]) => arr.length > 1);

  return (
    <VNDLayout title="Monthly / annual cost" subtitle="Live cost view across active and trial subscriptions. Duplicates and unowned subs are surfaced as cost waste candidates.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <VNDStat label="Active subs" value={(rows ?? []).length} />
        <VNDStat label="Monthly spend" value={`£${monthly.toFixed(0)}`} />
        <VNDStat label="Annualised" value={`£${annual.toFixed(0)}`} />
        <VNDStat label="Duplicate names" value={duplicates.length} tone={duplicates.length > 0 ? "warn" : "good"} />
      </div>

      <VNDSection title="Spend by subscription (highest first)">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <VNDEmpty title="No active subscriptions" />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.subscription_name}</span>
                    {r.owner ? <Badge variant="outline">owner: {r.owner}</Badge> : <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">no owner</Badge>}
                  </div>
                  <div className="text-muted-foreground">
                    {r.monthly_cost != null ? `${r.currency || "GBP"} ${Number(r.monthly_cost).toFixed(2)}/mo` : r.annual_cost != null ? `${r.currency || "GBP"} ${Number(r.annual_cost).toFixed(2)}/yr` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
      </VNDSection>

      {duplicates.length > 0 && (
        <VNDSection title="Duplicate subscription candidates" description="Same subscription name appears more than once across active subs. Review for consolidation.">
          <div className="space-y-2 text-xs">
            {duplicates.map(([name, arr]) => (
              <div key={name} className="rounded border border-border/40 p-3">
                <p className="font-medium">{arr[0].subscription_name} · {arr.length} subscriptions</p>
              </div>
            ))}
          </div>
        </VNDSection>
      )}
    </VNDLayout>
  );
}