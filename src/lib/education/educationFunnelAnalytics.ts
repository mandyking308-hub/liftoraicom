// Additive commercial funnel reporting for the four education businesses.
// Reuses existing CRM / BCR / campaign_metrics / business_revenue_events data.
// Anything not yet measurable returns 0/null with explicit provenance — never fabricated.

import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type FunnelProvenance = "measured" | "not_yet_available";

export interface EducationFunnelRow {
  business_name: string;
  accounts_in_scope: number;
  contacts_relevant: number;
  contacts_eligible: number;
  allocated: number;
  contacted: number;
  replies: number;
  positive_replies: number | null;
  meetings: number | null;
  proposals: number | null;
  wins: number | null;
  revenue: number | null;
  exclusions: number;
  collisions: number;
  provenance: Record<string, FunnelProvenance>;
}

export async function loadEducationFunnel(businessNames: string[]): Promise<EducationFunnelRow[]> {
  const { data, error } = await sb
    .from("education_commercial_funnel")
    .select("*")
    .in("business_name", businessNames);
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    business_name: r.business_name,
    accounts_in_scope: Number(r.accounts_in_scope ?? 0),
    contacts_relevant: Number(r.contacts_relevant ?? 0),
    contacts_eligible: Number(r.contacts_eligible ?? 0),
    allocated: Number(r.allocated ?? 0),
    contacted: Number(r.contacted ?? 0),
    replies: Number(r.replies ?? 0),
    positive_replies: r.positive_replies === null ? null : Number(r.positive_replies),
    meetings: r.meetings === null ? null : Number(r.meetings),
    proposals: r.proposals === null ? null : Number(r.proposals),
    wins: r.wins === null ? null : Number(r.wins),
    revenue: r.revenue === null ? null : Number(r.revenue),
    exclusions: Number(r.exclusions ?? 0),
    collisions: Number(r.collisions ?? 0),
    provenance: {
      accounts_in_scope: "measured",
      contacts_relevant: "measured",
      contacts_eligible: "measured",
      allocated: "measured",
      contacted: "measured",
      replies: "measured",
      positive_replies: r.positive_replies === null ? "not_yet_available" : "measured",
      meetings: r.meetings === null ? "not_yet_available" : "measured",
      proposals: r.proposals === null ? "not_yet_available" : "measured",
      wins: r.wins === null ? "not_yet_available" : "measured",
      revenue: r.revenue === null ? "not_yet_available" : "measured",
      exclusions: "measured",
      collisions: "measured",
    },
  }));
}
