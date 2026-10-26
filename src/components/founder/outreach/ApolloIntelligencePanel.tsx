import { useState } from 'react';
import { Download, Upload, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { parseApolloIntelligenceCsv, chunkRows, type IntelParse } from '@/lib/apolloIntelligence';
import { retentionCsv } from '@/lib/apolloRetention';
import { toast } from '@/hooks/use-toast';

// New tables/RPCs are not in generated types yet; keep calls untyped but founder-gated server-side.
const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>; from: typeof supabase.from };
type Loaded = { parse: IntelParse; sha: string; name: string };
type Totals = Record<string, number>;
type Rec = { id: string; apollo_contact_id: string; first_name: string | null; last_name: string | null; company: string | null; primary_email: string | null; readiness_status: string; readiness_reasons: string[]; founder_mark: string | null; lists: string | null };

const sum = (a: Totals, b: Totals) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, (a[k] ?? 0) + (Number(b[k]) || 0)]));

export default function ApolloIntelligencePanel() {
  const [file, setFile] = useState<Loaded | null>(null);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [q, setQ] = useState('');
  const [recs, setRecs] = useState<Rec[]>([]);
  const fail = (title: string, e: unknown) => toast({ title, description: e instanceof Error ? e.message : String(e), variant: 'destructive' });

  async function run(preview: boolean) {
    if (!file) return;
    setBusy(true); setProgress(0);
    try {
      const chunks = chunkRows(file.parse.rows);
      let totals: Totals = {}; let batch: string | null = null;
      for (let i = 0; i < chunks.length; i++) {
        const { data, error } = await db.rpc('apollo_intel_import_chunk', { p_file_sha256: file.sha, p_file_name: file.name, p_expected_rows: file.parse.rows.length, p_header: file.parse.header, p_rows: chunks[i], p_preview: preview });
        if (error) throw new Error(`Chunk ${i + 1}/${chunks.length}: ${error.message}. Re-run to resume; completed rows are skipped.`);
        const r = data as Totals & { batch_id: string | null };
        batch = r.batch_id ?? batch; const { batch_id: _b, preview: _p, ...n } = r as Record<string, unknown>; totals = sum(totals, n as Totals);
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      let fin: unknown = null;
      if (!preview && batch) { const { data, error } = await db.rpc('apollo_intel_finalize', { p_batch_id: batch }); if (error) throw new Error(error.message); fin = data; }
      setReport(JSON.stringify({ mode: preview ? 'preview (nothing written)' : 'import', rows: file.parse.rows.length, file_sha256: file.sha, totals, reconciliation: fin }, null, 2));
    } catch (e) { fail(preview ? 'Preview blocked' : 'Import paused', e); }
    finally { setBusy(false); }
  }

  async function load(f?: File) {
    setFile(null); setReport('');
    if (!f) return;
    try {
      if (f.size > 50_000_000) throw new Error('CSV exceeds 50 MB.');
      const bytes = await f.arrayBuffer();
      const parse = parseApolloIntelligenceCsv(new TextDecoder().decode(bytes));
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
      setFile({ parse, sha, name: f.name });
      const { rows: _r, ...summary } = parse;
      setReport(JSON.stringify({ rows: parse.rows.length, columns: parse.header.length, ...summary, file_sha256: sha }, null, 2));
    } catch (e) { fail('File rejected', e); }
  }

  async function search() {
    let query = db.from('apollo_contact_intelligence' as never).select('id,apollo_contact_id,first_name,last_name,company,primary_email,readiness_status,readiness_reasons,founder_mark,lists').order('apollo_contact_id').limit(50);
    const t = q.trim().replace(/[%,()]/g, '');
    if (t) query = query.or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,company.ilike.%${t}%,primary_email.ilike.%${t}%,apollo_contact_id.eq.${t}`);
    const { data, error } = await query;
    if (error) return fail('Search failed', error);
    setRecs((data ?? []) as unknown as Rec[]);
  }

  async function mark(id: string, m: string | null) {
    const { error } = await db.rpc('apollo_intel_mark', { p_id: id, p_mark: m });
    if (error) return fail('Not marked', error);
    void search();
  }

  async function exportAll() {
    setBusy(true);
    try {
      const all: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('apollo_contact_intelligence' as never).select('apollo_contact_id,readiness_status,readiness_reasons,founder_mark,contact_id,link_method,raw_row').order('apollo_contact_id').range(from, from + 999);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as unknown as { raw_row: Record<string, string> }[];
        page.forEach(({ raw_row, ...meta }) => all.push({ ...raw_row, ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [`liftor_${k}`, v])) }));
        if (page.length < 1000) break;
      }
      const url = URL.createObjectURL(new Blob([retentionCsv(all)], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `kindnesss-apollo-intelligence-${all.length}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setReport(JSON.stringify({ exported_rows: all.length }, null, 2));
    } catch (e) { fail('Export failed', e); } finally { setBusy(false); }
  }

  return <section className="space-y-4 border-b border-border pb-6" aria-label="Kindnesss Apollo contact intelligence">
    <h2 className="text-xl font-semibold">Kindnesss · Apollo contact intelligence archive</h2>
    <p className="text-sm text-muted-foreground">Keeps every Apollo row and all original columns, including people without email. The archive is not a send list: nothing here starts outreach, and only the founder can see it.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="max-w-sm space-y-1 text-sm">Full Apollo export CSV<Input aria-label="Full Apollo export CSV" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} /></label>
      <Button variant="outline" onClick={() => run(true)} disabled={busy || !file}>Preview counts</Button>
      <Button onClick={() => run(false)} disabled={busy || !file}><Upload className="mr-2 h-4 w-4" />Import / resume</Button>
      <Button variant="outline" onClick={exportAll} disabled={busy}><Download className="mr-2 h-4 w-4" />Export archive</Button>
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" />}
    </div>
    {busy && progress > 0 && <Progress value={progress} aria-label="Import progress" />}
    {report && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm text-muted-foreground" aria-label="Intelligence result">{report}</pre>}
    <div className="flex gap-2"><Input aria-label="Search archive" placeholder="Name, company, email or Apollo Contact Id" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} className="max-w-md" /><Button variant="outline" onClick={search}><Search className="mr-2 h-4 w-4" />Search</Button></div>
    {recs.length > 0 && <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="p-2">Person</th><th className="p-2">Company</th><th className="p-2">Email</th><th className="p-2">Readiness</th><th className="p-2">Founder mark</th></tr></thead><tbody>
      {recs.map(r => <tr key={r.id} className="border-t border-border"><td className="p-2">{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.apollo_contact_id}</td><td className="p-2">{r.company}</td><td className="p-2">{r.primary_email ?? '—'}</td><td className="p-2">{r.readiness_status}<div className="text-xs text-muted-foreground">{r.readiness_reasons.join(', ')}</div></td>
        <td className="p-2 space-x-1">{r.founder_mark ?? 'none'} {r.readiness_status === 'eligible_for_review' && r.founder_mark !== 'approved_for_compliance_review' && <Button size="sm" variant="outline" onClick={() => mark(r.id, 'approved_for_compliance_review')}>Approve for compliance review</Button>}{r.founder_mark !== 'excluded' && <Button size="sm" variant="ghost" onClick={() => mark(r.id, 'excluded')}>Exclude</Button>}{r.founder_mark && <Button size="sm" variant="ghost" onClick={() => mark(r.id, null)}>Clear</Button>}</td></tr>)}
    </tbody></table></div>}
  </section>;
}
