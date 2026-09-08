/**
 * Smartlead -> Liftor page importer (transport-free, fully testable).
 *
 * The edge function supplies an `ImportStore` backed by Supabase; tests supply a
 * mock store. All correctness rules live here:
 *
 *  - PREVIEW (dry_run) performs ZERO writes of any kind, including metadata.
 *  - Prerequisite lookup failures fail CLOSED (nothing is processed).
 *  - Row write failures are recorded honestly; the row is NOT counted imported
 *    and the page is NOT marked complete, so the checkpoint never advances past
 *    unresolved rows.
 *  - Re-running a partially written page REPAIRS the missing relationship /
 *    provenance rows instead of duplicating them.
 *  - In-memory indices are updated after every durable row (and simulated in
 *    preview) so duplicate leads inside one page cannot double-create.
 *  - Conflicting identifiers (provider lead id -> contact A, email -> contact B)
 *    are reported as a conflict, never silently resolved to the wrong contact.
 */

import {
  buildLeadMappingRow,
  emptyCounters,
  type ExistingContact,
  type ImportAction,
  type ImportCounters,
  type MappingRow,
  normaliseEmail,
  type NormalisedLead,
  planContactWrite,
  tally,
} from "./smartleadLeadImport.ts";

export interface LeadMappingRecord {
  id: string;
  provider_lead_id: string | null;
  contact_email: string | null;
  liftor_contact_id: string;
}

export interface RelationshipRecord {
  id: string;
  do_not_contact: boolean | null;
}

/** Minimal persistence surface. Every method throws on a storage failure. */
export interface ImportStore {
  /** MUST match on normalised (lower-cased) email, not raw case. */
  findContactsByEmails(emails: string[]): Promise<ExistingContact[]>;
  findContactById(id: string): Promise<ExistingContact | null>;
  findLeadMappings(
    providerCampaignId: string,
    emails: string[],
    providerLeadIds: string[],
  ): Promise<LeadMappingRecord[]>;
  insertContact(patch: Record<string, unknown>): Promise<{ id: string; created?: boolean; contact?: ExistingContact }>;
  updateContact(id: string, patch: Record<string, unknown>): Promise<void>;
  findRelationship(contactId: string, businessName: string, businessId: string): Promise<RelationshipRecord | null>;
  insertRelationship(row: Record<string, unknown>): Promise<void>;
  updateRelationship(id: string, patch: Record<string, unknown>): Promise<void>;
  insertLeadMapping(row: Record<string, unknown>): Promise<{ id: string }>;
  updateLeadMapping(id: string, patch: Record<string, unknown>): Promise<void>;
  touchMappingSync(campaignMappingId: string, at: string): Promise<void>;
}

export interface RunPageInput {
  leads: NormalisedLead[];
  mapping: MappingRow;
  business_name: string;
  imported_at: string;
  dry_run: boolean;
  store: ImportStore;
}

export interface RowDetail {
  email: string | null;
  provider_lead_id: string | null;
  action: ImportAction | "error";
  reason: string;
  warnings?: string[];
  repaired?: string[];
}

export interface RunPageResult {
  ok: boolean;
  prerequisite_error?: string;
  prerequisite_detail?: string;
  counters: ImportCounters;
  details: RowDetail[];
  /** False whenever any row failed — the caller must not advance its checkpoint. */
  page_complete: boolean;
  unresolved_rows: number;
  writes: number;
}

const CONTACT_SELECT_KEYS = true; // documented in the store implementation

