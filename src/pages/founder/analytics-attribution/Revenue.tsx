import { useEffect, useState } from "react";
import { AALayout, AASection, AAStat, shortId, fmtMoney } from "./_shared";
import {
  fetchSources, fetchEvents, revenueByBusiness, bySource,
  type AttributionSource, type AttributionEvent,
} from "@/lib/attributionEngine";

export default function AARevenue() {
  const [sources, setSources] = useState<AttributionSource[]>([]);
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  useEffect(() => {
    fetchSources().then(setSources).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
  }, []);
  const rows = revenueByBusiness(events);
  const totals = rows.reduce((acc, r) => ({ confirmed: acc.confirmed + r.confirmed, estimated: acc.estimated + r.estimated }), { confirmed: 0, estimated: 0 });
  const srcRanked = bySource(sources, events).filter(r => r.source);

  return (
    <AALayout title="Revenue attribution" subtitle="Confirmed (sale/upgrade/renewal) vs estimated (proposal) revenue per business, with source ranking.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <AAStat label="Confirmed revenue" value={fmtMoney(totals.confirmed)} />
        <AAStat label="Estimated revenue" value={fmtMoney(totals.estimated)} hint="From proposals" />
        <AAStat label="Businesses with revenue" value={rows.filter(r => r.confirmed > 0).length} />
      </div>
      <AASection title={`Revenue by business (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No revenue events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Business</th>
                  <th className="text-right pr-3">Sales</th>
                  <th className="text-right pr-3">Confirmed</th>
                  <th className="text-right pr-3">Proposals</th>
                  <th className="text-right">Estimated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.business_id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-mono">{shortId(r.business_id)}</td>
                    <td className="pr-3 text-right">{r.sales}</td>
                    <td className="pr-3 text-right">{fmtMoney(r.confirmed)}</td>
                    <td className="pr-3 text-right">{r.proposals}</td>
                    <td className="text-right text-muted-foreground">{fmtMoney(r.estimated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AASection>

      <AASection title="Top sources by revenue" description="Feeds Channel Strategy reallocation recommendations.">
        {srcRanked.length === 0 ? (
          <p className="text-xs text-muted-foreground">No source-attributed revenue yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {srcRanked.slice(0, 10).map(r => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="font-medium">{r.source!.source_name}</span>
                <span className="text-muted-foreground">({r.source!.source_type})</span>
                <span className="ml-auto text-right">{fmtMoney(r.revenue)} · {r.sales} sale{r.sales === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        )}
      </AASection>
    </AALayout>
  );
}