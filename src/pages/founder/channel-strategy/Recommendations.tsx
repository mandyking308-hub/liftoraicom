import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CSLayout, CSSection, shortId } from "./_shared";
import {
  fetchChannels, fetchStrategies, fetchCampaigns, diagnose,
  type Channel, type BusinessChannelStrategy, type CampaignPlan, type Diagnostic,
} from "@/lib/channelStrategyEngine";

export default function CSRecommendations() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [strategies, setStrategies] = useState<BusinessChannelStrategy[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPlan[]>([]);
  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => {});
    fetchStrategies().then(setStrategies).catch(() => {});
    fetchCampaigns().then(setCampaigns).catch(() => {});
  }, []);
  const diags = diagnose(channels, strategies, campaigns);
  const blocks = diags.filter(d => d.severity === "block");
  const warns = diags.filter(d => d.severity === "warn");
  const infos = diags.filter(d => d.severity === "info");

  return (
    <CSLayout title="Channel recommendations" subtitle="Channel Strategy Agent diagnostics. No campaigns launched, no spend committed.">
      <CSSection title="Blocking">
        <List items={blocks} sev="block" />
      </CSSection>
      <CSSection title="Warnings">
        <List items={warns} sev="warn" />
      </CSSection>
      <CSSection title="Info">
        <List items={infos} sev="info" />
      </CSSection>
    </CSLayout>
  );
}

function List({ items, sev }: { items: Diagnostic[]; sev: "block" | "warn" | "info" }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">None.</p>;
  const cls = sev === "block" ? "bg-red-500/15 text-red-400 border-red-500/30" : sev === "warn" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-muted text-muted-foreground border-border/50";
  return (
    <ul className="text-xs space-y-1">
      {items.map((d, i) => (
        <li key={`${d.id}-${i}`} className="flex items-start gap-2">
          <Badge variant="outline" className={`text-[10px] shrink-0 ${cls}`}>{sev}</Badge>
          {d.business_id && <span className="text-muted-foreground font-mono shrink-0">{shortId(d.business_id)}</span>}
          <span>{d.message}</span>
        </li>
      ))}
    </ul>
  );
}