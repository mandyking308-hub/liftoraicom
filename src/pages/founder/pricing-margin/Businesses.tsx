import { useEffect, useMemo, useState } from "react";
import { PMLayout, PMSection, MarginStatusBadge, fmtMoney, fmtPct, shortId } from "./_shared";
import { fetchMarginProfiles, totalCost, computeMargin, type MarginProfile, type MarginStatus } from "@/lib/pricingMarginEngine";

type Row = {
  business_id: string;
  profiles: number;
  revenue: number;
  cost: number;
  margin: number;
  percent: number;
  currency: string;
  worst: MarginStatus;
};

const SEV: Record<MarginStatus, number> = { healthy: 0, watch: 1, poor: 2, loss_making: 3, unknown: 0 };

export default function PMBusinesses() {
  const [profiles, setProfiles] = useState<MarginProfile[]>([]);
  useEffect(() => { fetchMarginProfiles().then(setProfiles).catch(() => {}); }, []);
  const rows = useMemo<Row[]>(() => {
    const grouped = new Map<string, MarginProfile[]>();
    for (const p of profiles) {
      const a = grouped.get(p.business_id) ?? [];
      a.push(p); grouped.set(p.business_id, a);
    }
    const out: Row[] = [];
    for (const [bid, list] of grouped) {
      let revenue = 0, cost = 0;
      let worst: MarginStatus = "healthy";
      let currency = "USD";
      for (const p of list) {
        revenue += p.price_amount ?? 0;
        cost += totalCost(p);
        const m = computeMargin(p);
        if (SEV[m.status] > SEV[worst]) worst = m.status;
        currency = p.currency;
      }
      const margin = revenue - cost;
      const percent = revenue ? (margin / revenue) * 100 : 0;
      out.push({ business_id: bid, profiles: list.length, revenue, cost, margin, percent, currency, worst });
    }
    return out.sort((a, b) => SEV[b.worst] - SEV[a.worst]);
  }, [profiles]);

  return (
    <PMLayout title="Business margin dashboard" subtitle="Aggregated margin per business. Feeds Portfolio Prioritisation and Sales Target Engine.">
      <PMSection title={`Businesses (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No margin data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Business</th>
                  <th className="text-right pr-3">Offers</th>
                  <th className="text-right pr-3">Revenue (sum)</th>
                  <th className="text-right pr-3">Cost (sum)</th>
                  <th className="text-right pr-3">Margin</th>
                  <th className="text-right pr-3">%</th>
                  <th className="text-left">Worst</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.business_id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-mono">{shortId(r.business_id)}</td>
                    <td className="pr-3 text-right">{r.profiles}</td>
                    <td className="pr-3 text-right">{fmtMoney(r.revenue, r.currency)}</td>
                    <td className="pr-3 text-right">{fmtMoney(r.cost, r.currency)}</td>
                    <td className="pr-3 text-right">{fmtMoney(r.margin, r.currency)}</td>
                    <td className="pr-3 text-right">{fmtPct(r.percent)}</td>
                    <td><MarginStatusBadge status={r.worst} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PMSection>
    </PMLayout>
  );
}