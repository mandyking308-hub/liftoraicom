import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

const TARGET_SHEET = "Lovable_Import_UPSERT";

interface ImportPreset {
  id: string;
  label: string;
  workbook_name: string;
  source_pack: string;
  totals: { total_rows: number; create_new: number; update_existing: number; review_hold: number; emails: number; phones: number; websites: number };
  match_filename?: RegExp;
}

const PRESETS: ImportPreset[] = [
  {
    id: "missed_contacts_29may_29jun_2026",
    label: "Missed contacts 29 May → 29 Jun 2026 (LOCKED)",
    workbook_name: "Liftor_RI_MISSED_CONTACTS_29MAY-29JUN_2026_FINAL_LOCKED.xlsx",
    source_pack: "gmail_monthly_backfill_2026_05_29_to_2026_06_29",
    totals: { total_rows: 90, create_new: 87, update_existing: 0, review_hold: 3, emails: 87, phones: 27, websites: 88 },
    match_filename: /MISSED_CONTACTS_29MAY[-_]?29JUN_2026/i,
  },
  {
    id: "weekly_15_22_jun_2026",
    label: "Weekly sweep 15 → 22 Jun 2026",
    workbook_name: "Liftor_RI_UPSERT_15-22_JUN_2026_FINAL.xlsx",
    source_pack: "gmail_weekly_sweep_2026_06_15_to_2026_06_22",
    totals: { total_rows: 84, create_new: 36, update_existing: 45, review_hold: 3, emails: 81, phones: 64, websites: 81 },
    match_filename: /UPSERT_15[-_]?22_JUN_2026/i,
  },
];

type Action = "CREATE_NEW" | "UPDATE_EXISTING" | "REVIEW_HOLD_NO_UNIQUE_EMAIL";

interface InRow {
  liftor_upsert_action?: string;
  contact_name?: string;
  organisation?: string;
  preferred_email?: string;
  email_type?: string;
  phone?: string;
  phone_source?: string;
  website?: string;
  website_source?: string;
  jurisdiction?: string;
  city_country?: string;
  relationship_type?: string;
  status?: string;
  opportunity_role?: string;
  trust_level?: string;
  disclosure_level?: string;
  commercial_score?: number | string;
  strategic_score?: number | string;
  urgency_score?: number | string;
  priority?: string;
  source_pack?: string;
  source_evidence?: string;
  ai_summary?: string;
  founder_notes?: string;
  next_action?: string;
  tags?: string;
  data_confidence?: string;
  primary_contact_route?: string;
  enrichment_evidence?: string;
  operational_warning?: string;
}

const COL_MAP: Record<string, keyof InRow> = {
  "Liftor Upsert Action": "liftor_upsert_action",
  "Contact Name": "contact_name",
  "Organisation": "organisation",
  "Preferred Email": "preferred_email",
  "Email Type": "email_type",
  "Phone": "phone",
  "Phone Source": "phone_source",
  "Website": "website",
  "Website Source": "website_source",
  "Jurisdiction": "jurisdiction",
  "City / Country": "city_country",
  "Relationship Type": "relationship_type",
  "Status": "status",
  "Opportunity Role": "opportunity_role",
  "Trust Level": "trust_level",
  "Disclosure Level": "disclosure_level",
  "Commercial Score": "commercial_score",
  "Strategic Score": "strategic_score",
  "Urgency Score": "urgency_score",
  "Priority": "priority",
  "Source Pack": "source_pack",
  "Source Evidence / Conversation State": "source_evidence",
  "AI Summary": "ai_summary",
  "Founder Notes / Operating Notes": "founder_notes",
  "Next Action": "next_action",
  "Tags": "tags",
  "Data Confidence": "data_confidence",
  "Primary Contact Route": "primary_contact_route",
  "Enrichment Evidence": "enrichment_evidence",
  "Operational Warning": "operational_warning",
};

function actionBadge(a: string) {
  switch (a) {
    case "CREATE_NEW":
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">CREATE_NEW</Badge>;
    case "UPDATE_EXISTING":
      return <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">UPDATE_EXISTING</Badge>;
    case "REVIEW_HOLD_NO_UNIQUE_EMAIL":
      return <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">REVIEW_HOLD</Badge>;
    default:
      return <Badge variant="outline">{a || "—"}</Badge>;
  }
}
function resolvedBadge(r: string) {
  const m: Record<string, string> = {
    create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    update: "bg-primary/15 text-primary border-primary/30",
    hold: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    skip: "bg-muted text-muted-foreground border-border/50",
  };
  return <Badge variant="outline" className={m[r] ?? "bg-muted"}>{r}</Badge>;
}

