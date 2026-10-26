// Kindnesss sender preflight over the real GSM Winnr estate (public.gsm_mailboxes).
// Read-only: nothing here activates, allocates or sends. Stored "warming" is never readiness.

export const LIVE_FRESH_HOURS = 24;
export const MIN_LIVE_HEALTH = 95;

export type GsmMailboxRow = {
  id: string; email: string; provider: string; estate_classification: string;
  sending_domain_id: string | null; smartlead_email_account_id: string | null;
  smtp_status: string; imap_status: string; smartlead_status: string; warmup_status: string;
  readiness_state: string; provider_health: string; health_score: number;
  quarantined_reason: string | null; retired: boolean; active: boolean;
  last_provider_check_at: string | null;
};
export type GsmDomainRow = { id: string; domain: string; estate_classification: string; spf_ok: boolean; dkim_ok: boolean; dmarc_ok: boolean };
/** Live Winnr warm-up observation for one address (read-only provider read). */
export type LiveWarming = { email: string; warmup_status: string; health_score: number | null };
export type LiveSnapshot = { observed_at: string; mailboxes: LiveWarming[] } | null;

export type SenderVerdict = { id: string; email: string; domain: string | null; smartlead_id: string | null; eligible: boolean; reasons: string[]; live: LiveWarming | null };

export function evaluateSenders(
  mailboxes: GsmMailboxRow[], domains: GsmDomainRow[], live: LiveSnapshot,
  simulatedInboxEmails: string[], now: Date = new Date(),
): SenderVerdict[] {
  const dom = new Map(domains.map(d => [d.id, d]));
  const sim = new Set(simulatedInboxEmails.map(e => e.trim().toLowerCase()));
  const liveFresh = !!live && (now.getTime() - Date.parse(live.observed_at)) / 36e5 <= LIVE_FRESH_HOURS;
  const liveBy = new Map((live?.mailboxes ?? []).map(m => [m.email.toLowerCase(), m]));
  return mailboxes.map(m => {
    const email = m.email.trim().toLowerCase();
    const d = m.sending_domain_id ? dom.get(m.sending_domain_id) : undefined;
    const l = liveBy.get(email) ?? null;
    const r: string[] = [];
    if (sim.has(email)) r.push('excluded_inbox_record');
    if (m.provider !== 'winnr') r.push('not_winnr_provider');
    if (m.estate_classification !== 'gsm') r.push(`estate_${m.estate_classification}_excluded`);
    if (!d || d.estate_classification !== 'gsm') r.push('domain_not_gsm');
    else if (!(d.spf_ok && d.dkim_ok && d.dmarc_ok)) r.push('domain_dns_not_verified');
    if (m.retired) r.push('retired');
    if (!m.active) r.push('inactive');
    if (m.quarantined_reason) r.push('quarantined');
    if (!m.smartlead_email_account_id) r.push('no_smartlead_account');
    if (m.smtp_status !== 'ok' || m.imap_status !== 'ok') r.push('smtp_imap_not_ok');
    if (m.smartlead_status !== 'connected') r.push('smartlead_not_connected');
    if (m.provider_health !== 'healthy') r.push('provider_unhealthy');
    if (!liveFresh) r.push('live_warmup_not_verified_fresh');
    else if (!l) r.push('missing_from_live_read');
    else {
      if (!['warming', 'completed'].includes(l.warmup_status)) r.push(`live_warmup_${l.warmup_status}`);
      if (l.health_score === null || l.health_score < MIN_LIVE_HEALTH) r.push('live_health_below_threshold');
    }
    if (m.readiness_state !== 'campaign_ready') r.push('not_campaign_ready');
    return { id: m.id, email, domain: d?.domain ?? null, smartlead_id: m.smartlead_email_account_id, eligible: r.length === 0, reasons: r, live: l };
  });
}

export function summarise(v: SenderVerdict[]) {
  const reasons: Record<string, number> = {};
  v.forEach(x => x.reasons.forEach(k => { reasons[k] = (reasons[k] ?? 0) + 1; }));
  return { total: v.length, eligible: v.filter(x => x.eligible).length, reasons };
}
