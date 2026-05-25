import { useEffect, useState } from "react";
import { LFLayout, LFSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchChannelAccounts, fetchLaunchProfiles, type ChannelAccountRow, type LaunchProfileRow } from "@/lib/launchFactoryEngine";

export default function LFDomains() {
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  useEffect(() => {
    fetchChannelAccounts().then(setChannels).catch(() => {});
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
  }, []);
  const domainRows = channels.filter(c => c.channel_type === "domain" || c.channel_type === "website");
  const missing = profiles.filter(p => !p.domain_name);
  return (
    <LFLayout title="Domains" subtitle="Domain & website registry. Domain purchases and DNS changes require founder approval — Liftor will never buy a domain or modify DNS automatically.">
      <LFSection title="Domains & websites">
        {domainRows.length === 0 ? <p className="text-xs text-muted-foreground">No domain or website accounts registered.</p> : (
          <div className="space-y-2">
            {domainRows.map(c => (
              <div key={c.id} className="border border-border/50 rounded p-3 flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="outline" className="text-[10px]">{c.channel_type}</Badge>
                <span className="font-medium">{c.account_name}</span>
                {c.account_url && <a href={c.account_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.account_url}</a>}
                <span className="ml-auto text-muted-foreground">{c.connected ? "connected" : "not connected"}</span>
              </div>
            ))}
          </div>
        )}
      </LFSection>
      <LFSection title="Businesses missing a domain">
        {missing.length === 0 ? <p className="text-xs text-muted-foreground">All launch profiles have a domain assigned.</p> : (
          <ul className="text-xs space-y-1">
            {missing.map(p => <li key={p.id}>{p.brand_name ?? p.business_id} — domain missing (founder approval required to purchase).</li>)}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}