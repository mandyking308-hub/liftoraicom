// Past email-history lookup for lead quality / autopilot / send checks.
//
// ROOT CAUSE (fixed 26 Oct 2026): callers queried email_events.recipient_email,
// a column that does not exist. email_events is keyed by contact_id
// (id, contact_id, email_id, event_type, timestamp, created_at) and the
// event_type enum is sent|delivered|opened|clicked|replied|bounced. The error
// was discarded and `events ?? []` turned it into "clean history".
//
// This module resolves email -> contact(s) -> email_events by contact_id, adds
// the contact-level suppression flags (hard_bounced, unsubscribed_at,
// is_globally_suppressed, DO_NOT_CONTACT), and THROWS on any query error so
// callers fail closed. Contacts are portfolio-shared, so a bounce/unsubscribe
// recorded under any business suppresses the address everywhere.
// Provider (Smartlead) history is NOT read here; callers must not claim it.

export class EmailHistoryLookupError extends Error {
  constructor(public stage: "contacts" | "email_events", detail: string) {
    // detail is a DB error message/code only — never row data or emails.
    super(`email_history_lookup_failed:${stage}:${detail}`);
    this.name = "EmailHistoryLookupError";
  }
}

export type HistoryContact = {
  id: string;
  email: string | null;
  status?: string | null;
  sendable_status?: string | null;
  hard_bounced?: boolean | null;
  is_globally_suppressed?: boolean | null;
  unsubscribed_at?: string | null;
  apollo_person_id?: string | null;
};

export type QueryResult<T> = { data: T[] | null; error: { message?: string; code?: string } | null };

export type EmailHistoryDeps = {
  fetchContactsByEmails: (emails: string[]) => Promise<QueryResult<HistoryContact>>;
  fetchEventsByContactIds: (ids: string[]) => Promise<QueryResult<{ contact_id: string; event_type: string }>>;
};

export type EmailHistory = {
  /** lowercased email -> flags */
  byEmail: Map<string, Set<string>>;
  /** lowercased email -> contacts (more than one = duplicate email in CRM) */
  contactsByEmail: Map<string, HistoryContact[]>;
  contacts: HistoryContact[];
  provider_history_checked: false;
};

export const normEmail = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

const CHUNK = 200;

async function settle<T>(stage: "contacts" | "email_events", p: Promise<QueryResult<T>>): Promise<T[]> {
  let r: QueryResult<T>;
  try { r = await p; } catch (e) {
    throw new EmailHistoryLookupError(stage, (e as Error)?.name ?? "rejected");
  }
  if (!r || r.error) throw new EmailHistoryLookupError(stage, r?.error?.code ?? r?.error?.message ?? "no_result");
  if (!Array.isArray(r.data)) throw new EmailHistoryLookupError(stage, "no_data");
  return r.data;
}

export async function loadEmailHistory(rawEmails: string[], deps: EmailHistoryDeps): Promise<EmailHistory> {
  const lower = Array.from(new Set(rawEmails.map(normEmail).filter(Boolean)));
  // Query both the original casing and lowercase, since contacts.email is not normalised.
  const variants = Array.from(new Set([...rawEmails.map((e) => (e ?? "").trim()).filter(Boolean), ...lower]));
  const contacts: HistoryContact[] = [];
  for (let i = 0; i < variants.length; i += CHUNK) {
    contacts.push(...await settle("contacts", deps.fetchContactsByEmails(variants.slice(i, i + CHUNK))));
  }
  const contactsByEmail = new Map<string, HistoryContact[]>();
  const seen = new Set<string>();
  for (const c of contacts) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const k = normEmail(c.email);
    if (!k) continue;
    if (!contactsByEmail.has(k)) contactsByEmail.set(k, []);
    contactsByEmail.get(k)!.push(c);
  }
  const ids = Array.from(seen);
  const eventsByContact = new Map<string, Set<string>>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = await settle("email_events", deps.fetchEventsByContactIds(ids.slice(i, i + CHUNK)));
    for (const e of rows) {
      if (!eventsByContact.has(e.contact_id)) eventsByContact.set(e.contact_id, new Set());
      eventsByContact.get(e.contact_id)!.add(String(e.event_type));
    }
  }
  const byEmail = new Map<string, Set<string>>();
  for (const k of lower) {
    const flags = new Set<string>();
    const cs = contactsByEmail.get(k) ?? [];
    if (cs.length > 1) flags.add("duplicate_crm_email");
    for (const c of cs) {
      const ev = eventsByContact.get(c.id) ?? new Set<string>();
      if (ev.has("bounced") || c.hard_bounced) flags.add("bounced");
      if (ev.has("replied")) flags.add("replied");
      if (c.unsubscribed_at) flags.add("unsubscribed");
      if (c.unsubscribed_at || c.is_globally_suppressed || c.sendable_status === "suppressed" ||
          String(c.status ?? "").toUpperCase() === "DO_NOT_CONTACT") flags.add("suppressed");
      if (ev.has("sent") || ev.has("delivered")) flags.add("previously_emailed");
    }
    byEmail.set(k, flags);
  }
  return { byEmail, contactsByEmail, contacts: Array.from(new Map(contacts.map((c) => [c.id, c])).values()), provider_history_checked: false };
}

/** Supabase-client adapter. */
// deno-lint-ignore no-explicit-any
export function supabaseEmailHistoryDeps(admin: any): EmailHistoryDeps {
  return {
    fetchContactsByEmails: (emails) => admin.from("contacts")
      .select("id,email,status,sendable_status,hard_bounced,is_globally_suppressed,unsubscribed_at,apollo_person_id")
      .in("email", emails),
    fetchEventsByContactIds: (ids) => admin.from("email_events")
      .select("contact_id,event_type").in("contact_id", ids).in("event_type", ["bounced", "replied", "sent", "delivered"]),
  };
}

/** Reply/bounce stop rule: which queued steps must be cancelled for a contact. */
export function stepsToCancelOnStop<T extends { status: string; sequence_step: number }>(rows: T[]): T[] {
  return rows.filter((r) => ["pending", "scheduled", "queued", "approved"].includes(r.status));
}
