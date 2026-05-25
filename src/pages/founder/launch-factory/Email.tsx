import { useEffect, useState } from "react";
import { LFLayout, LFSection, StatusBadge } from "./_shared";
import { fetchLaunchProfiles, fetchChannelAccounts, type LaunchProfileRow, type ChannelAccountRow } from "@/lib/launchFactoryEngine";

export default function LFEmail() {
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  useEffect(() => {
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
    fetchChannelAccounts().then(setChannels).catch(() => {});
  }, []);
  const emailChannels = channels.filter(c => c.channel_type === "email");
  return (
    <LFLayout title="Email" subtitle="Support inbox, sales inbox and outbound email setup. Liftor never sends external email without approval.">
      <LFSection title="Inboxes per business">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr><th className="text-left p-2">Brand</th><th className="text-left p-2">Support</th><th className="text-left p-2">Sales</th><th className="text-left p-2">Status</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-b border-border/20">
                  <td className="p-2">{p.brand_name ?? p.business_id}</td>
                  <td className="p-2">{p.support_email ?? <span className="text-destructive">missing</span>}</td>
                  <td className="p-2">{p.sales_email ?? <span className="text-muted-foreground">missing</span>}</td>
                  <td className="p-2"><StatusBadge status={p.launch_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LFSection>
      <LFSection title="Email channel accounts">
        {emailChannels.length === 0 ? <p className="text-xs text-muted-foreground">No email accounts registered.</p> : (
          <ul className="text-xs space-y-1">
            {emailChannels.map(c => <li key={c.id}>{c.account_name} {c.account_url && <span className="text-muted-foreground">· {c.account_url}</span>}</li>)}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}