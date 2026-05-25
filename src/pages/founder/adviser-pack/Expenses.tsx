import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty, APStat } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, ITEM_TYPE_LABEL } from "@/lib/adviserPackEngine";

type Item = { id: string; item_type: string; item_summary: string; amount: number | null; currency: string | null; needs_adviser_review: boolean; source_table: string | null };

const EXP_TYPES = ["expense", "ai_spend", "contract"];

export default function AdviserPackExpenses() {
  const [items, setItems] = useState<Item[]>([]);
  const [aiSpend, setAiSpend] = useState(0);
  const [vendorCost, setVendorCost] = useState(0);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [iRes, aiRes, vRes] = await Promise.all([
        sb.from("adviser_pack_items").select("*").in("item_type", EXP_TYPES).order("created_at", { ascending: false }).limit(200),
        sb.from("ai_usage_ledger").select("cost_usd").gte("created_at", since).limit(5000),
        sb.from("vendor_records").select("monthly_cost,currency,active").eq("active", true).limit(500),
      ]);
      setItems(iRes.data ?? []);
      setAiSpend((aiRes.data ?? []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0));
      setVendorCost((vRes.data ?? []).reduce((s: number, r: any) => s + Number(r.monthly_cost || 0), 0));
    })();
  }, []);

  return (
    <APLayout title="Expense / AI / tool spend" subtitle="Vendor, SaaS and AI usage costs pulled from Vendor Management and the AI usage ledger. Sensitive items are flagged for adviser review.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <APStat label="AI spend 30d (USD)" value={fmtMoney(aiSpend, "USD")} hint="From AI usage ledger" />
        <APStat label="Active vendor monthly cost" value={fmtMoney(vendorCost)} hint="From vendor register" />
        <APStat label="Items in packs" value={items.length} />
      </div>

      <APSection title={`Expense / AI / contract items (${items.length})`}>
        {items.length === 0 ? <APEmpty title="No expense items packed yet" hint="The Adviser Pack Agent assembles vendor / SaaS / AI spend each period." /> : (
          <div className="space-y-1 text-xs">
            {items.map(i => (
              <div key={i.id} className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-1">
                <Badge variant="outline" className="text-[10px]">{ITEM_TYPE_LABEL[i.item_type]}</Badge>
                <span className="flex-1">{i.item_summary}</span>
                {i.amount != null && <span className="font-mono">{fmtMoney(Number(i.amount), i.currency ?? "GBP")}</span>}
                {i.needs_adviser_review && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">review</Badge>}
              </div>
            ))}
          </div>
        )}
      </APSection>
    </APLayout>
  );
}