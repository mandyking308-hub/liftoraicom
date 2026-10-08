// Pure, testable logic for Smartlead campaign read-only reconciliation.
// No network, no secrets. Used by the smartlead-campaign-sync edge function.

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const normEmail = (e: unknown): string | null =>
  typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null;

/** Only whitelisted, non-secret sender fields ever leave the provider response. */
export function sanitizeSenders(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.map((a: Record<string, unknown>) => ({
    id: a.id,
    from_name: a.from_name ?? null,
    from_email: a.from_email ?? null,
    message_per_day: num(a.message_per_day),
    daily_sent_count: num(a.daily_sent_count),
    smtp_ok: a.is_smtp_success === true,
    imap_ok: a.is_imap_success === true,
    smtp_error: a.smtp_failure_error ? "smtp_failure" : null,
    imap_error: a.imap_failure_error ? "imap_failure" : null,
  }));
}

export function mapCampaignSnapshot(campaign: Record<string, unknown>, analytics: Record<string, unknown>) {
  const s = (analytics?.campaign_lead_stats ?? {}) as Record<string, unknown>;
  return {
    campaign_name: (campaign?.name ?? analytics?.name ?? null) as string | null,
    campaign_status: (campaign?.status ?? analytics?.status ?? null) as string | null,
    track_settings: Array.isArray(campaign?.track_settings) ? (campaign.track_settings as string[]) : null,
    max_leads_per_day: num(campaign?.max_leads_per_day),
    total_leads: num(s.total),
    not_started: num(s.notStarted),
    in_progress: num(s.inprogress),
    completed: num(s.completed),
    blocked: num(s.blocked),
    stopped: num(s.stopped),
    interested: num(s.interested),
    sent_count: num(analytics?.sent_count),
    unique_sent_count: num(analytics?.unique_sent_count),
    open_count: num(analytics?.open_count),
    unique_open_count: num(analytics?.unique_open_count),
    click_count: num(analytics?.click_count),
    unique_click_count: num(analytics?.unique_click_count),
    reply_count: num(analytics?.reply_count),
    bounce_count: num(analytics?.bounce_count),
    unsubscribed_count: num(analytics?.unsubscribed_count),
  };
}

export interface HistoryMsg {
  type?: string; message_id?: string; stats_id?: string; time?: string;
  email_body?: string; subject?: string; from?: string; to?: string;
  email_seq_number?: string | number; open_count?: number; click_count?: number;
}

export function dedupeKey(m: HistoryMsg): string {
  if (m.message_id) return `mid:${m.message_id}`;
  if (m.stats_id) return `sid:${m.stats_id}:${m.type ?? ""}`;
  return `t:${m.type ?? ""}:${m.time ?? ""}:${m.email_seq_number ?? ""}`;
}

export const stripHtml = (h: string) =>
  h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function summarizeHistory(history: HistoryMsg[]) {
  const sent = history.filter((m) => (m.type ?? "").toUpperCase() === "SENT");
  const replies = history.filter((m) => (m.type ?? "").toUpperCase() === "REPLY");
  const times = (a: HistoryMsg[]) => a.map((m) => m.time).filter(Boolean).sort() as string[];
  const st = times(sent), rt = times(replies);
  const lastReply = replies.slice().sort((a, b) => String(a.time).localeCompare(String(b.time))).pop();
  const opens = sent.reduce((n, m) => n + (num(m.open_count) ?? 0), 0);
  const clicks = sent.reduce((n, m) => n + (num(m.click_count) ?? 0), 0);
  return {
    sent_count: sent.length,
    reply_count: replies.length,
    first_sent_at: st[0] ?? null,
    last_sent_at: st[st.length - 1] ?? null,
    last_reply_at: rt[rt.length - 1] ?? null,
    last_reply_preview: lastReply?.email_body ? stripHtml(lastReply.email_body).slice(0, 280) : null,
    open_count: sent.length ? opens : null,
    click_count: sent.length ? clicks : null,
    last_event_at: [...st, ...rt].sort().pop() ?? null,
  };
}

/** Rejects a campaign that is not mapped to exactly this active business. */
export function assertMapping(
  businessId: string,
  campaignId: string,
  mappings: Array<{ business_id: string; provider_campaign_id: string; mapping_status: string | null }>,
): { ok: true } | { ok: false; error: string } {
  const forCampaign = mappings.filter((m) => String(m.provider_campaign_id) === String(campaignId));
  if (forCampaign.length === 0) return { ok: false, error: "campaign_not_mapped" };
  if (forCampaign.some((m) => m.business_id !== businessId)) return { ok: false, error: "campaign_mapped_to_other_business" };
  if (!forCampaign.some((m) => m.mapping_status === "mapped")) return { ok: false, error: "mapping_not_confirmed" };
  return { ok: true };
}

