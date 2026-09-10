/**
 * Bulk mailbox registration parser + validator.
 *
 * PURE. No IO. Turns a pasted CSV block into validated, deduplicated mailbox
 * rows ready for an idempotent apply. Designed so ~50 mailboxes can be
 * registered in one go without creating them one at a time.
 *
 * SAFETY: never assigns a mailbox to a business it was not explicitly given,
 * and refuses to attach anything to the legacy Neon Candy estate.
 */

export const MAILBOX_PARSER_VERSION = "mailbox-registration-parser-1.0.0";

export const LEGACY_NEON_CANDY_ESTATE = "neon-candy-legacy";

export const MAILBOX_CSV_HEADERS = [
  "email_address",
  "business_name",
  "estate_key",
  "sending_domain",
  "from_name",
  "reply_to_email",
  "daily_send_limit",
  "ramp_daily_cap",
  "warmup_status",
  "provider_mailbox_id",
  "mailbox_owner",
] as const;

export type MailboxCsvHeader = (typeof MAILBOX_CSV_HEADERS)[number];

export interface ParsedMailboxRow {
  row_number: number;
  email_address: string;
  business_name: string;
  estate_key: string;
  sending_domain: string;
  from_name: string | null;
  reply_to_email: string | null;
  daily_send_limit: number;
  ramp_daily_cap: number;
  warmup_status: string;
  provider_mailbox_id: string | null;
  mailbox_owner: string | null;
  allowed_business_names: string[];
}

export interface MailboxRowError {
  row_number: number;
  email_address: string | null;
  codes: string[];
  detail: string;
}

export interface MailboxParseResult {
  ok: boolean;
  submitted_rows: number;
  valid: ParsedMailboxRow[];
  errors: MailboxRowError[];
  duplicates_in_batch: string[];
  parser_version: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Safe daily ceiling for a brand-new mailbox. Never assume hundreds a day. */
export const DEFAULT_RAMP_DAILY_CAP = 10;
export const MAX_RAMP_DAILY_CAP = 50;
export const DEFAULT_DAILY_SEND_LIMIT = 25;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === "\t") && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Parse a pasted CSV/TSV block. The first non-empty line MUST be a header row
 * containing at least `email_address` and `business_name`.
 */
export function parseMailboxCsv(input: string): MailboxParseResult {
  const lines = String(input ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      submitted_rows: 0,
      valid: [],
      errors: [{ row_number: 0, email_address: null, codes: ["empty_input"], detail: "No rows supplied." }],
      duplicates_in_batch: [],
      parser_version: MAILBOX_PARSER_VERSION,
    };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  if (!header.includes("email_address") || !header.includes("business_name")) {
    return {
      ok: false,
      submitted_rows: 0,
      valid: [],
      errors: [
        {
          row_number: 1,
          email_address: null,
          codes: ["missing_header"],
          detail: `Header row must include email_address and business_name. Expected columns: ${MAILBOX_CSV_HEADERS.join(", ")}`,
        },
      ],
      duplicates_in_batch: [],
      parser_version: MAILBOX_PARSER_VERSION,
    };
  }

  const idx = (name: MailboxCsvHeader) => header.indexOf(name);
  const body = lines.slice(1);
  const valid: ParsedMailboxRow[] = [];
  const errors: MailboxRowError[] = [];
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  body.forEach((line, i) => {
    const rowNumber = i + 2; // 1-based, +1 for header
    const cells = splitCsvLine(line);
    const get = (name: MailboxCsvHeader): string => {
      const at = idx(name);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };

    const email = get("email_address").toLowerCase();
    const business = get("business_name");
    const codes: string[] = [];

    if (!email) codes.push("missing_email_address");
    else if (!EMAIL_RE.test(email)) codes.push("invalid_email_address");
    if (!business) codes.push("missing_business_name");

    const estate = (get("estate_key") || "unassigned").toLowerCase();
    if (estate === LEGACY_NEON_CANDY_ESTATE) {
      codes.push("legacy_neon_candy_estate_is_read_only");
    }
    if (business.toLowerCase().startsWith("neon candy") && estate !== LEGACY_NEON_CANDY_ESTATE) {
      codes.push("neon_candy_must_stay_in_legacy_estate");
    }

    const domainFromEmail = email.includes("@") ? email.split("@")[1] : "";
    const sendingDomain = (get("sending_domain") || domainFromEmail).toLowerCase();
    if (!sendingDomain) codes.push("missing_sending_domain");

    const rampCap = toInt(get("ramp_daily_cap"), DEFAULT_RAMP_DAILY_CAP);
    if (rampCap > MAX_RAMP_DAILY_CAP) codes.push("ramp_daily_cap_exceeds_safe_maximum");

    const replyTo = get("reply_to_email") || null;
    if (replyTo && !EMAIL_RE.test(replyTo)) codes.push("invalid_reply_to_email");

    if (email) {
      const prev = seen.get(email);
      if (prev !== undefined) {
        codes.push("duplicate_within_batch");
        if (!duplicates.includes(email)) duplicates.push(email);
      } else {
        seen.set(email, rowNumber);
      }
    }

    if (codes.length > 0) {
      errors.push({
        row_number: rowNumber,
        email_address: email || null,
        codes,
        detail: codes.join(", "),
      });
      return;
    }

    valid.push({
      row_number: rowNumber,
      email_address: email,
      business_name: business,
      estate_key: estate,
      sending_domain: sendingDomain,
      from_name: get("from_name") || null,
      reply_to_email: replyTo,
      daily_send_limit: toInt(get("daily_send_limit"), DEFAULT_DAILY_SEND_LIMIT),
      ramp_daily_cap: rampCap,
      warmup_status: (get("warmup_status") || "not_started").toLowerCase(),
      provider_mailbox_id: get("provider_mailbox_id") || null,
      mailbox_owner: get("mailbox_owner") || null,
      // Segregation: a mailbox may only be used by the business it was registered for.
      allowed_business_names: [business],
    });
  });

  return {
    ok: errors.length === 0 && valid.length > 0,
    submitted_rows: body.length,
    valid,
    errors,
    duplicates_in_batch: duplicates,
    parser_version: MAILBOX_PARSER_VERSION,
  };
}

