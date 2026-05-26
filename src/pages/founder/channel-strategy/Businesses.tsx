import { useEffect, useMemo, useState } from "react";
import { CSLayout, CSSection, ChannelStatusBadge, shortId } from "./_shared";
import {
  fetchChannels, fetchStrategies,
  type Channel, type BusinessChannelStrategy,
} from "@/lib/channelStrategyEngine";

export default function CSBusinesses() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [strategies, setStrategies] = useState<BusinessChannelStrategy[]>([]);
  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => {});
    fetchStrategies().then(setStrategies).catch(() => {});
  }, []);
  const channelById = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);
  const grouped = useMemo(() => {
    const m = new Map<string, BusinessChannelStrategy[]>();
    for (const s of strategies) {
      const a = m.get(s.business_id) ?? [];
      a.push(s); m.set(s.business_id, a);
    }
    return Array.from(m.entries());
  }, [strategies]);

  return (
    <CSLayout title="Channel plan board" subtitle="Per-business channel mix, status, expected cost vs return. External activation requires approval.">
      {grouped.length === 0 ? (
        <CSSection title="No business strategies yet">
          <p className="text-xs text-muted-foreground">Add a recommended channel for a business to begin.</p>
        </CSSection>
      ) : grouped.map(([bid, list]) => (
        <CSSection key={bid} title={`Business ${shortId(bid)}`} description={`${list.length} channel${list.length === 1 ? "" : "s"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Channel</th>
                  <th className="text-left pr-3">Status</th>
                  <th className="text-left pr-3">Audience</th>
                  <th className="text-right pr-3">Expected cost</th>
                  <th className="text-right pr-3">Expected return</th>
                  <th className="text-left">Gate</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => {
                  const ch = channelById.get(s.channel_id);
                  return (
                    <tr key={s.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3">{ch?.channel_name ?? shortId(s.channel_id)}</td>
                      <td className="pr-3"><ChannelStatusBadge status={s.channel_status} /></td>
                      <td className="pr-3 text-muted-foreground">{s.target_audience ?? "—"}</td>
                      <td className="pr-3 text-right">{s.expected_cost ?? "—"}</td>
                      <td className="pr-3 text-right">{s.expected_return ?? "—"}</td>
                      <td className="text-xs text-muted-foreground">{s.approval_required_for_external ? "Approval required" : "Pre-approved"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CSSection>
      ))}
    </CSLayout>
  );
}