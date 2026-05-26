import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CSLayout, CSSection, CSStat } from "./_shared";
import {
  fetchChannels, fetchStrategies, fetchCampaigns, summarize, diagnose,
  type Channel, type BusinessChannelStrategy, type CampaignPlan,
} from "@/lib/channelStrategyEngine";

export default function CSOverview() {
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
  return (
    <CSLayout title="Channel Strategy Engine"
      subtitle="Each business needs the right growth channels. Internal channel planning runs live. External campaigns, posts, emails, ads, partner contact and spend remain approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <CSStat label="Channels" value={sum.channels_active} hint={`${sum.channels_total} total`} />
        <CSStat label="Businesses" value={sum.businesses_with_strategy} hint={`${sum.strategies_total} strategies`} />
        <CSStat label="Testing" value={sum.testing} />
        <CSStat label="Active ext." value={sum.active_external} />
        <CSStat label="Campaigns" value={sum.campaigns_total} hint={`${sum.campaigns_active} live`} />
        <CSStat label="Approval queue" value={sum.campaigns_approval} />
      </div>

      <CSSection title="Channel Strategy Agent — diagnostics"
        description="Missing acquisition paths, wrong-fit channels, risky gates, orphan campaigns. Agent never launches or spends externally."
        actions={<Link to="/founder/channel-strategy/recommendations" className="text-xs text-primary hover:underline">All recommendations →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channel warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {diags.slice(0, 60).map((d, i) => (
              <li key={`${d.id}-${i}`} className="flex items-start gap-2">
                <span className={d.severity === "block" ? "text-destructive" : d.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </CSSection>
    </CSLayout>
  );
}