export interface ExistingMailbox {
  id: string;
  email_address: string;
  estate_key?: string | null;
  segregation_locked?: boolean | null;
}

export interface MailboxPlanItem {
  row_number: number;
  email_address: string;
  action: "insert" | "update" | "skip";
  reason: string | null;
  existing_id: string | null;
  row: ParsedMailboxRow;
}

/**
 * Idempotent plan: re-running the same batch produces updates, never duplicates.
 * A mailbox already locked into the legacy Neon Candy estate is always skipped.
 */
export function planMailboxRegistration(
  rows: ParsedMailboxRow[],
  existing: ExistingMailbox[],
): MailboxPlanItem[] {
  const byEmail = new Map(existing.map((e) => [e.email_address.toLowerCase(), e]));
  return rows.map((row) => {
    const hit = byEmail.get(row.email_address);
    if (!hit) {
      return { row_number: row.row_number, email_address: row.email_address, action: "insert" as const, reason: null, existing_id: null, row };
    }
    if ((hit.estate_key ?? "").toLowerCase() === LEGACY_NEON_CANDY_ESTATE) {
      return {
        row_number: row.row_number,
        email_address: row.email_address,
        action: "skip" as const,
        reason: "legacy_neon_candy_mailbox_is_protected",
        existing_id: hit.id,
        row,
      };
    }
    return {
      row_number: row.row_number,
      email_address: row.email_address,
      action: "update" as const,
      reason: "already_registered_will_update_in_place",
      existing_id: hit.id,
      row,
    };
  });
}

/** Row payload written to public.inboxes. Readiness always starts FALSE. */
export function toInboxRow(row: ParsedMailboxRow, batchId: string | null): Record<string, unknown> {
  return {
    email_address: row.email_address,
    business_name: row.business_name,
    estate_key: row.estate_key,
    estate_provider: "smartlead",
    allowed_business_names: row.allowed_business_names,
    segregation_locked: true,
    from_name: row.from_name,
    from_email: row.email_address,
    reply_to_email: row.reply_to_email,
    daily_send_limit: row.daily_send_limit,
    ramp_daily_cap: row.ramp_daily_cap,
    warmup_status: row.warmup_status,
    provider_mailbox_id: row.provider_mailbox_id,
    mailbox_owner: row.mailbox_owner,
    // Nothing is trusted until the provider itself confirms it.
    smtp_ready: false,
    imap_ready: false,
    provider_ready: false,
    warmup_ready: false,
    excluded_from_allocation: false,
    active: true,
    registration_batch_id: batchId,
  };
}
