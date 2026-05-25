import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LFLayout, LFSection, LFStat, StatusBadge } from "./_shared";
import {
  fetchLaunchProfiles, fetchChannelAccounts, fetchChecklist, diagnoseLaunch, summarizeLaunch,
  type LaunchProfileRow, type ChannelAccountRow, type ChecklistItemRow,
} from "@/lib/launchFactoryEngine";

export default function LFOverview() {
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  const [channels, setChannels] = useState<ChannelAccountRow[]>([]);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  useEffect(() => {
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
    fetchChannelAccounts().then(setChannels).catch(() => {});
    fetchChecklist().then(setItems).catch(() => {});
  }, []);

  const warnings = useMemo(
    () => profiles.flatMap(p => diagnoseLaunch(p, items.filter(i => i.business_id === p.business_id))),
    [profiles, items],
  );
  const live = profiles.filter(p => p.launch_status === "live").length;
  const ready = profiles.filter(p => p.launch_status === "internal_ready" || p.launch_status === "approval_required").length;

  return (
    <LFLayout
      title="Launch Factory"
      subtitle="Each business needs a complete launch pack: brand, domain, email, support inbox, legal footer, socials, tracking, CRM, products and first campaigns. Internal setup runs live; domain purchases, DNS, publishing, account creation and outbound sends require founder approval."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <LFStat label="Launch profiles" value={profiles.length} />
        <LFStat label="Live" value={live} />
        <LFStat label="Internal ready" value={ready} hint="Awaiting external approval" />
        <LFStat label="Channel accounts" value={channels.length} />
        <LFStat label="Open checklist items" value={items.filter(i => i.item_status === "missing" || i.item_status === "draft").length} />
      </div>

      <LFSection title="Per-business launch profiles" description="Generated checklist progress, missing basics and gated approvals at a glance.">
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No launch profiles yet. Create one from a business in the Business Template Factory or via the Checklist tab.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map(p => {
              const own = items.filter(i => i.business_id === p.business_id);
              const sum = summarizeLaunch(p, own);
              return (
                <div key={p.id} className="border border-border/50 rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{p.public_brand_name ?? p.brand_name ?? "(unnamed brand)"}</p>
                    <StatusBadge status={p.launch_status} />
                    <span className="text-[11px] text-muted-foreground">{p.domain_name ?? "no domain"} · {p.support_email ?? "no support email"}</span>
                    <Link to="/founder/launch-factory/checklist" className="text-primary hover:underline text-[11px] ml-auto">Open checklist →</Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {sum.complete}/{sum.total} complete ({sum.percent}%) · {sum.missing} missing · {sum.approvalRequired} need approval
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </LFSection>

      <LFSection title="Launch warnings" description="Missing launch basics across all businesses.">
        {warnings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No launch warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warnings.slice(0, 50).map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <StatusBadge status={w.severity === "approval" ? "approval_required" : "missing"} />
                <span>{w.message}</span>
                <Link to={w.link} className="ml-auto text-primary hover:underline">Fix →</Link>
              </li>
            ))}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}