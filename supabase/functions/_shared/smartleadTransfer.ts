export const TRANSFER_SETTINGS = Object.freeze({
  ignore_global_block_list: false,
  ignore_unsubscribe_list: false,
  ignore_duplicate_leads_in_other_campaign: false,
  ignore_community_bounce_list: false,
});
export function leadPayload(contact: Record<string, any>, businessId: string, campaignId: string) {
  return {
    email: String(contact.email).trim().toLowerCase(),
    first_name: contact.first_name ?? String(contact.name ?? "").split(" ")[0],
    last_name: contact.last_name ?? String(contact.name ?? "").split(" ").slice(1).join(" "),
    company_name: contact.company ?? "", linkedin_profile: contact.linkedin_url ?? "",
    custom_fields: { liftor_contact_id: contact.id, liftor_business_id: businessId, liftor_campaign_id: campaignId },
  };
}
export interface ClaimedLead { mapping_id: string; contact: Record<string, any> }
export interface TransferIO {
  readCampaign(): Promise<{ status: number; body: any }>;
  claim(): Promise<ClaimedLead[]>;
  addLeads(body: unknown): Promise<{ status: number; body: any }>;
  record(ids: string[], status: "pushed" | "pushing", response: unknown): Promise<void>;
}
/** A timeout may mean the provider accepted the request. Keep the durable claim
 * and reconcile via a campaign import; never retry that POST automatically. */
export async function transferLeads(io: TransferIO, businessId: string, campaignId: string) {
  const campaign = await io.readCampaign();
  if (campaign.status < 200 || campaign.status >= 300) throw new Error("campaign_read_failed");
  const state = String(campaign.body?.status ?? campaign.body?.data?.status ?? "").toUpperCase();
  if (!["DRAFT", "DRAFTED", "PAUSED"].includes(state)) throw new Error("campaign_must_be_draft_or_paused");
  const rows = await io.claim();
  if (!rows.length) return { ok: true, leads_pushed: 0, claimed: 0, reconciliation_required: false };
  let result: { status: number; body: any };
  try { result = await io.addLeads({ lead_list: rows.map(r => leadPayload(r.contact, businessId, campaignId)), settings: TRANSFER_SETTINGS }); }
  catch { result = { status: 0, body: null }; }
  const added = Number(result.body?.added_count);
  const skipped = Number(result.body?.skipped_count);
  const allConfirmed = result.status >= 200 && result.status < 300 && result.body?.success === true
    && Number.isInteger(added) && added === rows.length && skipped === 0;
  let recorded = false;
  try {
    await io.record(rows.map(r => r.mapping_id), allConfirmed ? "pushed" : "pushing", {
      provider_status: result.status, response: result.body,
      reconciliation_required: !allConfirmed,
    });
    recorded = true;
  } catch { /* A successful POST with a failed local write is also unresolved. */ }
  return { ok: allConfirmed && recorded, claimed: rows.length,
    leads_pushed: allConfirmed && recorded ? rows.length : 0,
    provider_added_count: Number.isInteger(added) && added >= 0 && added <= rows.length ? added : null,
    provider_status: result.status, reconciliation_required: !allConfirmed || !recorded,
    ...(allConfirmed && recorded ? {} : { action: "Import this Smartlead campaign to reconcile the reserved contacts before attempting any further transfer." }) };
}
