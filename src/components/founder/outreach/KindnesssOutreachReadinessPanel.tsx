import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { KINDNESSS_DRAFT_ID, KINDNESSS_STEP_DAYS, validateSequence, type SequenceStep } from '@/lib/kindnesss/sequencePlan';

type Meta = { sequence_version?: string; provider_state?: string; five_touch_copy_status?: string; previous_versions?: { version: string; sha256: string }[] };
const db = supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }> };

/** Founder-only, read-only view: five-touch draft copy + archive-to-CRM dry-run counts. Nothing here sends or syncs. */
export default function KindnesssOutreachReadinessPanel() {
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [dry, setDry] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    void supabase.from('outreach_campaign_drafts').select('email_sequence').eq('id', KINDNESSS_DRAFT_ID).maybeSingle().then(({ data, error }) => {
      if (error) return setErr(error.message);
      const es = (data?.email_sequence ?? {}) as { steps?: SequenceStep[]; metadata?: Meta };
      setSteps(es.steps ?? []); setMeta(es.metadata ?? {});
    });
  }, []);

  async function runDry() {
    const { data, error } = await db.rpc('apollo_intel_promotion_dry_run');
    if (error) return setErr(error.message);
    setDry(data as Record<string, unknown>);
  }

  const check = validateSequence(steps);
  return <section className="space-y-4 border-b border-border pb-6" aria-label="Kindnesss outreach readiness">
    <h2 className="text-xl font-semibold">Kindnesss · Five-touch email draft (not sent, not synced)</h2>
    {err && <p className="text-sm text-destructive">{err}</p>}
    <p className="text-sm text-muted-foreground">Version {meta.sequence_version ?? '—'} · {steps.length} steps · copy status {meta.five_touch_copy_status ?? '—'} · Smartlead: {meta.provider_state ?? '—'} · backups kept: {meta.previous_versions?.map(v => v.version).join(', ') || 'none'}</p>
    <p className={`text-sm ${check.ok ? 'text-primary' : 'text-destructive'}`}>Checks: {check.ok ? 'pass (5 steps, signature, unsubscribe, threaded, close only at the end)' : check.problems.join(', ')}</p>
    <ol className="space-y-3">
      {steps.map((s, i) => <li key={s.step} className="tech-card p-3">
        <div className="text-sm font-medium">Email {s.step} · Day {KINDNESSS_STEP_DAYS[i] ?? '?'} · {s.subject || '(same thread)'} · {s.key}</div>
        <details><summary className="cursor-pointer text-xs text-muted-foreground">Show text</summary><pre className="mt-2 whitespace-pre-wrap text-xs">{s.body.replace(/<table[\s\S]*<\/table>/, '[unsubscribe footer]')}</pre></details>
      </li>)}
    </ol>
    <div className="space-y-2">
      <Button variant="outline" onClick={runDry}>Preview archive → CRM promotion (counts only)</Button>
      {dry && <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground" aria-label="Promotion dry run">{JSON.stringify(dry, null, 2)}</pre>}
    </div>
  </section>;
}
