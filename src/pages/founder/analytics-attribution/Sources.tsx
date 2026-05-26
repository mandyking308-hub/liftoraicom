import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AALayout, AASection, SourceTypeBadge, shortId, fmtMoney } from "./_shared";
import {
  fetchSources, fetchEvents, bySource,
  type AttributionSource, type AttributionEvent,
} from "@/lib/attributionEngine";

export default function AASources() {
  const [sources, setSources] = useState<AttributionSource[]>([]);
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  useEffect(() => {
    fetchSources().then(setSources).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
  }, []);
  const ranked = bySource(sources, events);
  const unknown = ranked.find(r => r.id === "__unknown__");

  return (
    <AALayout title="Source dashboard" subtitle="Per-source performance: events, leads, sales and revenue. Unknown-source warnings highlighted.">
      {unknown && unknown.events > 0 && (
        <AASection title="Unknown source warning"
          description="Events without a source_id pollute attribution. Investigate and tag.">
          <p className="text-xs">
            <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] mr-2">Unknown</Badge>
            {unknown.events} events · {unknown.leads} leads · {unknown.sales} sales · {fmtMoney(unknown.revenue)} revenue
          </p>
        </AASection>
      )}

      <AASection title={`Sources ranked by revenue (${ranked.filter(r => r.source).length})`}>
        {ranked.filter(r => r.source).length === 0 ? (
          <p className="text-xs text-muted-foreground">No source data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left pr-3">Type</th>
                  <th className="text-left pr-3">Business</th>
                  <th className="text-right pr-3">Events</th>
                  <th className="text-right pr-3">Leads</th>
                  <th className="text-right pr-3">Sales</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ranked.filter(r => r.source).map(r => (
                  <tr key={r.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.source!.source_name}</td>
                    <td className="pr-3"><SourceTypeBadge type={r.source!.source_type} /></td>
                    <td className="pr-3 font-mono">{shortId(r.source!.business_id)}</td>
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

      <AASection title={`All sources (${sources.length})`}>
        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sources defined yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left pr-3">Type</th>
                  <th className="text-left pr-3">Business</th>
                  <th className="text-left pr-3">Channel</th>
                  <th className="text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3">{s.source_name}</td>
                    <td className="pr-3"><SourceTypeBadge type={s.source_type} /></td>
                    <td className="pr-3 font-mono">{shortId(s.business_id)}</td>
                    <td className="pr-3 font-mono">{shortId(s.channel_id)}</td>
                    <td>
                      <Badge variant="outline" className={`text-[10px] ${s.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
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