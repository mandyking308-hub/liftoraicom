import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CSLayout, CSSection, CampaignStatusBadge, shortId } from "./_shared";
import {
  fetchChannels, fetchCampaigns, updateCampaignStatus,
  type Channel, type CampaignPlan, type CampaignStatus,
} from "@/lib/channelStrategyEngine";

const FLOW: Partial<Record<CampaignStatus, { next: CampaignStatus; label: string }[]>> = {
  draft: [{ next: "approval_required", label: "Submit for approval" }],
  approval_required: [{ next: "approved", label: "Approve" }, { next: "cancelled", label: "Cancel" }],
  approved: [{ next: "active", label: "Mark active (after external launch)" }, { next: "cancelled", label: "Cancel" }],
  active: [{ next: "paused", label: "Pause" }, { next: "completed", label: "Complete" }],
  paused: [{ next: "active", label: "Resume" }, { next: "completed", label: "Complete" }],
};

export default function CSCampaigns() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPlan[]>([]);
  const { toast } = useToast();
  const load = () => {
    fetchChannels().then(setChannels).catch(() => {});
    fetchCampaigns().then(setCampaigns).catch(() => {});
  };
  useEffect(load, []);
  const channelById = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);
  const approval = campaigns.filter(c => c.campaign_status === "approval_required");
  const others = campaigns.filter(c => c.campaign_status !== "approval_required");

  const transition = async (c: CampaignPlan, next: CampaignStatus) => {
    try {
      await updateCampaignStatus(c.id, next);
      toast({ title: "Campaign updated", description: `${c.campaign_name} → ${next}` });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    }
  };

  const renderRow = (c: CampaignPlan) => {
    const ch = channelById.get(c.channel_id);
    const flow = FLOW[c.campaign_status] ?? [];
    return (
      <tr key={c.id} className="border-b border-border/30 last:border-0">
        <td className="py-2 pr-3 font-medium">{c.campaign_name}</td>
        <td className="pr-3 font-mono">{shortId(c.business_id)}</td>
        <td className="pr-3">{ch?.channel_name ?? shortId(c.channel_id)}</td>
        <td className="pr-3"><CampaignStatusBadge status={c.campaign_status} /></td>
        <td className="pr-3 text-muted-foreground">{c.campaign_goal ?? "—"}</td>
        <td className="pr-3 text-right">{c.budget_estimate ?? "—"}</td>
        <td>
          <div className="flex flex-wrap gap-1">
            {flow.map(a => (
              <Button key={a.next} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => transition(c, a.next)}>
                {a.label}
              </Button>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <CSLayout title="Campaign planning board" subtitle="Plan campaigns internally. External launch requires founder approval — no campaigns launched, no ad spend committed by AI.">
      <CSSection title={`Approval queue (${approval.length})`} description="Campaigns ready for founder review before external launch / spend.">
        {approval.length === 0 ? (
          <p className="text-xs text-muted-foreground">No campaigns awaiting approval.</p>
        ) : <Table>{approval.map(renderRow)}</Table>}
      </CSSection>
      <CSSection title={`All campaigns (${others.length})`}>
        {others.length === 0 ? (
          <p className="text-xs text-muted-foreground">No campaigns yet.</p>
        ) : <Table>{others.map(renderRow)}</Table>}
      </CSSection>
    </CSLayout>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground border-b border-border/50">
          <tr>
            <th className="text-left py-2 pr-3">Name</th>
            <th className="text-left pr-3">Business</th>
            <th className="text-left pr-3">Channel</th>
            <th className="text-left pr-3">Status</th>
            <th className="text-left pr-3">Goal</th>
            <th className="text-right pr-3">Budget</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}