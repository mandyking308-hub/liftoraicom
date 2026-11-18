// Single source for which Kindnesss campaign draft is "current" in the UI.
// The canonical approved four-email draft is shown first; every other draft
// (archived sector drafts, superseded setup imports) is history only.
export const KINDNESSS_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const KINDNESSS_CANONICAL_CAMPAIGN_ID = "71719d7d-bd95-42e1-b73e-dfb6d890d0d6";

export type CampaignDraftRow = { id: string; campaign_name: string; campaign_key: string | null; status: string; external_send_blocked: boolean; email_sequence: any };

export function splitKindnesssCampaigns<T extends CampaignDraftRow>(drafts: T[]): { current: T | null; superseded: T[] } {
  const current = drafts.find((d) => d.id === KINDNESSS_CANONICAL_CAMPAIGN_ID && !["archived", "inactive", "superseded"].includes(d.status)) ?? null;
  return { current, superseded: drafts.filter((d) => d !== current) };
}