/** Exponential backoff schedule for retryable provider errors. */
export const isRetryable = (status: number) => status === 429 || status >= 500;
export const backoffMs = (attempt: number) => Math.min(8000, 500 * 2 ** (attempt - 1));

/** Smartlead POST /campaigns/{id}/reply-email-thread body. Fails closed on missing fields. */
export function buildReplyPayload(leadId: unknown, body: unknown, replyMessageId: unknown, replyTime: unknown) {
  const t = typeof replyTime === "string" ? new Date(replyTime) : null;
  if (!leadId || typeof body !== "string" || !body.trim() || !replyMessageId || !t || isNaN(t.getTime())) {
    throw new Error("reply_payload_incomplete");
  }
  return { lead_id: Number(leadId), email_body: body, reply_message_id: String(replyMessageId), reply_email_time: t.toISOString() };
}

export const trackingFlags = (track: string[] | null | undefined) => ({
  opensTracked: Array.isArray(track) ? !track.includes("DONT_EMAIL_OPEN") : null,
  clicksTracked: Array.isArray(track) ? !track.includes("DONT_LINK_CLICK") : null,
});

export interface ActivityEvent {
  event_type: string;
  dedupe_key: string;
  provider_message_id: string | null;
  occurred_at: string | null;
  details: Record<string, unknown>;
}

/**
 * Derive durable, idempotent activity events from real provider data only.
 * Message events are keyed on provider message ids; state events are keyed on
 * lead + state, so repeated syncs never duplicate. No data -> no events.
 */
export function deriveActivityEvents(
  leadId: string,
  lead: { status?: unknown; is_unsubscribed?: unknown; lead_category_id?: unknown },
  history: HistoryMsg[],
): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  history.forEach((m, i) => {
    const t = String(m.type ?? "").toUpperCase();
    const base = dedupeKey(m);
    const occurred = m.time ? String(m.time) : null;
    if (t === "SENT") {
      out.push({ event_type: i === 0 || String(m.email_seq_number) === "1" ? "first_email_sent" : "email_sent", dedupe_key: `sent:${base}`, provider_message_id: m.message_id ?? null, occurred_at: occurred, details: { sequence: m.email_seq_number ?? null } });
      const opens = num(m.open_count) ?? 0, clicks = num(m.click_count) ?? 0;
      if (opens > 0) out.push({ event_type: "email_open_approximate", dedupe_key: `open:${base}:${opens}`, provider_message_id: m.message_id ?? null, occurred_at: null, details: { open_count: opens, note: "tracked open, approximate; not proof of read" } });
      if (clicks > 0) out.push({ event_type: "email_link_click", dedupe_key: `click:${base}:${clicks}`, provider_message_id: m.message_id ?? null, occurred_at: null, details: { click_count: clicks } });
    } else if (t === "REPLY") {
      out.push({ event_type: "email_reply", dedupe_key: `reply:${base}`, provider_message_id: m.message_id ?? null, occurred_at: occurred, details: { preview: m.email_body ? stripHtml(String(m.email_body)).slice(0, 200) : null } });
    } else if (t) {
      out.push({ event_type: `message_${t.toLowerCase()}`, dedupe_key: `msg:${base}`, provider_message_id: m.message_id ?? null, occurred_at: occurred, details: {} });
    }
  });
  if (lead.is_unsubscribed === true) out.push({ event_type: "lead_unsubscribed", dedupe_key: `unsub:${leadId}`, provider_message_id: null, occurred_at: null, details: {} });
  const st = String(lead.status ?? "").toUpperCase();
  if (st === "BLOCKED") out.push({ event_type: "lead_blocked_or_bounced", dedupe_key: `blocked:${leadId}`, provider_message_id: null, occurred_at: null, details: { provider_status: st } });
  if (st && st !== "STARTED") out.push({ event_type: "lead_status_changed", dedupe_key: `status:${leadId}:${st}`, provider_message_id: null, occurred_at: null, details: { provider_status: st } });
  if (lead.lead_category_id != null) out.push({ event_type: "lead_category_updated", dedupe_key: `cat:${leadId}:${lead.lead_category_id}`, provider_message_id: null, occurred_at: null, details: { category_id: String(lead.lead_category_id) } });
  return out;
}

/** Which Liftor protective action an event requires (this contact only). */
export function suppressionFor(eventType: string): "do_not_contact" | "stop_followups" | null {
  if (eventType === "lead_unsubscribed" || eventType === "lead_blocked_or_bounced") return "do_not_contact";
  if (eventType === "email_reply") return "stop_followups";
  return null;
}