export default function RelationshipIntelligenceImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<InRow[]>([]);
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const EXPECTED = preset.totals;
  const [workbookName, setWorkbookName] = useState(PRESETS[0].workbook_name);
  const [sourcePack, setSourcePack] = useState(PRESETS[0].source_pack);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [plan, setPlan] = useState<any[] | null>(null);
  const [actual, setActual] = useState<any | null>(null);
  const [totalsMatch, setTotalsMatch] = useState<boolean | null>(null);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  const localTotals = useMemo(() => {
    const t = { total_rows: rows.length, create_new: 0, update_existing: 0, review_hold: 0, emails: 0, phones: 0, websites: 0 };
    for (const r of rows) {
      const a = (r.liftor_upsert_action ?? "").toUpperCase().trim();
      if (a === "CREATE_NEW") t.create_new++;
      else if (a === "UPDATE_EXISTING") t.update_existing++;
      else if (a === "REVIEW_HOLD_NO_UNIQUE_EMAIL") t.review_hold++;
      if ((r.preferred_email ?? "").trim()) t.emails++;
      if ((r.phone ?? "").trim()) t.phones++;
      if ((r.website ?? "").trim()) t.websites++;
    }
    return t;
  }, [rows]);

  const totalsCheck = useMemo(() => {
    return {
      total_rows: localTotals.total_rows === EXPECTED.total_rows,
      create_new: localTotals.create_new === EXPECTED.create_new,
      update_existing: localTotals.update_existing === EXPECTED.update_existing,
      review_hold: localTotals.review_hold === EXPECTED.review_hold,
      emails: localTotals.emails === EXPECTED.emails,
      phones: localTotals.phones === EXPECTED.phones,
      websites: localTotals.websites === EXPECTED.websites,
    };
  }, [localTotals, EXPECTED]);
  const allTotalsMatch = Object.values(totalsCheck).every(Boolean);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setWorkbookName(f.name);
    const detected = PRESETS.find((p) => p.match_filename?.test(f.name));
    if (detected) {
      setPresetId(detected.id);
      setSourcePack(detected.source_pack);
    }
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[TARGET_SHEET];
      if (!sheet) { toast.error(`Sheet "${TARGET_SHEET}" not found in workbook.`); return; }
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const mapped: InRow[] = json.map((r) => {
        const out: any = {};
        for (const [hdr, key] of Object.entries(COL_MAP)) {
          if (r[hdr] !== undefined) out[key] = r[hdr];
        }
        return out;
      });
      setRows(mapped);
      setPlan(null); setActual(null); setTotalsMatch(null); setCommitResult(null);
      toast.success(`Parsed ${mapped.length} rows from "${TARGET_SHEET}".`);
    } catch (err) {
      toast.error(`Parse failed: ${(err as Error).message}`);
    }
  }

  async function runPreview() {
    if (!rows.length) { toast.error("Upload the workbook first."); return; }
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ri-upsert-import", {
        body: { mode: "preview", workbook_name: workbookName, source_pack: sourcePack, expected_totals: EXPECTED, rows },
      });
      if (error) throw error;
      setPlan(data.plan); setActual(data.actual); setTotalsMatch(data.control_totals_match);
      toast.success("Preview ready. Review then confirm to commit.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreviewing(false);
    }
  }

  async function runCommit() {
    if (!plan) { toast.error("Run preview first."); return; }
    if (!allTotalsMatch) {
      toast.error("Control totals do not match. Resolve before committing.");
      return;
    }
    if (!confirm(`Commit ${actual?.create_count ?? 0} creates, ${actual?.update_count ?? 0} updates, ${actual?.held_count ?? 0} holds?`)) return;
    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ri-upsert-import", {
        body: { mode: "commit", workbook_name: workbookName, source_pack: sourcePack, expected_totals: EXPECTED, rows },
      });
      if (error) throw error;
      setCommitResult(data);
      toast.success(`Committed. Created ${data.created} · Updated ${data.updated} · Held ${data.held}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/relationship-intelligence" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Relationship Intelligence
          </Link>
          <span>/</span><span>Workbook Upsert Import</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload size={20} className="text-primary" /> RI Upsert Import
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">UPSERT only</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> Founder confirmation required
            </Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50 text-[10px]">
              <Lock size={9} className="mr-1" /> No external sending
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Match by Preferred Email first, then Contact Name + Organisation. Never overwrite existing email, phone, website,
            trust, disclosure, or founder notes with a blank. Rows marked <code>REVIEW_HOLD_NO_UNIQUE_EMAIL</code> go to the holding queue only.
          </p>
        </div>

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">1. Upload workbook</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="wb">Workbook name</Label>
                <Input id="wb" value={workbookName} onChange={(e) => setWorkbookName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp">Source pack</Label>
                <Input id="sp" value={sourcePack} onChange={(e) => setSourcePack(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="xlsx">.xlsx file (uses sheet <code>{TARGET_SHEET}</code>)</Label>
              <Input id="xlsx" ref={fileRef} type="file" accept=".xlsx" onChange={onFileChange} />
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                2. Control totals
                {allTotalsMatch
                  ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle2 size={9} className="mr-1" /> Match</Badge>
                  : <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px]"><AlertTriangle size={9} className="mr-1" /> Mismatch — stop</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
                {(["total_rows","create_new","update_existing","review_hold","emails","phones","websites"] as const).map((k) => (
                  <div key={k} className={`border rounded p-2 ${totalsCheck[k] ? "border-emerald-500/40" : "border-red-500/40"}`}>
                    <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, " ")}</p>
                    <p className="text-sm font-bold">{(localTotals as any)[k]} / <span className="text-muted-foreground">{(EXPECTED as any)[k]}</span></p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={runPreview} disabled={previewing || !allTotalsMatch}>
                  {previewing ? "Previewing…" : "Run preview (dry run)"}
                </Button>
                {!allTotalsMatch && <span className="text-[11px] text-red-300 self-center">Fix workbook before continuing.</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {plan && actual && (
          <Card className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                3. Preview &amp; commit
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px]">{plan.length} rows planned</Badge>
                {totalsMatch
                  ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">totals match</Badge>
                  : <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px]">totals mismatch</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <Stat label="Create" value={actual.create_count} tone="ok" />
                <Stat label="Update" value={actual.update_count} />
                <Stat label="Hold" value={actual.held_count} tone="warn" />
                <Stat label="Skip" value={actual.skipped_count} />
                <Stat label="Blocked dup" value={actual.blocked_duplicates} tone={actual.blocked_duplicates ? "bad" : undefined} />
                <Stat label="Missing email" value={actual.missing_email} />
              </div>
              <div className="overflow-auto border border-border/40 rounded max-h-[480px]">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground bg-secondary/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Action</th>
                      <th className="text-left p-2">Resolved</th>
                      <th className="text-left p-2">Match</th>
                      <th className="text-left p-2">Contact</th>
                      <th className="text-left p-2">Organisation</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Website</th>
                      <th className="text-left p-2">Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((p: any) => (
                      <tr key={p.row_index} className="border-b border-border/20 align-top">
                        <td className="p-2 font-mono">{p.row_index + 1}</td>
                        <td className="p-2">{actionBadge(p.action)}</td>
                        <td className="p-2">{resolvedBadge(p.resolved)}</td>
                        <td className="p-2 text-[10px] text-muted-foreground">{p.match_basis ?? "—"}</td>
                        <td className="p-2">{p.contact_name}</td>
                        <td className="p-2">{p.organisation}</td>
                        <td className="p-2 font-mono text-[10px]">{p.preferred_email}</td>
                        <td className="p-2 font-mono text-[10px]">{p.phone}</td>
                        <td className="p-2 font-mono text-[10px] max-w-[200px] truncate">{p.website}</td>
                        <td className="p-2 text-[10px] text-yellow-300">{p.warning ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={runCommit} disabled={committing || !!commitResult || !allTotalsMatch}>
                  {committing ? "Committing…" : commitResult ? "Committed" : "Confirm & commit"}
                </Button>
                {!allTotalsMatch && <span className="text-[11px] text-red-300 self-center">Control totals must match.</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {commitResult && (
          <Card className="tech-card border-emerald-500/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Reconciliation report</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <Stat label="Created" value={commitResult.created} tone="ok" />
                <Stat label="Updated" value={commitResult.updated} />
                <Stat label="Held" value={commitResult.held} tone="warn" />
                <Stat label="Skipped" value={commitResult.skipped} />
                <Stat label="Blocked dup" value={commitResult.blocked_duplicates} />
                <Stat label="Missing email" value={commitResult.missing_email} />
                <Stat label="Missing phone" value={commitResult.missing_phone} />
                <Stat label="Missing website" value={commitResult.missing_website} />
              </div>
              <p className="text-muted-foreground">Audit log id: <span className="font-mono">{commitResult.audit_id}</span></p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300"
    : tone === "warn" ? "border-yellow-500/40 text-yellow-300"
    : tone === "ok" ? "border-emerald-500/40 text-emerald-400"
    : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}