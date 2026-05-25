import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty, APStat } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, ITEM_TYPE_LABEL } from "@/lib/adviserPackEngine";

type Item = { id: string; item_type: string; item_summary: string; amount: number | null; currency: string | null; needs_adviser_review: boolean; source_table: string | null; created_at: string };

const REV_TYPES = ["revenue", "invoice", "payment"];

export default function AdviserPackRevenue() {
  const [items, setItems] = useState<Item[]>([]);
  const [confirmed, setConfirmed] = useState(0);
  const [estimated, setEstimated] = useState(0);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const [iRes, payRes] = await Promise.all([
        sb.from("adviser_pack_items").select("*").in("item_type", REV_TYPES).order("created_at", { ascending: false }).limit(200),
        sb.from("qtc_payments").select("amount,confirmed_revenue,payment_status").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(2000),
      ]);
      setItems(iRes.data ?? []);
      const pays = payRes.data ?? [];
      const isConfirmed = (r: any) => r.confirmed_revenue === true || String(r.payment_status ?? "").toLowerCase() === "completed";
      setConfirmed(pays.filter(isConfirmed).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
      setEstimated(pays.filter((r: any) => !isConfirmed(r)).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
    })();
  }, []);

  return (
    <APLayout title="Revenue summary" subtitle="Confirmed (paid / revenue-confirmed) vs estimated revenue across all ventures. Only confirmed revenue is shared with advisers; estimated is shown separately for cash forecasting.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <APStat label="Confirmed 30d" value={fmtMoney(confirmed)} tone="good" />
        <APStat label="Estimated 30d" value={fmtMoney(estimated)} hint="Not included in adviser figures" />
        <APStat label="Revenue items in packs" value={items.length} />
      </div>

      <APSection title={`Revenue / invoice / payment items (${items.length})`}>
        {items.length === 0 ? <APEmpty title="No revenue items packed yet" hint="The Adviser Pack Agent pulls confirmed revenue from Quote-to-Cash on demand." /> : (
          <div className="space-y-1 text-xs">
            {items.map(i => (
              <div key={i.id} className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-1">
                <Badge variant="outline" className="text-[10px]">{ITEM_TYPE_LABEL[i.item_type]}</Badge>
                <span className="flex-1">{i.item_summary}</span>
                {i.amount != null && <span className="font-mono">{fmtMoney(Number(i.amount), i.currency ?? "GBP")}</span>}
                {i.needs_adviser_review && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">review</Badge>}
                {i.source_table && <span className="text-[10px] text-muted-foreground">from {i.source_table}</span>}
              </div>
            ))}
          </div>
        )}
      </APSection>
    </APLayout>
  );
}