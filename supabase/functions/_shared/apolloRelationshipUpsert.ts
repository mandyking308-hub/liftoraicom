// Durable Apollo -> Relationship Intelligence upsert.
//
// INVARIANT: an Apollo result is NOT considered complete until the Liftor
// upsert below succeeds. Every Apollo workflow (search recovery, enrichment,
// import) must mirror its people through this module before moving to the
// next batch, so an Apollo response can never be lost again.

export interface ApolloPersonLike {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  last_name_obfuscated?: string | null;
  name?: string | null;
  title?: string | null;
  headline?: string | null;
  email?: string | null;
  email_status?: string | null;
  has_email?: boolean | null;
  linkedin_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  organization?: { name?: string | null; website_url?: string | null } | null;
  employment_history?: Array<{ organization_name?: string | null; current?: boolean | null; title?: string | null }> | null;
}

export interface UpsertOptions {
  relationship_type: string;
  base_tags: string[];
  source_pack: string;
  recovered_on: string; // ISO date, e.g. 2026-08-24
  outreach_status?: string;
  role_tagger?: (title: string, org: string) => string[];
}

export interface UpsertStats {
  inserted: number;
  updated: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  verified_email_preserved: number;
  errors: string[];
}

const MASKED_EMAIL = /email_not_unlocked|not_unlocked/i;

export const isRealEmail = (email?: string | null) =>
  !!email && email.includes("@") && !MASKED_EMAIL.test(email);

// Apollo's credit-free api_search masks surnames (e.g. "Pr***e"). Preserve the
// masked form exactly — never invent hidden characters.
export const personName = (p: ApolloPersonLike) =>
  (p.name || `${p.first_name ?? ""} ${p.last_name ?? p.last_name_obfuscated ?? ""}`).trim();

export const personOrg = (p: ApolloPersonLike) =>
  (p.organization?.name ||
    p.employment_history?.find((e) => e?.current)?.organization_name ||
    "").trim();

export const personTitle = (p: ApolloPersonLike) =>
  (p.title || p.headline || p.employment_history?.find((e) => e?.current)?.title || "").trim();

const normKey = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

// Matches an existing full name against Apollo's masked form, e.g.
// existing "Anique Seldon" vs Apollo first_name "Anique" + "Se***n".
export function maskedNameMatches(existingName: string, first: string, masked: string): boolean {
  if (!existingName || !first || !masked) return false;
  const parts = normKey(existingName).split(" ");
  if (parts.length < 2) return false;
  if (parts[0] !== normKey(first)) return false;
  const surname = parts[parts.length - 1];
  const m = normKey(masked);
  const stars = (m.match(/\*/g) ?? []).length;
  if (stars === 0) return surname === m;
  const head = m.slice(0, m.indexOf("*"));
  const tail = m.slice(m.lastIndexOf("*") + 1);
  if (surname.length !== m.length) return false;
  return surname.startsWith(head) && surname.endsWith(tail);
}

export interface ExistingRow {
  id: string;
  contact_name?: string | null;
  organisation_name?: string | null;
  role_or_title?: string | null;
  email?: string | null;
  email_status?: string | null;
  apollo_person_id?: string | null;
  tags?: string[] | null;
}

