import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, FileSpreadsheet, ShieldAlert, CheckCircle2, XCircle, Eye, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const SourceTypes = ["csv","xlsx","paste","adviser_notes","apollo","hubspot","pitchbook","crunchbase","dealroom","beauhurst","companies_house","sec_edgar","opencorporates","lse_rns","other"] as const;
const TargetEntities = ["companies","investors","buyer_matches","competitor_profiles","deals","adviser_channels","people","signals","generic"] as const;
const LicenceStatuses = ["public","licensed_reuse_allowed","licensed_internal_only","do_not_store","restricted","unknown"] as const;

const importSchema = z.object({
  import_name: z.string().trim().min(1).max(200),
  source_name: z.string().trim().min(1).max(200),
  source_type: z.enum(SourceTypes),
  target_entity: z.enum(TargetEntities),
  licence_status: z.enum(LicenceStatuses),
  storage_allowed: z.boolean(),
  reuse_allowed: z.boolean(),
  confidence_level: z.enum(["low","medium","high"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export default function DataIngestionCentre() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [importName, setImportName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<typeof SourceTypes[number]>("csv");
  const [targetEntity, setTargetEntity] = useState<typeof TargetEntities[number]>("companies");
  const [licenceStatus, setLicenceStatus] = useState<typeof LicenceStatuses[number]>("unknown");
  const [storageAllowed, setStorageAllowed] = useState(true);
  const [reuseAllowed, setReuseAllowed] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<"low"|"medium"|"high">("medium");
  const [notes, setNotes] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: imports = [] } = useQuery<any[]>({
    queryKey: ["ma_data_imports"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ma_data_imports").select("*").order("created_at",{ascending:false}).limit(100);
      return data ?? [];
    },
  });

  const { data: dedupeSuggestions = [] } = useQuery<any[]>({
    queryKey: ["ma_dedupe_suggestions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ma_dedupe_suggestions").select("*").eq("status","pending").order("similarity_score",{ascending:false}).limit(50);
      return data ?? [];
    },
  });

  const { data: golden = [] } = useQuery<any[]>({
    queryKey: ["ma_golden_records"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ma_golden_records").select("*").order("canonical_name").limit(200);
      return data ?? [];
    },
  });

  const reset = () => {
    setImportName(""); setSourceName(""); setNotes(""); setPasteText("");
    setParsedRows([]); setParsedHeaders([]);
  };

  const handleFile = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
        const text = await file.text();
        Papa.parse(text, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            const rows = (res.data as Record<string, any>[]).slice(0, 5000);
            setParsedRows(rows);
            setParsedHeaders(res.meta.fields ?? Object.keys(rows[0] ?? {}));
            setSourceType("csv");
          },
        });
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sh = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sh) as Record<string, any>[];
        setParsedRows(rows.slice(0, 5000));
        setParsedHeaders(Object.keys(rows[0] ?? {}));
        setSourceType("xlsx");
      } else {
        toast.error("Unsupported file type — use CSV or XLSX.");
      }
    } catch (e: any) {
      toast.error(`Parse error: ${e?.message ?? e}`);
    }
  };

  const parsePaste = () => {
    if (!pasteText.trim()) return;
    Papa.parse(pasteText, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, any>[]).slice(0, 5000);
        setParsedRows(rows);
        setParsedHeaders(res.meta.fields ?? Object.keys(rows[0] ?? {}));
        setSourceType("paste");
      },
    });
  };

  const submit = async () => {
    if (!user) { toast.error("Sign in required"); return; }
    const parsed = importSchema.safeParse({
      import_name: importName, source_name: sourceName, source_type: sourceType,
      target_entity: targetEntity, licence_status: licenceStatus,
      storage_allowed: storageAllowed, reuse_allowed: reuseAllowed,
      confidence_level: confidenceLevel, notes,
    });
    if (!parsed.success) { toast.error("Fix validation errors"); return; }
    if (parsedRows.length === 0) { toast.error("No rows parsed yet"); return; }
    if (!storageAllowed) { toast.error("Source marked as do-not-store. Cannot import."); return; }

    setSubmitting(true);
    try {
      const { data: imp, error } = await (supabase as any).from("ma_data_imports").insert({
        ...parsed.data,
        notes: notes || null,
        import_owner_id: user.id,
        raw_paste_excerpt: sourceType === "paste" ? pasteText.slice(0, 4000) : null,
        row_count_total: parsedRows.length,
        status: "reviewing",
      }).select().single();
      if (error) throw error;

      // stage rows
      const batch = parsedRows.slice(0, 2000).map((row, i) => ({
        import_id: imp.id,
        row_index: i,
        raw_payload: row,
        mapped_payload: row,
        dedupe_status: "unchecked",
        action: "needs_review",
        status: "pending",
      }));
      const { error: rowsErr } = await (supabase as any).from("ma_import_records").insert(batch);
      if (rowsErr) throw rowsErr;

      await (supabase as any).from("ma_data_imports").update({ row_count_mapped: batch.length }).eq("id", imp.id);
      await (supabase as any).from("ma_approval_queue").insert({
        request_type: "approve_import",
        subject_table: "ma_data_imports",
        subject_id: imp.id,
        title: `Import review: ${parsed.data.import_name}`,
        summary: `${batch.length} rows from ${parsed.data.source_name}. Target: ${parsed.data.target_entity}. Licence: ${parsed.data.licence_status}.`,
        proposed_action: "Review and approve staged records",
        risk_level: parsed.data.licence_status === "do_not_store" ? "high" : "medium",
        evidence: { source_type: parsed.data.source_type, rows: batch.length },
        requested_by: user.id,
      });

      toast.success(`Import staged. ${batch.length} rows pending review.`);
      qc.invalidateQueries({ queryKey: ["ma_data_imports"] });
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  const decideDedupe = async (id: string, status: "approved_merge"|"approved_keep"|"rejected") => {
    const { error } = await (supabase as any).from("ma_dedupe_suggestions")
      .update({ status, decided_by: user?.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dedupe decision recorded");
    qc.invalidateQueries({ queryKey: ["ma_dedupe_suggestions"] });
  };

  const preview = useMemo(() => parsedRows.slice(0, 10), [parsedRows]);

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Upload className="h-7 w-7 text-primary" /> Data Ingestion Centre
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
              Import lists of companies, investors, buyers, competitors and deals from CSV, XLSX or pasted tables.
              Every import is governed by licence status, requires founder review, and is staged before any record is created.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Command Centre</Link>
          </Button>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">New Import</TabsTrigger>
            <TabsTrigger value="history">Import History ({imports.length})</TabsTrigger>
            <TabsTrigger value="dedupe">De-Dup Queue ({dedupeSuggestions.length})</TabsTrigger>
            <TabsTrigger value="golden">Golden Records ({golden.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <Card className="tech-card">
              <CardHeader><CardTitle>Source &amp; governance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Field label="Import name"><Input value={importName} onChange={(e)=>setImportName(e.target.value)} placeholder="e.g. Q2 buyer shortlist" /></Field>
                <Field label="Source name"><Input value={sourceName} onChange={(e)=>setSourceName(e.target.value)} placeholder="e.g. Apollo export 2026-05" /></Field>
                <Field label="Source type">
                  <Select value={sourceType} onValueChange={(v)=>setSourceType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SourceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Target entity">
                  <Select value={targetEntity} onValueChange={(v)=>setTargetEntity(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TargetEntities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Licence / usage status">
                  <Select value={licenceStatus} onValueChange={(v)=>setLicenceStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LicenceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Confidence">
                  <Select value={confidenceLevel} onValueChange={(v)=>setConfidenceLevel(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">low</SelectItem><SelectItem value="medium">medium</SelectItem><SelectItem value="high">high</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Storage allowed">
                  <div className="flex items-center gap-2"><Switch checked={storageAllowed} onCheckedChange={setStorageAllowed} /><span className="text-xs text-muted-foreground">If off, do not import</span></div>
                </Field>
                <Field label="Reuse allowed (external)">
                  <div className="flex items-center gap-2"><Switch checked={reuseAllowed} onCheckedChange={setReuseAllowed} /><span className="text-xs text-muted-foreground">Off unless licence permits</span></div>
                </Field>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Provenance, who shared it, adviser context…" />
                </div>
                {licenceStatus === "do_not_store" && (
                  <div className="md:col-span-2 rounded border border-destructive/40 bg-destructive/5 p-3 text-xs flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    Source marked do-not-store. Import will be blocked.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="tech-card">
              <CardHeader><CardTitle>File or paste</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-input bg-background hover:bg-accent cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Choose CSV / XLSX</span>
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </label>
                  <span className="text-xs text-muted-foreground">or paste CSV/TSV below</span>
                </div>
                <Textarea rows={4} value={pasteText} onChange={(e)=>setPasteText(e.target.value)} placeholder="Paste comma- or tab-separated rows with a header row…" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={parsePaste} disabled={!pasteText.trim()}>Parse paste</Button>
                  {parsedRows.length > 0 && <Badge variant="outline">{parsedRows.length} rows parsed</Badge>}
                </div>
                {parsedRows.length > 0 && (
                  <div className="overflow-x-auto border border-border/50 rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>{parsedHeaders.slice(0,8).map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.map((r, i) => (
                          <TableRow key={i}>
                            {parsedHeaders.slice(0,8).map(h => <TableCell key={h} className="text-xs">{String(r[h] ?? "—").slice(0,80)}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedRows.length > preview.length && <p className="text-xs text-muted-foreground p-2">+ {parsedRows.length - preview.length} more rows…</p>}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={submitting || parsedRows.length === 0}>
                    {submitting ? "Staging…" : "Stage for review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="tech-card">
              <CardContent className="p-0">
                {imports.length === 0 ? (
                  <Empty msg="No imports yet. Stage one from the New Import tab." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Import</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead>
                        <TableHead>Licence</TableHead><TableHead>Rows</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imports.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.import_name}</TableCell>
                          <TableCell><div className="text-xs">{i.source_name}</div><div className="text-[10px] text-muted-foreground">{i.source_type}</div></TableCell>
                          <TableCell><Badge variant="outline">{i.target_entity}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{i.licence_status}</Badge></TableCell>
                          <TableCell className="text-right">{i.row_count_mapped}/{i.row_count_total}</TableCell>
                          <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                          <TableCell><Button asChild size="sm" variant="ghost"><Link to={`/founder/portfolio-exit/ingestion/${i.id}`}><Eye className="h-3 w-3" /></Link></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dedupe" className="mt-4">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitMerge className="h-4 w-4" /> Golden record resolver</CardTitle>
                <p className="text-xs text-muted-foreground">Suspected duplicates are surfaced here. Merges require founder approval and are audit-logged.</p>
              </CardHeader>
              <CardContent>
                {dedupeSuggestions.length === 0 ? (
                  <Empty msg="No pending duplicates. Once imports are processed, possible matches will appear here." />
                ) : (
                  <div className="space-y-2 text-sm">
                    {dedupeSuggestions.map((d) => (
                      <div key={d.id} className="rounded border border-border/50 p-3 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{d.record_type}</Badge>
                          <Badge variant="outline">similarity {d.similarity_score}</Badge>
                          <span className="text-xs text-muted-foreground">{d.source_table}:{d.source_record_id.slice(0,8)} ↔ {d.target_table}:{d.target_record_id.slice(0,8)}</span>
                        </div>
                        {d.diff_fields && Object.keys(d.diff_fields).length > 0 && (
                          <pre className="text-[10px] bg-secondary/40 p-2 rounded overflow-x-auto">{JSON.stringify(d.diff_fields, null, 2)}</pre>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={()=>decideDedupe(d.id,"approved_merge")}><CheckCircle2 className="h-3 w-3 mr-1" /> Merge</Button>
                          <Button size="sm" variant="outline" onClick={()=>decideDedupe(d.id,"approved_keep")}>Keep separate</Button>
                          <Button size="sm" variant="ghost" onClick={()=>decideDedupe(d.id,"rejected")}><XCircle className="h-3 w-3 mr-1" /> Reject suggestion</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="golden" className="mt-4">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle>Golden records</CardTitle>
                <p className="text-xs text-muted-foreground">Canonical companies, investors, people and advisers. One real-world entity = one record + aliases.</p>
              </CardHeader>
              <CardContent className="p-0">
                {golden.length === 0 ? (
                  <Empty msg="No golden records yet. Approve imports or add canonical entries from the M&A Intelligence Workspace." />
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Domain</TableHead><TableHead>Country</TableHead><TableHead>Aliases</TableHead><TableHead>Conf</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {golden.map((g)=>(
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.canonical_name}<div className="text-[10px] text-muted-foreground">{g.legal_name}</div></TableCell>
                          <TableCell><Badge variant="outline">{g.record_type}</Badge></TableCell>
                          <TableCell className="text-xs">{g.primary_domain ?? "—"}</TableCell>
                          <TableCell className="text-xs">{g.country ?? "—"}</TableCell>
                          <TableCell className="text-xs">{(g.aliases ?? []).slice(0,3).join(", ") || "—"}</TableCell>
                          <TableCell>{g.confidence_score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}