import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LFLayout, LFSection } from "./_shared";
import { fetchChannelAccounts, type ChannelAccountRow } from "@/lib/launchFactoryEngine";

const SOCIAL_TYPES = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x", "metricool", "manychat"] as const;

export default function LFSocials() {
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  useEffect(() => { fetchChannelAccounts().then(setChannels).catch(() => {}); }, []);
  const socials = channels.filter(c => (SOCIAL_TYPES as readonly string[]).includes(c.channel_type));
  return (
    <LFLayout title="Socials" subtitle="Social, scheduling and chat accounts. Liftor will never create or post to a social account automatically.">
      <LFSection title="Channel coverage">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SOCIAL_TYPES.map(t => {
            const n = socials.filter(s => s.channel_type === t).length;
            return (
              <div key={t} className="border border-border/50 rounded p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t}</p>
                <p className="text-xl font-bold">{n}</p>
              </div>
            );
          })}
        </div>
      </LFSection>
      <LFSection title="Accounts">
        {socials.length === 0 ? <p className="text-xs text-muted-foreground">No social accounts registered.</p> : (
          <ul className="text-xs space-y-1">
            {socials.map(c => (
              <li key={c.id} className="flex items-center gap-2 border border-border/50 rounded p-2">
                <Badge variant="outline" className="text-[10px]">{c.channel_type}</Badge>
                <span className="font-medium">{c.account_name}</span>
                {c.account_url && <a href={c.account_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.account_url}</a>}
                <span className="ml-auto text-muted-foreground">{c.connected ? "connected" : "not connected"}</span>
              </li>
            ))}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}