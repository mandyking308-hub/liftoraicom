import { describe, it, expect } from 'vitest';
import { evaluateSenders, type GsmMailboxRow, type GsmDomainRow } from '@/lib/kindnesss/gsmSenderSelection';

const now = new Date('2026-10-26T17:00:00Z');
const dom: GsmDomainRow = { id: 'd1', domain: 'gsmlabs.co', estate_classification: 'gsm', spf_ok: true, dkim_ok: true, dmarc_ok: true };
const ghatDom: GsmDomainRow = { ...dom, id: 'd2', domain: 'ghat.org', estate_classification: 'ghat' };
const mb = (o: Partial<GsmMailboxRow> = {}): GsmMailboxRow => ({
  id: 'm1', email: 'a@gsmlabs.co', provider: 'winnr', estate_classification: 'gsm', sending_domain_id: 'd1',
  smartlead_email_account_id: '1', smtp_status: 'ok', imap_status: 'ok', smartlead_status: 'connected',
  warmup_status: 'warming', readiness_state: 'campaign_ready', provider_health: 'healthy', health_score: 99,
  quarantined_reason: null, retired: false, active: true, last_provider_check_at: null, ...o,
});
const fresh = { observed_at: '2026-10-26T16:00:00Z', mailboxes: [{ email: 'a@gsmlabs.co', warmup_status: 'warming', health_score: 99 }] };
const run = (m: GsmMailboxRow, live: Parameters<typeof evaluateSenders>[2] = fresh, sim: string[] = []) =>
  evaluateSenders([m], [dom, ghatDom], live, sim, now)[0];

describe('Kindnesss GSM sender preflight', () => {
  it('eligible only with fresh live warm-up, health and campaign_ready', () => expect(run(mb()).eligible).toBe(true));
  it('simulated inbox address excluded', () => expect(run(mb(), fresh, ['A@gsmlabs.co']).reasons).toContain('simulated_inbox_record'));
  it('GHAT excluded', () => expect(run(mb({ estate_classification: 'ghat', sending_domain_id: 'd2' })).eligible).toBe(false));
  it('stored warming without a live read is not ready', () => expect(run(mb(), null).reasons).toContain('live_warmup_not_verified_fresh'));
  it('stale live read (>24h) is not ready', () => expect(run(mb(), { ...fresh, observed_at: '2026-10-23T15:33:55Z' }).eligible).toBe(false));
  it('not campaign_ready excluded even when warming live', () => expect(run(mb({ readiness_state: 'warming' })).reasons).toContain('not_campaign_ready'));
  it('live warm-up off excluded', () => expect(run(mb(), { ...fresh, mailboxes: [{ email: 'a@gsmlabs.co', warmup_status: 'not_started', health_score: 99 }] }).eligible).toBe(false));
  it('retired, quarantined, low health excluded', () => {
    expect(run(mb({ retired: true })).eligible).toBe(false);
    expect(run(mb({ quarantined_reason: 'x' })).eligible).toBe(false);
    expect(run(mb(), { ...fresh, mailboxes: [{ email: 'a@gsmlabs.co', warmup_status: 'warming', health_score: 90 }] }).eligible).toBe(false);
  });
  it('non-winnr provider excluded', () => expect(run(mb({ provider: 'simulated' })).eligible).toBe(false));
});
