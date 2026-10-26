import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { KINDNESSS_STEP_DAYS, stepDelays } from '@/lib/kindnesss/sequencePlan';
import { evaluateSenders, summarise, LIVE_FRESH_HOURS, MIN_LIVE_HEALTH, type GsmMailboxRow, type GsmDomainRow, type LiveSnapshot } from '@/lib/kindnesss/gsmSenderSelection';

const db = supabase as unknown as { from: (t: string) => any };

/** Read-only Kindnesss sender preflight over the real GSM Winnr estate. Never activates, allocates or sends. */
export default function GsmSenderPreflightPanel() {
  const [mbx, setMbx] = useState<GsmMailboxRow[]>([]);
  const [doms, setDoms] = useState<GsmDomainRow[]>([]);
  const [sim, setSim] = useState<string[]>([]);
  const [live, setLive] = useState<LiveSnapshot>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const [m, d, i] = await Promise.all([
      db.from('gsm_mailboxes').select('id,email,provider,estate_classification,sending_domain_id,smartlead_email_account_id,smtp_status,imap_status,smartlead_status,warmup_status,readiness_state,provider_health,health_score,quarantined_reason,retired,active,last_provider_check_at').eq('estate_classification', 'gsm').order('email'),
      db.from('gsm_sending_domains').select('id,domain,estate_classification,spf_ok,dkim_ok,dmarc_ok'),
      db.from('inboxes').select('email_address,from_email,estate_key').neq('estate_key', 'gsm'),
    ]);
    setBusy(false);
    if (m.error || d.error) return toast({ title: 'Mailboxes unavailable', description: (m.error ?? d.error).message, variant: 'destructive' });
    setMbx(m.data ?? []); setDoms(d.data ?? []);
    setSim(((i.data ?? []) as { email_address?: string; from_email?: string }[]).flatMap(r => [r.email_address, r.from_email]).filter(Boolean) as string[]);
  }
  useEffect(() => { void load(); }, []);

  async function liveCheck() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('gsm-winnr-sync', { body: { action: 'test', estate: 'gsm' } });
    setBusy(false);
    if (error || !data?.ok) return toast({ title: 'Live Winnr read failed', description: error?.message ?? data?.error_code ?? data?.blocker ?? 'unknown', variant: 'destructive' });
    if (!data.live_warming_ok) return toast({ title: 'Winnr warm-up list unavailable', description: 'Mailboxes read, warm-up status not returned.', variant: 'destructive' });
    setLive({ observed_at: data.checked_at, mailboxes: data.live_warming });
  }

  const verdicts = useMemo(() => evaluateSenders(mbx, doms, live, sim), [mbx, doms, live, sim]);
  const s = summarise(verdicts);
  const domainCount = new Set(mbx.map(m => m.sending_domain_id)).size;
  const storedWarming = mbx.filter(m => m.warmup_status === 'warming').length;
  const ready = mbx.filter(m => m.readiness_state === 'campaign_ready').length;
  const lastSync = mbx.map(m => m.last_provider_check_at).filter(Boolean).sort().pop();
  const liveOn = live ? live.mailboxes.filter(l => ['warming', 'completed'].includes(l.warmup_status)).length : null;

  return <section className="space-y-4 border-b border-border pb-6" aria-label="Kindnesss GSM sender preflight">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Kindnesss · GSM Winnr senders (read-only preflight)</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh stored</Button>
        <Button size="sm" onClick={liveCheck} disabled={busy}><Radio className="mr-2 h-4 w-4" />Live Winnr warm-up check (read-only)</Button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">Senders come only from the GSM Winnr estate under the Global Solutions Management LLC sending identity. GHAT and NeonCandy are never selectable, and the simulated inbox records (including the two labelled Kindnesss) are never used as a sender source. Stored "warming" is not readiness: a sender is suggested only with a live Winnr read under {LIVE_FRESH_HOURS}h old, live health ≥ {MIN_LIVE_HEALTH}, verified DNS, Smartlead connected and campaign_ready set. Nothing here activates or sends.</p>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[['GSM addresses', mbx.length], ['Domains', domainCount], ['With Smartlead ID', mbx.filter(m => m.smartlead_email_account_id).length], ['Stored "warming" (last sync)', storedWarming],
        ['Marked campaign_ready', ready], ['Live warm-up ON', liveOn ?? 'not checked'], ['Suggested eligible senders', s.eligible], ['Last stored provider sync', lastSync ? new Date(lastSync).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—']]
        .map(([l, v]) => <div key={String(l)} className="tech-card p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-lg font-semibold">{String(v)}</div></div>)}
    </div>
    <p className="text-xs text-muted-foreground">Live read: {live ? `${live.observed_at} (${live.mailboxes.length} GSM addresses returned)` : 'not run this session'}. Blocking reasons: {Object.entries(s.reasons).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}</p>
    <details><summary className="cursor-pointer text-sm">All {mbx.length} GSM addresses</summary>
      <div className="max-h-96 overflow-auto text-xs"><table className="w-full"><thead><tr className="text-left text-muted-foreground"><th>Address</th><th>Smartlead ID</th><th>Live warm-up</th><th>Eligible</th><th>Reasons</th></tr></thead>
        <tbody>{verdicts.map(v => <tr key={v.id} className="border-t border-border"><td>{v.email}</td><td>{v.smartlead_id}</td><td>{v.live ? `${v.live.warmup_status} / ${v.live.health_score ?? '—'}` : '—'}</td><td>{v.eligible ? 'yes' : 'no'}</td><td>{v.reasons.join(', ')}</td></tr>)}</tbody></table></div>
    </details>
    <div className="tech-card p-3 text-sm space-y-1">
      <div className="font-medium">Smartlead five-email sync plan (not run)</div>
      <div>Steps: {KINDNESSS_STEP_DAYS.length} · days {KINDNESSS_STEP_DAYS.join(' / ')} · delays {stepDelays().join(' / ')} · follow-ups same thread · signature + unsubscribe in every step.</div>
      <div className="text-muted-foreground">Order before any send: founder approves copy → deploy five-step sync tool → draft-only sync to campaign 4103531 with remote DRAFTED/PAUSED check → read back five steps → attach verified senders → signing key for replies/unsubscribes (stop-on-reply) → founder turns on gates. No leads are enrolled here.</div>
    </div>
  </section>;
}