// Loads the existing universe once so a batch does not issue 3 lookups per person.
export async function loadRelationshipCache(admin: any, relationship_type: string): Promise<ExistingRow[]> {
  const rows: ExistingRow[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await admin
      .from("relationship_intelligence_contacts")
      .select("id, contact_name, organisation_name, role_or_title, email, email_status, apollo_person_id, tags")
      .eq("relationship_type", relationship_type)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function upsertApolloPeople(
  admin: any,
  people: ApolloPersonLike[],
  opts: UpsertOptions & { cache?: ExistingRow[] },
): Promise<UpsertStats> {
  const stats: UpsertStats = {
    inserted: 0,
    updated: 0,
    skipped_duplicate: 0,
    skipped_invalid: 0,
    verified_email_preserved: 0,
    errors: [],
  };

  const cache = opts.cache ?? (await loadRelationshipCache(admin, opts.relationship_type));
  const byApolloId = new Map<string, ExistingRow>();
  const byNameOrg = new Map<string, ExistingRow>();
  for (const r of cache) {
    if (r.apollo_person_id) byApolloId.set(r.apollo_person_id, r);
    byNameOrg.set(`${normKey(r.contact_name ?? "")}|${normKey(r.organisation_name ?? "")}`, r);
  }
  const pendingInserts: Record<string, unknown>[] = [];

  for (const p of people) {
    try {
      const name = personName(p);
      const org = personOrg(p);
      const title = personTitle(p);
      if (!name || !p.id) {
        stats.skipped_invalid += 1;
        continue;
      }

      // 1) dedupe by Apollo person id
      let existing: ExistingRow | null = byApolloId.get(p.id) ?? null;

      // 2a) dedupe by normalised name + organisation
      if (!existing) existing = byNameOrg.get(`${normKey(name)}|${normKey(org)}`) ?? null;

      // 2b) dedupe against pre-existing verified rows using the masked surname
      if (!existing && p.first_name && p.last_name_obfuscated && org) {
        existing =
          cache.find(
            (r) =>
              normKey(r.organisation_name ?? "") === normKey(org) &&
              maskedNameMatches(r.contact_name ?? "", p.first_name!, p.last_name_obfuscated!),
          ) ?? null;
      }


      const hasEmail = p.has_email === true || (typeof p.email_status === "string" && p.email_status.length > 0 && p.email_status !== "no_email");
      const realEmail = isRealEmail(p.email) ? String(p.email) : null;

      const tags = new Set<string>(opts.base_tags);
      if (!realEmail && hasEmail) tags.add("email_reveal_required");
      if (opts.role_tagger) opts.role_tagger(title, org).forEach((t) => tags.add(t));

      const emailStatus = realEmail
        ? "verified_from_apollo_search"
        : hasEmail
        ? "reveal_required"
        : "no_email_on_file";

      const emailStatusReason = realEmail
        ? `Exact work email returned by Apollo People Search on ${opts.recovered_on}.`
        : hasEmail
        ? `Apollo reports an email on file (has_email=true) but the exact address was not returned by free People Search, because the original enrichment response was not persisted. Reveal after Apollo credits reset.`
        : `Apollo People Search on ${opts.recovered_on} reported no email on file for this person.`;

      const sourceEvidence = [
        `apollo_person_id=${p.id}`,
        `Apollo People Search recovery on ${opts.recovered_on}`,
        `source_pack=${opts.source_pack}`,
        p.linkedin_url ? `linkedin=${p.linkedin_url}` : null,
        `has_email=${p.has_email === true}`,
        p.email_status ? `apollo_email_status=${p.email_status}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const location = [p.city, p.state, p.country].filter(Boolean).join(", ");

      if (existing) {
        const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...tags]));
        const patch: Record<string, unknown> = {
          apollo_person_id: existing.apollo_person_id ?? p.id,
          tags: mergedTags,
          last_synced_at: new Date().toISOString(),
        };
        if (!existing.role_or_title && title) patch.role_or_title = title;
        if (!existing.organisation_name && org) patch.organisation_name = org;

        // NEVER overwrite an existing verified email with masked/null data.
        if (isRealEmail(existing.email)) {
          stats.verified_email_preserved += 1;
        } else if (realEmail) {
          patch.email = realEmail;
          patch.email_status = emailStatus;
          patch.email_status_reason = emailStatusReason;
        } else if (!existing.email_status) {
          patch.email_status = emailStatus;
          patch.email_status_reason = emailStatusReason;
        }

        const { error } = await admin
          .from("relationship_intelligence_contacts")
          .update(patch)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        stats.updated += 1;
        stats.skipped_duplicate += 1;
        continue;
      }

      const insert: Record<string, unknown> = {
        contact_name: name,
        organisation_name: org || null,
        role_or_title: title || null,
        email: realEmail,
        city_country: location || null,
        relationship_type: opts.relationship_type,
        source: "other",
        source_platform: "apollo",
        source_notes: opts.source_pack,
        source_evidence: sourceEvidence,
        apollo_person_id: p.id,
        email_status: emailStatus,
        email_status_reason: emailStatusReason,
        next_action:
          "Reveal/verify email only for selected active outreach after Apollo credits reset (1 Sep 2026). Do not blanket enrich.",
        outreach_status: opts.outreach_status ?? "do_not_contact_yet",
        tags: Array.from(tags),
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await admin.from("relationship_intelligence_contacts").insert(insert);
      if (error) {
        if ((error.message ?? "").includes("ux_ric_apollo_person_id")) {
          stats.skipped_duplicate += 1;
          continue;
        }
        throw new Error(error.message);
      }
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(String((e as Error).message).slice(0, 200));
    }
  }

  return stats;
}
