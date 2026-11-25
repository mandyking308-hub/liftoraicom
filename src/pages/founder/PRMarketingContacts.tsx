import { useCallback, useEffect, useMemo, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ChevronLeft, ChevronRight } from "lucide-react";
import SpreadsheetImportDialog from "@/components/founder/contacts/SpreadsheetImportDialog";
import { PR_FIELDS } from "@/lib/spreadsheetImport";

type PR = { id: string; name: string | null; email: string | null; organisation: string | null; role: string | null; category: string | null; phone: string | null; website: string | null; country: string | null; continent: string | null; notes: string | null };
type Touch = { id: string; occurred_at: string; direction: string; channel: string; subject: string | null; summary: string | null };
const ALL = "__all";
const PAGE = 50;
const db = supabase as any;

export default function PRMarketingContacts() {
  const [rows, setRows] = useState<PR[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [continent, setContinent] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [geo, setGeo] = useState<{ continent: string | null; country: string | null }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [open, setOpen] = useState<PR | null>(null);

  const loadGeo = useCallback(async () => {
    const out: { continent: string | null; country: string | null }[] = [];
    for (let off = 0; ; off += 1000) {
      const { data } = await db.from("pr_media_contacts").select("continent, country").range(off, off + 999);
      out.push(...(data ?? [])); if (!data || data.length < 1000) break;
    }
    setGeo(out);
  }, []);

  const load = useCallback(async () => {
    let q = db.from("pr_media_contacts").select("*", { count: "exact" }).order("organisation", { ascending: true, nullsFirst: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (continent !== ALL) q = q.eq("continent", continent);
    if (country !== ALL) q = q.eq("country", country);
    const s = search.trim().replace(/[%,()]/g, " ");
    if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,organisation.ilike.%${s}%,role.ilike.%${s}%`);
    const { data, count, error } = await q;
    if (error) { toast.error("Could not load PR contacts"); return; }
    setRows(data ?? []); setTotal(count ?? 0);
  }, [page, continent, country, search]);

  useEffect(() => { void loadGeo(); }, [loadGeo]);
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(0), [continent, country, search]);

  const continents = useMemo(() => countBy(geo.map((g) => g.continent)), [geo]);
  const countries = useMemo(() => countBy(geo.filter((g) => continent === ALL || g.continent === continent).map((g) => g.country)), [geo, continent]);

  return (
    <FounderLayout>
      <div className="theme-light min-h-full space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">PR & Marketing contacts</h1>
            <p className="text-sm text-muted-foreground">Newspapers, journalists, agencies and marketing organisations. Kept separate from the customer CRM.</p>
          </div>
          <Button onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi tone="blue" label="Total contacts" value={geo.length} />
          <Kpi tone="teal" label="Continents" value={Object.keys(continents).length} />
          <Kpi tone="violet" label="Countries" value={Object.keys(countBy(geo.map((g) => g.country))).length} />
          <Kpi tone="green" label="Showing" value={total} />
        </div>

        {Object.keys(continents).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setContinent(ALL); setCountry(ALL); }} className={`rounded-full border px-3 py-1 text-sm ${continent === ALL ? "bg-primary text-primary-foreground" : "bg-card"}`}>All · {geo.length.toLocaleString("en-GB")}</button>
            {Object.entries(continents).map(([c, n]) => (
              <button key={c} onClick={() => { setContinent(c); setCountry(ALL); }} className={`rounded-full border px-3 py-1 text-sm ${continent === c ? "bg-primary text-primary-foreground" : "bg-card"}`}>{c} · {n.toLocaleString("en-GB")}</button>
            ))}
          </div>
        )}

        <Card><CardContent className="grid gap-2 p-4 md:grid-cols-3">
          <Input placeholder="Search name, outlet, email or role" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={continent} onValueChange={(v) => { setContinent(v); setCountry(ALL); }}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All continents</SelectItem>{Object.keys(continents).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All countries</SelectItem>{Object.keys(countries).map((c) => <SelectItem key={c} value={c}>{c} ({countries[c]})</SelectItem>)}</SelectContent></Select>
        </CardContent></Card>

        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left"><tr><th className="p-3">Name</th><th className="p-3">Outlet / organisation</th><th className="p-3">Kind</th><th className="p-3">Country</th><th className="p-3">Continent</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setOpen(r)}>
                    <td className="p-3"><div className="font-medium">{r.name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                    <td className="p-3">{r.organisation || "—"}<div className="text-xs text-muted-foreground">{r.role}</div></td>
                    <td className="p-3">{r.category ? <Badge variant="secondary">{r.category}</Badge> : "—"}</td>
                    <td className="p-3">{r.country || "—"}</td><td className="p-3">{r.continent || "—"}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No contacts yet. Press Upload to add your spreadsheet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 text-sm">
            <span className="text-muted-foreground">{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total.toLocaleString("en-GB")}` : ""}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent></Card>
      </div>

      <SpreadsheetImportDialog open={importOpen} onOpenChange={setImportOpen} title="Upload PR & Marketing contacts" fields={PR_FIELDS} requireEmail={false}
        saveChunk={async (chunk) => {
          const { data, error } = await supabase.rpc("pr_media_import" as never, { p_rows: chunk, p_source: "pr_upload" } as never);
          if (error) throw new Error(error.message);
          return data as unknown as Record<string, number>;
        }}
        resultLabels={{ new: "New contacts", merged: "Already saved (updated)", skipped: "Empty rows (skipped)" }}
        onDone={() => { void loadGeo(); void load(); }} />

      <PRSheet pr={open} onClose={() => setOpen(null)} />
    </FounderLayout>
  );
}

function countBy(xs: (string | null)[]) {
  const o: Record<string, number> = {};
  for (const x of xs) if (x) o[x] = (o[x] ?? 0) + 1;
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

function Kpi({ tone, label, value }: { tone: string; label: string; value: number }) {
  return <div className={`tone-${tone} rounded-lg border border-[hsl(var(--tone)/0.4)] bg-[hsl(var(--tone)/0.1)] p-4 text-[hsl(var(--tone))]`}><div className="text-xs font-medium opacity-80">{label}</div><div className="text-3xl font-bold tabular-nums">{value.toLocaleString("en-GB")}</div></div>;
}

function PRSheet({ pr, onClose }: { pr: PR | null; onClose: () => void }) {
  const [touches, setTouches] = useState<Touch[]>([]);
  const [dir, setDir] = useState("outbound");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const load = useCallback(async () => {
    if (!pr) return;
    const { data } = await db.from("pr_media_interactions").select("*").eq("pr_contact_id", pr.id).order("occurred_at", { ascending: false });
    setTouches(data ?? []);
  }, [pr]);
  useEffect(() => { void load(); setSubject(""); setSummary(""); }, [load]);
  async function add() {
    if (!pr || !(subject.trim() || summary.trim())) return;
    const { error } = await db.from("pr_media_interactions").insert({ pr_contact_id: pr.id, direction: dir, subject: subject.trim() || null, summary: summary.trim() || null });
    if (error) { toast.error("Could not save"); return; }
    setSubject(""); setSummary(""); void load();
  }
  const dirLabel: Record<string, string> = { outbound: "We sent", inbound: "They replied", note: "Note" };
  return (
    <Sheet open={!!pr} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="theme-light w-full overflow-y-auto bg-background text-foreground sm:max-w-lg">
        {pr && (<>
          <SheetHeader><SheetTitle>{pr.name || pr.organisation}</SheetTitle></SheetHeader>
          <div className="mt-2 space-y-1 text-sm">
            {pr.email && <div>{pr.email}</div>}
            <div className="text-muted-foreground">{[pr.role, pr.organisation, pr.country, pr.continent].filter(Boolean).join(" · ")}</div>
            {pr.phone && <div>{pr.phone}</div>}
            {pr.website && <a className="underline" href={pr.website.startsWith("http") ? pr.website : `https://${pr.website}`} target="_blank" rel="noreferrer">{pr.website}</a>}
          </div>
          <h3 className="mt-6 mb-2 font-semibold">Record a contact</h3>
          <div className="space-y-2">
            <Select value={dir} onValueChange={setDir}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="outbound">We sent</SelectItem><SelectItem value="inbound">They replied</SelectItem><SelectItem value="note">Note</SelectItem></SelectContent></Select>
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="What was said" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <Button size="sm" onClick={add}>Save</Button>
          </div>
          <h3 className="mt-6 mb-2 font-semibold">Journey</h3>
          {touches.length === 0 ? <p className="text-sm text-muted-foreground">No correspondence recorded yet.</p> : (
            <ol className="space-y-3 border-l pl-4">
              {touches.map((t) => (
                <li key={t.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-sm font-medium">{dirLabel[t.direction] ?? t.direction}{t.subject ? `: ${t.subject}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.occurred_at).toLocaleString("en-GB")}</div>
                  {t.summary && <p className="mt-1 whitespace-pre-wrap text-sm">{t.summary}</p>}
                </li>
              ))}
            </ol>
          )}
        </>)}
      </SheetContent>
    </Sheet>
  );
}
