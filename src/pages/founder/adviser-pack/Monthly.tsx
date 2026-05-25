import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty, NoAutoAdviserBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { PACK_STATUS_TONE, ITEM_TYPE_LABEL, fmtMoney } from "@/lib/adviserPackEngine";

type Pack = { id: string; pack_name: string; period_start: string; period_end: string; pack_status: string; prepared_by: string | null; reviewed_by: string | null; approved_at: string | null };
type Item = { id: string; pack_id: string; item_type: string; item_summary: string; amount: number | null; currency: string | null; needs_adviser_review: boolean };

export default function AdviserPackMonthly() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const [pRes, iRes] = await Promise.all([
        sb.from("adviser_handoff_packs").select("*").order("period_end", { ascending: false }),
        sb.from("adviser_pack_items").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      setPacks(pRes.data ?? []);
      setItems(iRes.data ?? []);
    })();
  }, []);

  return (
    <APLayout title="Monthly pack" subtitle="Each monthly pack groups revenue, expenses, AI spend, contracts, risks and adviser questions for the period. Sending the pack out requires founder approval.">
      <NoAutoAdviserBanner />
      <APSection title={`Packs (${packs.length})`}>
        {packs.length === 0 ? <APEmpty title="No adviser packs yet" hint="The Adviser Pack Agent will assemble the current month from Quote-to-Cash, Vendor Management, Contracts and the AI usage ledger." /> : (
          <div className="space-y-3">
            {packs.map(p => {
              const packItems = items.filter(i => i.pack_id === p.id);
              const grouped = new Map<string, { count: number; total: number }>();
              packItems.forEach(i => {
                const g = grouped.get(i.item_type) ?? { count: 0, total: 0 };
                g.count += 1; g.total += Number(i.amount || 0);
                grouped.set(i.item_type, g);
              });
              return (
                <div key={p.id} className="rounded border border-border/50 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{p.pack_name}</span>
                    <Badge variant="outline" className={`${PACK_STATUS_TONE[p.pack_status]} text-[10px]`}>{p.pack_status}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}
                    </span>
                    {p.approved_at && <span className="text-[11px] text-emerald-400">approved {new Date(p.approved_at).toLocaleDateString()}</span>}
                  </div>
                  {grouped.size === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No items yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Array.from(grouped.entries()).map(([t, g]) => (
                        <div key={t} className="rounded border border-border/40 p-2">
                          <p className="text-[10px] uppercase text-muted-foreground">{ITEM_TYPE_LABEL[t] ?? t}</p>
                          <p className="font-semibold">{g.count} item{g.count === 1 ? "" : "s"}</p>
                          {g.total > 0 && <p className="text-[11px] text-muted-foreground">{fmtMoney(g.total)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </APSection>
    </APLayout>
  );
}