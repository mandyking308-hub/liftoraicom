import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { retentionCsv } from '@/lib/apolloRetention';
import { toast } from '@/hooks/use-toast';

const db = supabase as unknown as { rpc: (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
type Pool = Record<string, number> & { apollo_email_status?: Record<string, number>; net_by_segment?: Record<string, number> };

const TILES: [string, string][] = [
  ['email_bearing_rows', 'Rows with an email'],
  ['unique_emails', 'Unique email addresses'],
  ['duplicate_rows', 'Duplicate rows (merged)'],
  ['neoncandy_excluded', 'NeonCandy / other business (excluded)'],
  ['hard_suppressed', 'Opted out / suppressed / bounced (excluded)'],
  ['net_kindnesss_audience', 'Net Kindnesss email audience'],
  ['deliverability_review_catch_all', 'Catch-all (kept, check deliverability)'],
  ['deliverability_review_not_verified', 'Not "Verified" (kept, check deliverability)'],
  ['already_in_crm', 'Already in CRM'],
  ['prior_interaction', 'Contacted or replied before'],
];

/** Founder-only live counts of the full Kindnesss email pool. Separates "has email" from "send-safe"; nothing here enrols or sends. */
export default function KindnesssEmailPoolPanel() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const { data, error } = await db.rpc('kindnesss_email_candidate_pool', { p_include_rows: false });
    setBusy(false);
    if (error) return toast({ title: 'Counts unavailable', description: error.message, variant: 'destructive' });
    setPool(data as Pool);
  }
  useEffect(() => { void load(); }, []);

  async function exportPool() {
    setBusy(true);
    try {
      const { data, error } = await db.rpc('kindnesss_email_candidate_pool', { p_include_rows: true });
      if (error) throw new Error(error.message);
      const r = data as { rows: Record<string, unknown>[]; audit_id: string };
      const url = URL.createObjectURL(new Blob([retentionCsv(r.rows)], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `kindnesss-email-candidates-${r.rows.length}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast({ title: 'Export failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }); }
    finally { setBusy(false); }
  }

  return <section className="space-y-4 border-b border-border pb-6" aria-label="Kindnesss email audience">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Kindnesss · Email audience (live counts)</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        <Button size="sm" onClick={exportPool} disabled={busy}><Download className="mr-2 h-4 w-4" />Export email candidates (one row per address)</Button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">Everyone with an email is in the pool. Only NeonCandy/other-business, opted-out, suppressed or bounced addresses are excluded. Catch-all and non-verified addresses stay in, flagged for a deliverability check. This is not legal clearance, and nothing here adds people to a campaign or sends email.</p>
    {pool && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {TILES.map(([k, label]) => <div key={k} className={`tech-card p-3 ${k === 'net_kindnesss_audience' ? 'border-primary' : ''}`}>
          <div className="text-2xl font-semibold">{(pool[k] ?? 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>)}
      </div>
      <p className="text-sm text-muted-foreground">Apollo email status: {Object.entries(pool.apollo_email_status ?? {}).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ')}</p>
      <p className="text-sm text-muted-foreground">Net audience by segment (keyword guess from industry/keywords, adjust when segmenting): {Object.entries(pool.net_by_segment ?? {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v.toLocaleString()}`).join(' · ')}</p>
    </>}
  </section>;
}
