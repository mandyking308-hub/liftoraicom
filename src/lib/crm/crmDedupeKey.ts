/**
 * CRM dedupe key generator.
 * Stable, lowercase, deterministic. Used to make capture idempotent.
 */
export interface DedupeInput {
  provider_type?: string | null;
  external_event_id?: string | null;
  provider_message_id?: string | null;
  interaction_type?: string | null;
  contact_email?: string | null;
  source_system?: string | null;
  source_channel?: string | null;
  subject?: string | null;
  occurred_at?: string | Date | null;
}

const norm = (v?: string | null) => (v ?? "").toString().trim().toLowerCase();

function minuteBucket(occurredAt?: string | Date | null): string {
  if (!occurredAt) return "";
  const d = typeof occurredAt === "string" ? new Date(occurredAt) : occurredAt;
  if (Number.isNaN(d.getTime())) return "";
  const iso = d.toISOString(); // 2026-05-15T12:34:56.000Z
  return iso.slice(0, 16); // minute precision
}

// Tiny non-crypto stable hash (FNV-1a 32-bit) → base36 string.
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

export function buildCrmDedupeKey(input: DedupeInput): string {
  const provider = norm(input.provider_type);
  const ext = norm(input.external_event_id);
  const msg = norm(input.provider_message_id);
  const type = norm(input.interaction_type);
  const email = norm(input.contact_email);

  if (provider && ext) return `${provider}:${ext}`;
  if (provider && msg && type) return `${provider}:${msg}:${type}`;
  if (email && type) {
    const bucket = minuteBucket(input.occurred_at);
    if (bucket) return `email:${email}:${type}:${bucket}`;
    return `email:${email}:${type}`;
  }
  const fallback = [
    norm(input.source_system),
    norm(input.source_channel),
    email,
    norm(input.subject),
    minuteBucket(input.occurred_at),
  ].join("|");
  return `hash:${fnv1a(fallback)}`;
}

export default buildCrmDedupeKey;