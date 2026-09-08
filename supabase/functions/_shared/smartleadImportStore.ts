import type { ImportStore } from "./smartleadImportRunner.ts";
import type { MappingRow } from "./smartleadLeadImport.ts";

// Supabase's generated database types are regenerated after the migration.
// Keep this boundary compatible with both Edge and unit-test clients.
export type SmartleadDb = { from(table: string): any; rpc(name: string, args?: Record<string, unknown>): any };

function checked<T>(result: { data: T; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

export async function loadSmartleadMappings(db: SmartleadDb, input: Record<string, unknown>): Promise<MappingRow[]> {
  let query = db.from("outbound_provider_campaign_mappings")
    .select("id,business_id,liftor_campaign_id,provider_campaign_id,provider_campaign_name,mapping_status,is_active")
    .eq("provider_type", "smartlead").eq("mapping_status", "mapped").eq("is_active", true);
  if (input.campaign_mapping_id) query = query.eq("id", input.campaign_mapping_id);
  if (input.provider_campaign_id) query = query.eq("provider_campaign_id", input.provider_campaign_id);
  // Two rows suffice to distinguish a unique mapping from ambiguity. Never
  // silently choose the first business when the caller hasn't selected one.
  return checked(await query.order("id").limit(2), "mapping_lookup") ?? [];
}

export function createSmartleadImportStore(db: SmartleadDb): ImportStore {
  const rpc = async (name: string, args: Record<string, unknown>) => checked(await db.rpc(name, args), name);
  return {
    async findContactsByEmails(emails) {
      return await rpc("smartlead_find_contacts_by_emails", { p_emails: emails }) ?? [];
    },
    async findContactById(id) {
      return checked(await db.from("contacts").select("*").eq("id", id).maybeSingle(), "contact_lookup");
    },
    async findLeadMappings(campaign, emails, ids) {
      return await rpc("smartlead_find_lead_mappings", { p_campaign: campaign, p_emails: emails, p_ids: ids }) ?? [];
    },
    async insertContact(patch) {
      const result = await db.from("contacts").insert(patch).select("id").single();
      if (result.error?.code === "23505") {
        const rows = await rpc("smartlead_find_contacts_by_emails", { p_emails: [patch.email] });
        if (rows?.length !== 1) throw new Error("contact_identity_ambiguous_after_conflict");
        return { id: rows[0].id, created: false, contact: rows[0] };
      }
      const row = checked<any>(result, "contact_insert");
      return { id: row.id, created: true };
    },
    async updateContact(id, patch) {
      await rpc("smartlead_merge_contact", { p_id: id, p_patch: patch });
    },
    async findRelationship(contact, name, business) {
      const rows = checked<any[]>(await db.from("business_contact_relationships")
        .select("id,do_not_contact,business_id,business_name").eq("contact_id", contact).eq("business_name", name).limit(2), "relationship_lookup") ?? [];
      if (rows.length > 1 || (rows[0]?.business_id && rows[0].business_id !== business)) throw new Error("relationship_business_conflict");
      return rows[0] ?? null;
    },
    async insertRelationship(row) {
      await rpc("smartlead_merge_relationship", { p_row: row });
    },
    async updateRelationship(id, patch) {
      await rpc("smartlead_merge_relationship", { p_row: { ...patch, id } });
    },
    async insertLeadMapping(row) {
      return await rpc("smartlead_merge_lead_mapping", { p_row: row });
    },
    async updateLeadMapping(id, row) {
      await rpc("smartlead_merge_lead_mapping", { p_row: { ...row, id } });
    },
    async touchMappingSync(id, at) {
      const row = checked<any>(await db.from("outbound_provider_campaign_mappings")
        .update({ last_synced_at: at }).eq("id", id).select("id").single(), "checkpoint_write");
      if (!row) throw new Error("checkpoint_mapping_missing");
    },
  };
}
