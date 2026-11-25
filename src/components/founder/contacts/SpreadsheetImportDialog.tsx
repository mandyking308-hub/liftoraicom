import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { autoMap, prepareRows, readSpreadsheet, IMPORT_CHUNK, MAX_IMPORT_ROWS, type ImportField } from "@/lib/spreadsheetImport";

type Result = Record<string, number>;

export default function SpreadsheetImportDialog({
  open, onOpenChange, title, fields, requireEmail, extra, canSave = true, saveChunk, resultLabels, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; fields: ImportField[]; requireEmail: boolean;
  extra?: ReactNode; canSave?: boolean; saveChunk: (rows: Record<string, string>[]) => Promise<Result>;
  resultLabels: Record<string, string>; onDone: () => void;
}) {
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const header = grid?.[0] ?? [];
  const prepared = useMemo(() => {
    if (!grid) return null;
    if (requireEmail && mapping.email === undefined) return null;
    return prepareRows(grid, mapping, { requireEmail });
  }, [grid, mapping, requireEmail]);

  const reset = () => { setGrid(null); setFileName(""); setMapping({}); setResult(null); setProgress(0); };

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const g = await readSpreadsheet(f);
      if (g.length < 2) throw new Error("The file has no rows under the header.");
      if (g.length - 1 > MAX_IMPORT_ROWS) throw new Error(`Please split the file: up to ${MAX_IMPORT_ROWS.toLocaleString("en-GB")} rows at a time.`);
      setGrid(g); setFileName(f.name); setMapping(autoMap(g[0], fields)); setResult(null);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function save() {
    if (!prepared) return;
    setSaving(true); setProgress(0);
    const total: Result = {};
    try {
      for (let i = 0; i < prepared.rows.length; i += IMPORT_CHUNK) {
        const r = await saveChunk(prepared.rows.slice(i, i + IMPORT_CHUNK));
        for (const [k, v] of Object.entries(r)) total[k] = (total[k] ?? 0) + (Number(v) || 0);
        setProgress(Math.round(((i + IMPORT_CHUNK) / prepared.rows.length) * 100));
      }
      setResult(total); onDone();
    } catch (e) {
      toast.error(`Stopped part-way: ${(e as Error).message}. Saved rows are kept; uploading again will not duplicate them.`);
      setResult(total); onDone();
    } finally { setSaving(false); }
  }

  const sample = prepared?.rows.slice(0, 5) ?? [];
  const mappedFields = fields.filter((f) => mapping[f.key] !== undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="theme-light max-h-[90vh] max-w-3xl overflow-y-auto bg-background text-foreground">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="font-medium">Done. Here's what happened:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(resultLabels).map(([k, label]) => (
                <div key={k} className="rounded-lg border p-3"><div className="text-2xl font-bold">{(result[k] ?? 0).toLocaleString("en-GB")}</div><div className="text-sm text-muted-foreground">{label}</div></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {extra}
            <div className="space-y-1">
              <Label>Spreadsheet (CSV or Excel)</Label>
              <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm" aria-label="Choose spreadsheet" />
              {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
            </div>
            {grid && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Columns (matched automatically, change if needed)</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {fields.map((f) => (
                      <div key={f.key} className="flex items-center gap-2">
                        <span className="w-36 shrink-0 text-sm">{f.label}{f.required ? " *" : ""}</span>
                        <Select value={mapping[f.key] === undefined ? "none" : String(mapping[f.key])}
                          onValueChange={(v) => setMapping((m) => { const n = { ...m }; if (v === "none") delete n[f.key]; else n[f.key] = Number(v); return n; })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— not in file —</SelectItem>
                            {header.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
                {prepared ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Stat n={prepared.rows.length} label="Ready to save" tone="text-[hsl(var(--tone-green))]" />
                      <Stat n={prepared.duplicateInFile} label="Repeated in file (skipped)" tone="text-[hsl(var(--tone-amber))]" />
                      <Stat n={prepared.invalidEmail} label={requireEmail ? "Bad or missing email (skipped)" : "Bad email (cleared)"} tone="text-[hsl(var(--tone-rose))]" />
                      <Stat n={prepared.catchAll} label="Catch-all (kept, flagged)" tone="text-[hsl(var(--tone-blue))]" />
                    </div>
                    {sample.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50"><tr>{mappedFields.map((f) => <th key={f.key} className="px-2 py-1 text-left font-medium">{f.label}</th>)}</tr></thead>
                          <tbody>{sample.map((r, i) => <tr key={i} className="border-t">{mappedFields.map((f) => <td key={f.key} className="px-2 py-1">{r[f.key]}</td>)}</tr>)}</tbody>
                        </table>
                        <p className="px-2 py-1 text-xs text-muted-foreground">First {sample.length} of {prepared.rows.length.toLocaleString("en-GB")} rows. People already saved are merged, never duplicated.</p>
                      </div>
                    )}
                  </>
                ) : <p className="text-sm text-destructive">Choose which column holds the email address.</p>}
                {saving && <Progress value={progress} />}
              </>
            )}
          </div>
        )}
        <DialogFooter>
          {result ? <Button onClick={() => { onOpenChange(false); reset(); }}>Close</Button> : (
            <Button disabled={!prepared || !prepared.rows.length || saving || !canSave} onClick={save}>
              {saving ? "Saving…" : `Save ${prepared?.rows.length.toLocaleString("en-GB") ?? ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return <div className="rounded-lg border p-3"><div className={`text-2xl font-bold ${tone}`}>{n.toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
