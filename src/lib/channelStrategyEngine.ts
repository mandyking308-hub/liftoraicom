import { supabase } from "@/integrations/supabase/client";

export type ChannelType =
  | "outbound" | "seo" | "social" | "paid_ads" | "partnerships" | "referral"
  | "affiliate" | "marketplace" | "events" | "influencer" | "content"
  | "email" | "community" | "pr" | "other";

export type ChannelStatus =
  | "recommended" | "testing" | "active_internal" | "active_external" | "paused" | "retired";

export type CampaignStatus =
  | "draft" | "approval_required" | "approved" | "active" | "paused" | "completed" | "cancelled";

export const CHANNEL_STATUS_META: Record<ChannelStatus, { label: string; cls: string }> = {
  recommended: { label: "Recommended", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  testing: { label: "Testing", cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  active_internal: { label: "Active (internal)", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  active_external: { label: "Active (external)", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused: { label: "Paused", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  retired: { label: "Retired", cls: "bg-muted text-muted-foreground border-border/50" },
};

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border/50" },
  approval_required: { label: "Approval required", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved: { label: "Approved", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused: { label: "Paused", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  completed: { label: "Completed", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export type Channel = {
  id: string;
  channel_name: string;
  channel_type: ChannelType;
  suitable_archetypes: string[];
  setup_requirements: string | null;
  risk_level: "low" | "medium" | "high";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessChannelStrategy = {
  id: string;
  business_id: string;
  channel_id: string;
  channel_status: ChannelStatus;
  reason: string | null;
  target_audience: string | null;
  expected_cost: number | null;
  expected_return: number | null;
  approval_required_for_external: boolean;
  created_at: string;
  updated_at: string;
};

export type CampaignPlan = {
  id: string;
  business_id: string;
  channel_id: string;
  campaign_name: string;
  campaign_status: CampaignStatus;
  campaign_goal: string | null;
  budget_estimate: number | null;
  expected_outcome: string | null;
  created_at: string;
  updated_at: string;
};

const sb = () => supabase as any;

export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await sb().from("channel_catalog").select("*").order("channel_name");
  if (error) throw error; return data ?? [];
}
export async function fetchStrategies(): Promise<BusinessChannelStrategy[]> {
  const { data, error } = await sb().from("business_channel_strategies").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchCampaigns(): Promise<CampaignPlan[]> {
  const { data, error } = await sb().from("channel_campaign_plans").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  const { error } = await sb().from("channel_campaign_plans").update({ campaign_status: status }).eq("id", id);
  if (error) throw error;
}
export async function updateStrategyStatus(id: string, status: ChannelStatus): Promise<void> {
  const { error } = await sb().from("business_channel_strategies").update({ channel_status: status }).eq("id", id);
  if (error) throw error;
}

export function summarize(channels: Channel[], strategies: BusinessChannelStrategy[], campaigns: CampaignPlan[]) {
  const businessIds = new Set(strategies.map(s => s.business_id));
  return {
    channels_total: channels.length,
    channels_active: channels.filter(c => c.active).length,
    strategies_total: strategies.length,
    businesses_with_strategy: businessIds.size,
    testing: strategies.filter(s => s.channel_status === "testing").length,
    active_external: strategies.filter(s => s.channel_status === "active_external").length,
    campaigns_total: campaigns.length,
    campaigns_draft: campaigns.filter(c => c.campaign_status === "draft").length,
    campaigns_approval: campaigns.filter(c => c.campaign_status === "approval_required").length,
    campaigns_active: campaigns.filter(c => c.campaign_status === "active").length,
  };
}

/** Recommend channels for a business archetype. */
export function recommendForArchetype(archetype: string, channels: Channel[]): Channel[] {
  return channels.filter(c => c.active && c.suitable_archetypes.includes(archetype));
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string | null;
  channel_id: string | null;
  message: string;
};

/**
 * Diagnostics:
 * - business with no acquisition channel
 * - external campaign without approval gate
 * - campaign active without approved strategy
 * - high-risk channel without approval requirement
 */
export function diagnose(
  channels: Channel[],
  strategies: BusinessChannelStrategy[],
  campaigns: CampaignPlan[],
  businessArchetypes: Record<string, string> = {}
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const channelById = new Map(channels.map(c => [c.id, c]));
  const stratByBusiness = new Map<string, BusinessChannelStrategy[]>();
  for (const s of strategies) {
    const a = stratByBusiness.get(s.business_id) ?? [];
    a.push(s); stratByBusiness.set(s.business_id, a);
  }

  const businessIds = new Set<string>([
    ...Object.keys(businessArchetypes),
    ...strategies.map(s => s.business_id),
    ...campaigns.map(c => c.business_id),
  ]);
  for (const bid of businessIds) {
    const list = stratByBusiness.get(bid) ?? [];
    const acquisition = list.filter(s => s.channel_status === "active_internal" || s.channel_status === "active_external" || s.channel_status === "testing");
    if (acquisition.length === 0) {
      out.push({ id: bid, severity: "warn", business_id: bid, channel_id: null,
        message: "Business has no active or testing acquisition channel." });
    }
    // Wrong channel for archetype
    const arche = businessArchetypes[bid];
    if (arche) {
      for (const s of list) {
        const ch = channelById.get(s.channel_id);
        if (!ch) continue;
        if (ch.suitable_archetypes.length && !ch.suitable_archetypes.includes(arche) && (s.channel_status === "active_internal" || s.channel_status === "active_external" || s.channel_status === "testing")) {
          out.push({ id: s.id, severity: "warn", business_id: bid, channel_id: ch.id,
            message: `Channel "${ch.channel_name}" not typical for archetype "${arche}".` });
        }
      }
    }
  }

  for (const s of strategies) {
    const ch = channelById.get(s.channel_id);
    if (!ch) continue;
    if (ch.risk_level === "high" && !s.approval_required_for_external) {
      out.push({ id: s.id, severity: "block", business_id: s.business_id, channel_id: ch.id,
        message: `High-risk channel "${ch.channel_name}" has approval gate disabled — re-enable.` });
    }
  }

  for (const c of campaigns) {
    if (c.campaign_status === "active") {
      const list = stratByBusiness.get(c.business_id) ?? [];
      const matched = list.find(s => s.channel_id === c.channel_id);
      if (!matched) {
        out.push({ id: c.id, severity: "warn", business_id: c.business_id, channel_id: c.channel_id,
          message: `Active campaign "${c.campaign_name}" has no underlying channel strategy.` });
      }
    }
    if (c.campaign_status === "active" || c.campaign_status === "approved") {
      // External activation should pass approval_required first
      if (c.campaign_status === "approved") {
        out.push({ id: c.id, severity: "info", business_id: c.business_id, channel_id: c.channel_id,
          message: `Campaign "${c.campaign_name}" approved — ready for external launch (founder action).` });
      }
    }
  }
  return out;
}