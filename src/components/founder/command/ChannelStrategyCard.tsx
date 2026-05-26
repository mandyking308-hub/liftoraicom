import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchChannels, fetchStrategies, fetchCampaigns, summarize, diagnose,
  type Channel, type BusinessChannelStrategy, type CampaignPlan,
} from "@/lib/channelStrategyEngine";

export default function ChannelStrategyCard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [strategies, setStrategies] = useState<BusinessChannelStrategy[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPlan[]>([]);
  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => {});
    fetchStrategies().then(setStrategies).catch(() => {});
    fetchCampaigns().then(setCampaigns).catch(() => {});
  }, []);
  const sum = summarize(channels, strategies, campaigns);
  const diags = diagnose(channels, strategies, campaigns);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Megaphone size={14} className="text-primary" />
          Channel Strategy Engine
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Channels" value={sum.channels_active} />
          <Stat label="Businesses" value={sum.businesses_with_strategy} />
          <Stat label="Testing" value={sum.testing} />
          <Stat label="Active ext." value={sum.active_external} />
          <Stat label="Campaigns" value={sum.campaigns_total} />
          <Stat label="Approval" value={sum.campaigns_approval} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/channel-strategy" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/channel-strategy/businesses" className="text-primary hover:underline">By business</Link>
          <Link to="/founder/channel-strategy/channels" className="text-primary hover:underline">Channels</Link>
          <Link to="/founder/channel-strategy/campaigns" className="text-primary hover:underline">Campaigns</Link>
          <Link to="/founder/channel-strategy/recommendations" className="text-primary hover:underline">Recs</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}