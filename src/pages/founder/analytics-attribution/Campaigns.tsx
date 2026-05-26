import { useEffect, useState } from "react";
import { AALayout, AASection, shortId, fmtMoney } from "./_shared";
import { fetchEvents, byCampaign, type AttributionEvent } from "@/lib/attributionEngine";

export default function AACampaigns() {
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  useEffect(() => { fetchEvents().then(setEvents).catch(() => {}); }, []);
  const rows = byCampaign(events);
  return (
    <AALayout title="Campaign performance" subtitle="Performance per campaign id. Feeds Channel Strategy reallocation recommendations.">
      <AASection title={`Campaigns (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No campaign-tagged events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Campaign</th>
                  <th className="text-right pr-3">Events</th>
                  <th className="text-right pr-3">Leads</th>
                  <th className="text-right pr-3">Sales</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-mono">{r.campaign_id ? shortId(r.campaign_id) : <span className="text-muted-foreground">— untagged —</span>}</td>
                    <td className="pr-3 text-right">{r.events}</td>
                    <td className="pr-3 text-right">{r.leads}</td>
                    <td className="pr-3 text-right">{r.sales}</td>
                    <td className="text-right">{fmtMoney(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AASection>
    </AALayout>
  );
}