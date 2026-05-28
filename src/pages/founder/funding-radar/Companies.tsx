import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, NeedsVerification } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanies, parseCsv, sanitizeExtraction, ALLOWED_EXTRACTION_FIELDS } from "@/lib/fundingRadarEngine";

const emptyDraft = {
  company_name: "",
  website: "",
  sector: "",
  country: "",
  last_funding_amount_usd: "",
  last_funding_round: "",
  last_funding_date: "",
  problem_thesis: "",
  customer_pain: "",
  market_validation: "",
  buyer_type: "",
  pricing_logic: "",
  revenue_model_pattern: "",
  publicly_visible_weakness: "",
  distinct_execution_route: "",
  source_url: "",
  notes: "",
};

export default function FRCompanies() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = () => fetchCompanies().then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!draft.company_name.trim()) { toast.error("Company name required"); return; }
    const payload: any = sanitizeExtraction({
      ...draft,
      last_funding_amount_usd: draft.last_funding_amount_usd ? Number(draft.last_funding_amount_usd) : null,
      last_funding_date: draft.last_funding_date || null,
      ingestion_method: "manual",
      needs_verification: !draft.source_url || !draft.problem_thesis,
    });
    const { error } = await (supabase as any).from("funding_radar_companies").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Company added");
    setDraft(emptyDraft);
    setDraftOpen(false);
    reload();
  };

  const ingestCsv = async () => {
    setLoading(true);
    try {
      const { rows: parsed } = parseCsv(csvText);
      if (parsed.length === 0) { toast.error("No rows parsed"); return; }
      const { data: imp, error: impErr } = await (supabase as any).from("funding_imports").insert({
        ingestion_method: "csv",
        row_count: parsed.length,
        status: "processing",
        source_label: "Manual paste",
      }).select("id").single();
      if (impErr) throw impErr;
      let accepted = 0, rejected = 0;
      const errors: any[] = [];
      for (const r of parsed) {
        if (!r.company_name) { rejected++; errors.push({ row: r, reason: "missing company_name" }); continue; }
        const payload: any = sanitizeExtraction({
          company_name: r.company_name,
          website: r.website ?? null,
          sector: r.sector ?? null,
          country: r.country ?? null,
          last_funding_amount_usd: r.last_funding_amount_usd ? Number(r.last_funding_amount_usd) : null,
          last_funding_round: r.last_funding_round ?? null,
          source_url: r.source_url ?? null,
          problem_thesis: r.problem_thesis ?? null,
          ingestion_method: "csv",
          import_id: imp.id,
          needs_verification: true,
        });
        const { error } = await (supabase as any).from("funding_radar_companies").insert(payload);
        if (error) { rejected++; errors.push({ row: r, reason: error.message }); } else { accepted++; }
      }
      await (supabase as any).from("funding_imports").update({
        accepted_count: accepted,
        rejected_count: rejected,
        status: rejected === 0 ? "complete" : "complete_with_errors",
        error_log: errors.length ? errors : null,
      }).eq("id", imp.id);
      toast.success(`Imported ${accepted}, rejected ${rejected}`);
      setCsvText("");
      setCsvOpen(false);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter((r) =>
    !search.trim() ||
    (r.company_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.sector ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <FundingRadarLayout title="Companies" subtitle="Manually add funded companies or paste a CSV. Only public-thesis fields are stored. Restricted fields (branding, code, customer lists) are stripped on entry.">
      <FRSection
        title={`Companies (${rows.length})`}
        actions={
          <div className="flex gap-2">
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48" />
            <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-1" />CSV</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Paste CSV</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">Header row required. Recognised columns: company_name, website, sector, country, last_funding_amount_usd, last_funding_round, source_url, problem_thesis.</p>
                <Textarea rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={`company_name,sector,last_funding_amount_usd\nAcme,fintech,5000000`} />
                <DialogFooter><Button onClick={ingestCsv} disabled={loading}>{loading ? "Importing…" : "Import"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add company</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New funded company</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Company name *" value={draft.company_name} onChange={(v) => setDraft({ ...draft, company_name: v })} />
                  <Field label="Website" value={draft.website} onChange={(v) => setDraft({ ...draft, website: v })} />
                  <Field label="Sector" value={draft.sector} onChange={(v) => setDraft({ ...draft, sector: v })} />
                  <Field label="Country" value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} />
                  <Field label="Last funding (USD)" value={draft.last_funding_amount_usd} onChange={(v) => setDraft({ ...draft, last_funding_amount_usd: v })} type="number" />
                  <Field label="Last funding round" value={draft.last_funding_round} onChange={(v) => setDraft({ ...draft, last_funding_round: v })} />
                  <Field label="Last funding date" value={draft.last_funding_date} onChange={(v) => setDraft({ ...draft, last_funding_date: v })} type="date" />
                  <Field label="Source URL" value={draft.source_url} onChange={(v) => setDraft({ ...draft, source_url: v })} />
                  <Field label="Buyer type" value={draft.buyer_type} onChange={(v) => setDraft({ ...draft, buyer_type: v })} />
                  <Field label="Pricing logic" value={draft.pricing_logic} onChange={(v) => setDraft({ ...draft, pricing_logic: v })} />
                  <div className="md:col-span-2"><Label className="text-xs">Problem thesis</Label><Textarea rows={2} value={draft.problem_thesis} onChange={(e) => setDraft({ ...draft, problem_thesis: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label className="text-xs">Customer pain</Label><Textarea rows={2} value={draft.customer_pain} onChange={(e) => setDraft({ ...draft, customer_pain: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label className="text-xs">Market validation</Label><Textarea rows={2} value={draft.market_validation} onChange={(e) => setDraft({ ...draft, market_validation: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label className="text-xs">Publicly visible weakness</Label><Textarea rows={2} value={draft.publicly_visible_weakness} onChange={(e) => setDraft({ ...draft, publicly_visible_weakness: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label className="text-xs">Distinct execution route (legally distinct)</Label><Textarea rows={2} value={draft.distinct_execution_route} onChange={(e) => setDraft({ ...draft, distinct_execution_route: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
                </div>
                <p className="text-[10px] text-muted-foreground">Allowed extraction fields: {ALLOWED_EXTRACTION_FIELDS.join(", ")}. No branding/code/customer lists.</p>
                <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No companies yet. Add one or paste a CSV.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Sector</TableHead><TableHead>Country</TableHead>
              <TableHead>Last funding</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.company_name}</TableCell>
                  <TableCell className="text-xs"><NeedsVerification value={r.sector} /></TableCell>
                  <TableCell className="text-xs"><NeedsVerification value={r.country} /></TableCell>
                  <TableCell className="text-xs">
                    {r.last_funding_amount_usd ? `$${Number(r.last_funding_amount_usd).toLocaleString()}` : <NeedsVerification value={null} />}
                    {r.last_funding_round ? ` · ${r.last_funding_round}` : ""}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.source_url ? <a className="text-primary hover:underline" href={r.source_url} target="_blank" rel="noreferrer">link</a> : <NeedsVerification value={null} />}
                  </TableCell>
                  <TableCell className="text-xs">{r.needs_verification ? <span className="text-amber-400">Needs verification</span> : <span className="text-emerald-400">Verified</span>}</TableCell>
                  <TableCell><Button asChild size="sm" variant="ghost"><Link to={`/founder/funding-radar/company/${r.id}`}>Open</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}