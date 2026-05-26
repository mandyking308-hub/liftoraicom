import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CSLayout, CSSection } from "./_shared";
import { fetchChannels, type Channel } from "@/lib/channelStrategyEngine";

const RISK_CLS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function CSChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  useEffect(() => { fetchChannels().then(setChannels).catch(() => {}); }, []);
  return (
    <CSLayout title="Channel catalogue" subtitle="Every supported channel, its archetype fit, setup requirements and risk profile.">
      <CSSection title={`Channels (${channels.length})`}>
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channels yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Channel</th>
                  <th className="text-left pr-3">Type</th>
                  <th className="text-left pr-3">Suitable archetypes</th>
                  <th className="text-left pr-3">Setup</th>
                  <th className="text-left pr-3">Risk</th>
                  <th className="text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(c => (
                  <tr key={c.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-medium">{c.channel_name}</td>
                    <td className="pr-3 text-muted-foreground">{c.channel_type}</td>
                    <td className="pr-3">
                      <div className="flex flex-wrap gap-1">
                        {c.suitable_archetypes.map(a => (
                          <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="pr-3 text-muted-foreground">{c.setup_requirements ?? "—"}</td>
                    <td className="pr-3"><Badge variant="outline" className={`text-[10px] ${RISK_CLS[c.risk_level]}`}>{c.risk_level}</Badge></td>
                    <td>
                      <Badge variant="outline" className={`text-[10px] ${c.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>{c.active ? "Active" : "Inactive"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CSSection>
    </CSLayout>
  );
}