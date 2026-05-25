import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCEmpty } from "./_shared";

type Row = { event_type: string; event_value: number | null; source_agent: string | null; product_id: string | null; offer_id: string | null; channel: string | null };

export default function SalesCoachingConversions() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase.from("sales_conversion_events").select("event_type,event_value,source_agent,product_id,offer_id,channel").limit(2000)
      .then(r => setRows((r.data as Row[]) || []));
  }, []);

  const byAgent: Record<string, { att: number; won: number }> = {};
  const byProduct: Record<string, { att: number; won: number }> = {};
  const byChannel: Record<string, { att: number; won: number }> = {};
  rows.forEach(r => {
    const att = r.event_type === "close_attempted" || r.event_type === "closed_won" || r.event_type === "closed_lost" ? 1 : 0;
    const won = r.event_type === "closed_won" ? 1 : 0;
    const a = r.source_agent || "unknown";
    const p = r.product_id || "unknown";
    const c = r.channel || "unknown";
    if (!byAgent[a]) byAgent[a] = { att: 0, won: 0 };
    if (!byProduct[p]) byProduct[p] = { att: 0, won: 0 };
    if (!byChannel[c]) byChannel[c] = { att: 0, won: 0 };
    byAgent[a].att += att; byAgent[a].won += won;
    byProduct[p].att += att; byProduct[p].won += won;
    byChannel[c].att += att; byChannel[c].won += won;
  });

  const render = (m: Record<string, { att: number; won: number }>) => Object.entries(m).map(([k, v]) => ({ k, ...v, rate: v.att ? Math.round((v.won / v.att) * 100) : 0 })).sort((a, b) => b.rate - a.rate);

  return (
    <SCLayout title="Conversions" subtitle="Close rate by agent, product and channel. Pure read-out of conversion events.">
      {rows.length === 0 ? <SCEmpty title="No conversion events yet" hint="Events accumulate as the Customer Sales Engine logs each lead, call, proposal and close attempt." /> : (
        <div className="grid md:grid-cols-3 gap-3">
          {([["By agent", byAgent], ["By product", byProduct], ["By channel", byChannel]] as const).map(([title, map]) => (
            <SCSection key={title} title={title}>
              <ul className="text-xs space-y-1">
                {render(map).map(r => (
                  <li key={r.k} className="flex justify-between border-b border-border/40 py-1">
                    <span className="truncate max-w-[60%]">{r.k}</span>
                    <span className="tabular-nums">{r.won}/{r.att} · {r.rate}%</span>
                  </li>
                ))}
              </ul>
            </SCSection>
          ))}
        </div>
      )}
    </SCLayout>
  );
}