export async function runImportPage(input: RunPageInput): Promise<RunPageResult> {
  const { leads, mapping, business_name, imported_at, dry_run, store } = input;
  const counters = emptyCounters();
  const details: RowDetail[] = [];
  let writes = 0;
  let unresolved = 0;

  const business_id = mapping.business_id!;
  const provider_campaign_id = mapping.provider_campaign_id!;
  const ctx = { business_id, business_name, provider_campaign_id, imported_at };

  const emails = Array.from(
    new Set(leads.map((l) => normaliseEmail(l.email)).filter(Boolean) as string[]),
  );
  const providerLeadIds = Array.from(
    new Set(leads.map((l) => l.provider_lead_id).filter(Boolean) as string[]),
  );

  // ---- prerequisite lookups: fail closed -----------------------------------
  let existingContacts: ExistingContact[] = [];
  let existingMaps: LeadMappingRecord[] = [];
  try {
    existingContacts = emails.length ? await store.findContactsByEmails(emails) : [];
  } catch (e) {
    return failClosed(counters, "existing_contact_lookup_failed", (e as Error).message);
  }
  try {
    existingMaps = (emails.length || providerLeadIds.length)
      ? await store.findLeadMappings(provider_campaign_id, emails, providerLeadIds)
      : [];
  } catch (e) {
    return failClosed(counters, "provider_lead_mapping_lookup_failed", (e as Error).message);
  }

  const byEmail = new Map<string, ExistingContact>();
  for (const c of existingContacts) {
    const key = normaliseEmail(c.email);
    if (key) byEmail.set(key, c);
  }
  const mapByProviderId = new Map<string, LeadMappingRecord>();
  const mapByEmail = new Map<string, LeadMappingRecord>();
  for (const m of existingMaps) {
    if (m.provider_lead_id) mapByProviderId.set(m.provider_lead_id, m);
    const k = normaliseEmail(m.contact_email);
    if (k) mapByEmail.set(k, m);
  }

  for (const lead of leads) {
    const emailKey = normaliseEmail(lead.email);
    const knownMap = (lead.provider_lead_id ? mapByProviderId.get(lead.provider_lead_id) : undefined) ??
      (emailKey ? mapByEmail.get(emailKey) : undefined);

    let existing: ExistingContact | null = emailKey ? byEmail.get(emailKey) ?? null : null;

    // Identifier conflict: the provider lead already points at a different contact
    // than the one owning this email. Never guess.
    if (existing && knownMap && knownMap.liftor_contact_id !== existing.id) {
      counters.errors += 1;
      counters.processed += 1;
      unresolved += 1;
      details.push({
        email: lead.email,
        provider_lead_id: lead.provider_lead_id,
        action: "error",
        reason: "identifier_conflict_provider_lead_and_email_point_to_different_contacts",
      });
      continue;
    }

    if (!existing && knownMap) {
      try {
        existing = await store.findContactById(knownMap.liftor_contact_id);
      } catch (e) {
        counters.errors += 1;
        counters.processed += 1;
        unresolved += 1;
        details.push({
          email: lead.email,
          provider_lead_id: lead.provider_lead_id,
          action: "error",
          reason: `contact_lookup_failed: ${(e as Error).message}`,
        });
        continue;
      }
    }

    let plan = planContactWrite(lead, existing, ctx);

    if (plan.action === "skip" && !existing) {
      tally(counters, "skip");
      details.push({ email: lead.email, provider_lead_id: lead.provider_lead_id, action: "skip", reason: plan.reason });
      continue;
    }

    if (dry_run) {
      // Simulate the index update so duplicate rows inside the page are counted
      // the way a real run would count them — still zero writes.
      if (emailKey && !byEmail.has(emailKey)) {
        byEmail.set(emailKey, {
          id: existing?.id ?? `preview:${emailKey}`,
          email: lead.email,
          ...(plan.action === "create" ? planPreviewFields(plan.contact_patch) : {}),
        } as ExistingContact);
      }
      if (emailKey && !mapByEmail.has(emailKey)) {
        mapByEmail.set(emailKey, {
          id: `preview:${emailKey}`,
          provider_lead_id: lead.provider_lead_id,
          contact_email: lead.email,
          liftor_contact_id: existing?.id ?? `preview:${emailKey}`,
        });
      }
      if (lead.provider_lead_id && !mapByProviderId.has(lead.provider_lead_id)) {
        mapByProviderId.set(lead.provider_lead_id, mapByEmail.get(emailKey ?? "")!);
      }
      tally(counters, plan.action);
      details.push({
        email: lead.email,
        provider_lead_id: lead.provider_lead_id,
        action: plan.action,
        reason: plan.reason,
        warnings: plan.warnings,
      });
      continue;
    }

    // ---- durable path ------------------------------------------------------
    const repaired: string[] = [];
    let contactId = existing?.id ?? knownMap?.liftor_contact_id ?? null;
    let createdContactId: string | null = null;

    try {
      if (plan.action === "create" && !contactId) {
        const ins = await store.insertContact(plan.contact_patch);
        contactId = ins.id;
        if (ins.created === false) {
          // A concurrent import won the insert. Re-plan from the actual row,
          // including its suppression flags; never report adoption as creation.
          existing = ins.contact ?? await store.findContactById(ins.id);
          if (!existing) throw new Error("concurrent_contact_not_found");
          plan = planContactWrite(lead, existing, ctx);
          if (Object.keys(plan.contact_patch).length) {
            await store.updateContact(ins.id, plan.contact_patch);
            writes += 1;
          }
        } else {
          writes += 1;
          createdContactId = ins.id;
        }
      } else if (contactId && Object.keys(plan.contact_patch).length > 0) {
        await store.updateContact(contactId, plan.contact_patch);
        writes += 1;
      }
      if (!contactId) throw new Error("contact_id_unresolved");
    } catch (e) {
      counters.errors += 1;
      counters.processed += 1;
      unresolved += 1;
      details.push({
        email: lead.email,
        provider_lead_id: lead.provider_lead_id,
        action: "error",
        reason: `contact_write_failed: ${(e as Error).message}`,
      });
      continue;
    }

    // Association + provenance. A failure here means the row is NOT imported,
    // even though the contact row may already exist — a rerun repairs it.
    try {
      if (plan.relationship_patch) {
        const rel = await store.findRelationship(contactId, business_name, business_id);
        if (rel) {
          const patch: Record<string, unknown> = { ...plan.relationship_patch };
          if (rel.do_not_contact && patch.do_not_contact !== true) delete patch.do_not_contact;
          await store.updateRelationship(rel.id, patch);
        } else {
          await store.insertRelationship({ ...plan.relationship_patch, contact_id: contactId });
          if (!createdContactId) repaired.push("business_relationship_created");
        }
        writes += 1;
      }

      const mapRow = buildLeadMappingRow(lead, {
        ...ctx,
        campaign_mapping_id: mapping.id,
        liftor_campaign_id: mapping.liftor_campaign_id!,
        liftor_contact_id: contactId,
      });
      if (knownMap) {
        await store.updateLeadMapping(knownMap.id, mapRow);
        writes += 1;
        const refreshed = { ...knownMap, provider_lead_id: lead.provider_lead_id ?? knownMap.provider_lead_id,
          contact_email: lead.email, liftor_contact_id: contactId };
        if (knownMap.provider_lead_id) mapByProviderId.delete(knownMap.provider_lead_id);
        if (refreshed.provider_lead_id) mapByProviderId.set(refreshed.provider_lead_id, refreshed);
        if (emailKey) mapByEmail.set(emailKey, refreshed);
      } else {
        const insMap = await store.insertLeadMapping(mapRow);
        writes += 1;
        if (!createdContactId) repaired.push("provider_lead_provenance_created");
        const rec: LeadMappingRecord = {
          id: insMap.id,
          provider_lead_id: lead.provider_lead_id,
          contact_email: lead.email,
          liftor_contact_id: contactId,
        };
        if (lead.provider_lead_id) mapByProviderId.set(lead.provider_lead_id, rec);
        if (emailKey) mapByEmail.set(emailKey, rec);
      }
    } catch (e) {
      counters.errors += 1;
      counters.processed += 1;
      unresolved += 1;
      details.push({
        email: lead.email,
        provider_lead_id: lead.provider_lead_id,
        action: "error",
        reason: `association_or_provenance_write_failed: ${(e as Error).message}`,
        warnings: createdContactId
          ? ["contact_row_written_association_missing_rerun_this_page_to_repair"]
          : ["association_or_provenance_incomplete_rerun_this_page_to_repair"],
      });
      continue;
    }

    // Keep the in-memory contact index current so a duplicate of this email later
    // in the same page updates instead of creating a second contact.
    if (emailKey) {
      byEmail.set(emailKey, {
        ...(existing ?? {}),
        ...(plan.contact_patch as Record<string, unknown>),
        id: contactId,
        email: lead.email,
      } as ExistingContact);
    }

    tally(counters, plan.action);
    details.push({
      email: lead.email,
      provider_lead_id: lead.provider_lead_id,
      action: plan.action,
      reason: plan.reason,
      warnings: plan.warnings,
      ...(repaired.length ? { repaired } : {}),
    });
  }

  let page_complete = unresolved === 0;

  // Sync metadata is a write: never in preview, never while rows are unresolved.
  if (!dry_run && page_complete) {
    try {
      await store.touchMappingSync(mapping.id, imported_at);
      writes += 1;
    } catch {
      // Metadata is the durable checkpoint. Retry this idempotent page if it
      // cannot be recorded; never claim that continuation is safe.
      page_complete = false;
      unresolved += 1;
      counters.errors += 1;
      details.push({
        email: null,
        provider_lead_id: null,
        action: "error",
        reason: "mapping_last_synced_at_update_failed",
      });
    }
  }

  return { ok: true, counters, details, page_complete, unresolved_rows: unresolved, writes };
}

function planPreviewFields(patch: Record<string, unknown>): Partial<ExistingContact> {
  const out: Record<string, unknown> = {};
  for (const k of ["name", "company", "role", "email_verified_status", "sendable_status"]) {
    if (patch[k] !== undefined) out[k] = patch[k];
  }
  return out as Partial<ExistingContact>;
}

function failClosed(counters: ImportCounters, error: string, detail: string): RunPageResult {
  return {
    ok: false,
    prerequisite_error: error,
    prerequisite_detail: detail,
    counters,
    details: [],
    page_complete: false,
    unresolved_rows: 0,
    writes: 0,
  };
}

export const _internal = { CONTACT_SELECT_KEYS };
