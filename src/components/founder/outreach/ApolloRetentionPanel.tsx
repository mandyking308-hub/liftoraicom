import { useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { parseApolloRetentionCsv, retentionCsv, type RetainedApolloRow } from '@/lib/apolloRetention';
import { toast } from '@/hooks/use-toast';

type Batch = { rows: RetainedApolloRow[]; sha: string };
export default function ApolloRetentionPanel() {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  async function preview(file?: File) {
    setBatch(null); setReport('');
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 10000000) throw new Error('CSV exceeds 10 MB.');
      const bytes = await file.arrayBuffer();
      const rows = parseApolloRetentionCsv(new TextDecoder().decode(bytes));
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
      const { data, error } = await supabase.rpc('kindnesss_apollo_csv_import', { p_rows: rows, p_sha256: sha, p_preview: true });
      if (error) throw new Error(error.message);
      setBatch({ rows, sha }); setReport(JSON.stringify(data, null, 2));
    } catch (e) { toast({ title: 'Preview blocked', description: e instanceof Error ? e.message : 'Unable to preview', variant: 'destructive' }); }
    finally { setBusy(false); }
  }
  async function commit() {
    if (!batch) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('kindnesss_apollo_csv_import', { p_rows: batch.rows, p_sha256: batch.sha, p_preview: false });
      if (error) throw new Error(error.message);
      setReport(JSON.stringify(data, null, 2)); setBatch(null);
    } catch (e) { toast({ title: 'Import blocked', description: e instanceof Error ? e.message : 'Unable to import', variant: 'destructive' }); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('kindnesss_apollo_retention_export');
      if (error) throw new Error(error.message);
      const result = data as { rows: Record<string, unknown>[]; count: number; emails: number; sha256: string; audit_id: string };
      const csv = retentionCsv(result.rows);
      const bytes = new TextEncoder().encode(csv);
      const csvSha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `kindnesss-apollo-${result.audit_id}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setReport(JSON.stringify({ count: result.count, emails: result.emails, audit_id: result.audit_id, payload_sha256: result.sha256, csv_sha256: csvSha }, null, 2));
    } catch (e) { toast({ title: 'Export blocked', description: e instanceof Error ? e.message : 'Unable to export', variant: 'destructive' }); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 border-b border-border pb-6" aria-label="Kindnesss Apollo retention">
    <h2 className="text-xl font-semibold">Kindnesss · Retained Apollo data</h2>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={download} disabled={busy}><Download className="mr-2 h-4 w-4" />Download all retained leads</Button>
      <label className="max-w-sm space-y-1 text-sm">Apollo export CSV<Input aria-label="Apollo export CSV" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { void preview(e.target.files?.[0]); e.target.value = ''; }} /></label>
      <Button onClick={commit} disabled={busy || !batch}><Upload className="mr-2 h-4 w-4" />Confirm retention import</Button>
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" />}
    </div>
    {report && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm text-muted-foreground" aria-label="Retention result">{report}</pre>}
  </section>;
}