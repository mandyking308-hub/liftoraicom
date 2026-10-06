/** Founder UI helpers for the GSM->Smartlead canary mailbox whitelist. */
export const GSM_CANARY_MAX_APPLY = 10;
export const GSM_CONNECT_CONFIRMATION = "CONNECT GSM MAILBOXES TO SMARTLEAD";

/** Parse comma/newline/semicolon/space separated emails: trim, lowercase, de-duplicate (order kept). */
export function parseCanaryEmails(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (e && !seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

export function canApplyCanary(emails: string[]): boolean {
  return emails.length >= 1 && emails.length <= GSM_CANARY_MAX_APPLY;
}

/** Preview body: whole estate when blank, scoped list when populated. */
export function buildPreviewBody(emails: string[]): Record<string, unknown> {
  return emails.length ? { apply: false, emails } : { apply: false };
}

/** Apply body: exactly the normalized list plus the exact confirmation. Throws if out of range. */
export function buildApplyBody(emails: string[]): Record<string, unknown> {
  if (!canApplyCanary(emails)) throw new Error("canary_list_must_have_1_to_10_emails");
  return { apply: true, emails, external_action_confirmation: GSM_CONNECT_CONFIRMATION };
}
