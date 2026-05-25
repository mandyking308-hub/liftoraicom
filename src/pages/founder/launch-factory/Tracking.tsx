import { useEffect, useState } from "react";
import { LFLayout, LFSection, StatusBadge } from "./_shared";
import { Link } from "react-router-dom";
import { fetchChannelAccounts, fetchChecklist, type ChannelAccountRow, type ChecklistItemRow } from "@/lib/launchFactoryEngine";

export default function LFTracking() {
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  useEffect(() => {
    fetchChannelAccounts().then(setChannels).catch(() => {});
    fetchChecklist().then(setItems).catch(() => {});
  }, []);
  const tracking = items.filter(i => i.item_category === "tracking");
  const analytics = channels.filter(c => c.channel_type === "analytics");
  return (
    <LFLayout title="Tracking" subtitle="Analytics, consent banners and tracking pixels per business.">
      <LFSection title="Tracking checklist items">
        {tracking.length === 0 ? <p className="text-xs text-muted-foreground">No tracking items yet.</p> : (
          <ul className="text-xs space-y-1">
            {tracking.map(i => (
              <li key={i.id} className="flex items-center gap-2 border border-border/50 rounded p-2">
                <span>{i.item_name}</span>
                <StatusBadge status={i.item_status} />
                {i.link_to_fix && <Link to={i.link_to_fix} className="ml-auto text-primary hover:underline">Fix →</Link>}
              </li>
            ))}
          </ul>
        )}
      </LFSection>
      <LFSection title="Analytics accounts">
        {analytics.length === 0 ? <p className="text-xs text-muted-foreground">No analytics accounts registered.</p> : (
          <ul className="text-xs space-y-1">
            {analytics.map(c => <li key={c.id}>{c.account_name} {c.account_url && <span className="text-muted-foreground">· {c.account_url}</span>}</li>)}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}