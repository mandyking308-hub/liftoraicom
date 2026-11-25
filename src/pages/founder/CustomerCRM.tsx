import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Send, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import SpreadsheetImportDialog from "@/components/founder/contacts/SpreadsheetImportDialog";
import AddToCampaignDialog from "@/components/founder/contacts/AddToCampaignDialog";
import { CRM_FIELDS } from "@/lib/spreadsheetImport";

type Person = { id: string; email: string; name: string | null; company: string | null; role: string | null; country: string | null; tags: string[] | null; email_verified_status: string | null; last_contacted_at: string | null; blocked: boolean; campaigns: string[] };
type Summary = { total: number; usable: number; in_campaign: number; types: Record<string, number>; countries: string[] };
const PAGE = 50;
const ALL = "__all";
const fmt = (v?: number | null) => (v == null ? "—" : v.toLocaleString("en-GB"));
const day = (t?: string | null) => (t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const DEFAULT_TYPES = ["Education", "Corporate", "Charity"];

export default function CustomerCRM() {
  const [params] = useSearchParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [campaignFilter, setCampaignFilter] = useState<"any" | "not_in_any" | "not_in" | "in">(params.get("campaign") ? "not_in" : "any");
  const [campaignId, setCampaignId] = useState<string>(params.get("campaign") ?? "");
  const [usableOnly, setUsableOnly] = useState(false);
  const [quiet90, setQuiet90] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState("Education");
  const [newType, setNewType] = useState("");
  const [addIds, setAddIds] = useState<string[] | null>(null);
  const [person, setPerson] = useState<Person | null>(null);

  const filters = useCallback(() => ({
    p_type: type === ALL ? null : type,
    p_country: country === ALL ? null : country,
    p_search: search.trim() || null,
    p_campaign: campaignFilter === "in" || campaignFilter === "not_in" ? campaignId || null : null,
    p_not_in_campaign: campaignFilter === "not_in" || campaignFilter === "not_in_any",
    p_not_contacted_days: quiet90 ? 90 : null,
    p_usable_only: usableOnly,
  }), [type, country, search, campaignFilter, campaignId, quiet90, usableOnly]);

  const loadSummary = useCallback(async () => {
    const { data, error } = await supabase.rpc("crm_summary" as never);
    if (error) toast.error("Could not load CRM totals"); else setSummary(data as unknown as Summary);
    const { data: m } = await supabase.from("outbound_provider_campaign_mappings").select("provider_campaign_id, provider_campaign_name").eq("provider_type", "smartlead").eq("mapping_status", "mapped");
    setCamps((m ?? []).map((x: any) => ({ id: String(x.provider_campaign_id), name: x.provider_campaign_name ?? x.provider_campaign_id })));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("crm_people_search" as never, { ...filters(), p_limit: PAGE, p_offset: page * PAGE } as never);
    setLoading(false);
    if (error) { toast.error("Could not load people"); return; }
    const d = data as unknown as { total: number; rows: Person[] };
    setRows(d.rows ?? []); setTotal(d.total ?? 0);
  }, [filters, page]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { const t = setTimeout(() => void loadRows(), 250); return () => clearTimeout(t); }, [loadRows]);
  useEffect(() => { setPage(0); setSelected(new Set()); }, [type, country, search, campaignFilter, campaignId, quiet90, usableOnly]);
  useEffect(() => { if (!campaignId && camps.length) setCampaignId(camps[camps.length - 1].id); }, [camps, campaignId]);

  async function addAllMatching() {
    const { data, error } = await supabase.rpc("crm_people_search" as never, { ...filters(), p_ids_only: true } as never);
    if (error) { toast.error("Could not collect people"); return; }
    const d = data as unknown as { total: number; ids: string[] };
    if (d.total > d.ids.length) toast.message(`Adding the first ${d.ids.length.toLocaleString("en-GB")} of ${d.total.toLocaleString("en-GB")}. Repeat to add the rest.`);
    setAddIds(d.ids);
  }

  const types = Array.from(new Set([...DEFAULT_TYPES, ...Object.keys(summary?.types ?? {})])).sort();
  const notIn = summary ? Math.max(0, summary.total - summary.in_campaign) : null;
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <FounderLayout>
      <div className="theme-light min-h-full space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Customer CRM</h1>
            <p className="text-sm text-muted-foreground">Every customer contact for every business, in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { void loadSummary(); void loadRows(); }}><RefreshCw className="mr-2 h-4 w-4" />Update</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload</Button>
            <Button onClick={addAllMatching} disabled={!total}><Send className="mr-2 h-4 w-4" />Add all {fmt(total)} to campaign</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi tone="blue" label="Total people" value={fmt(summary?.total)} />
          <Kpi tone="green" label="Usable (checked email)" value={fmt(summary?.usable)} />
          <Kpi tone="violet" label="In a campaign" value={fmt(summary?.in_campaign)} />
          <Kpi tone="amber" label="Not yet in a campaign" value={fmt(notIn)} />
        </div>

        {summary && Object.keys(summary.types).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.types).map(([t, c]) => (
              <button key={t} onClick={() => setType(type === t ? ALL : t)} className={`rounded-full border px-3 py-1 text-sm ${type === t ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t} · {fmt(c)}</button>
            ))}
          </div>
        )}

        <Card><CardContent className="space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Search name, email or organisation" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>All types</SelectItem>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>All countries</SelectItem>{(summary?.countries ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v as never)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any campaign status</SelectItem>
                <SelectItem value="not_in_any">Not in any campaign</SelectItem>
                <SelectItem value="not_in">Not in a chosen campaign</SelectItem>
                <SelectItem value="in">In a chosen campaign</SelectItem>
              </SelectContent></Select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {(campaignFilter === "in" || campaignFilter === "not_in") && (
              <Select value={campaignId} onValueChange={setCampaignId}><SelectTrigger className="w-80"><SelectValue placeholder="Choose campaign" /></SelectTrigger>
                <SelectContent>{camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            )}
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={usableOnly} onCheckedChange={(v) => setUsableOnly(!!v)} />Usable only</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={quiet90} onCheckedChange={(v) => setQuiet90(!!v)} />Not contacted in last 3 months</label>
            <span className="ml-auto text-sm font-medium">{loading ? "Loading…" : `${fmt(total)} match`}</span>
          </div>
        </CardContent></Card>

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
            <span className="text-sm">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" onClick={() => setAddIds([...selected])}>Add selected to campaign</Button>
            </div>
          </div>
        )}

        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left"><tr>
                <th className="w-10 p-3"><Checkbox aria-label="Select page" checked={allOnPage} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id))); return n; })} /></th>
                <th className="p-3">Person</th><th className="p-3">Organisation</th><th className="p-3">Type</th><th className="p-3">Country</th><th className="p-3">Campaigns</th><th className="p-3">Last contacted</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setPerson(r)}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(r.id) : n.delete(r.id); return n; })} /></td>
                    <td className="p-3"><div className="font-medium">{r.name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div>
                      {r.blocked && <Badge variant="destructive" className="mt-1">Do not contact</Badge>}
                      {!r.blocked && r.email_verified_status === "catch_all_risky" && <Badge variant="outline" className="mt-1">Catch-all</Badge>}
                    </td>
                    <td className="p-3">{r.company || "—"}<div className="text-xs text-muted-foreground">{r.role}</div></td>
                    <td className="p-3">{(r.tags ?? []).filter((t) => t.startsWith("type:")).map((t) => <Badge key={t} variant="secondary" className="mr-1">{t.slice(5)}</Badge>)}</td>
                    <td className="p-3">{r.country || "—"}</td>
                    <td className="p-3">{r.campaigns?.length ? r.campaigns.length : "—"}</td>
                    <td className="p-3">{day(r.last_contacted_at)}</td>
                  </tr>
                ))}
                {!loading && !rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No people match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 text-sm">
            <span className="text-muted-foreground">{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${fmt(total)}` : ""}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent></Card>

        <p className="text-sm text-muted-foreground">
          More: <Link className="underline" to="/founder/pr-marketing">PR & Marketing contacts</Link> · <Link className="underline" to="/founder/crm/details">Full CRM details</Link>
        </p>
      </div>

      <SpreadsheetImportDialog
        open={importOpen} onOpenChange={setImportOpen} title="Upload people to the CRM" fields={CRM_FIELDS} requireEmail
        canSave={!!(newType.trim() || importType)}
        extra={
          <div className="space-y-1">
            <Label>What type of people are these?</Label>
            <div className="flex gap-2">
              <Select value={importType} onValueChange={(v) => { setImportType(v); setNewType(""); }}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="…or type a new one" value={newType} onChange={(e) => setNewType(e.target.value)} className="w-56" />
            </div>
          </div>
        }
        saveChunk={async (chunk) => {
          const { data, error } = await supabase.rpc("crm_import_contacts" as never, { p_rows: chunk, p_type: (newType.trim() || importType), p_source: "crm_upload" } as never);
          if (error) throw new Error(error.message);
          return data as unknown as Record<string, number>;
        }}
        resultLabels={{ new: "New people added", merged: "Already in CRM (updated)", invalid: "Bad email (skipped)", do_not_contact: "Do-not-contact (kept blocked)" }}
        onDone={() => { void loadSummary(); void loadRows(); }}
      />

      <AddToCampaignDialog open={!!addIds} onOpenChange={(o) => !o && setAddIds(null)} contactIds={addIds ?? []}
        defaultCampaign={campaignFilter === "not_in" ? campaignId : null}
        onDone={() => { setSelected(new Set()); void loadSummary(); void loadRows(); }} />

      <PersonSheet person={person} onClose={() => setPerson(null)} />
    </FounderLayout>
  );
}

function Kpi({ tone, label, value }: { tone: string; label: string; value: string }) {
  return <div className={`tone-${tone} rounded-lg border border-[hsl(var(--tone)/0.4)] bg-[hsl(var(--tone)/0.1)] p-4 text-[hsl(var(--tone))]`}><div className="text-xs font-medium opacity-80">{label}</div><div className="text-3xl font-bold tabular-nums">{value}</div></div>;
}

type Ev = { at: string; what: string; detail?: string | null };
const EVENT_LABEL: Record<string, string> = { sent: "Email sent", email_sent: "Email sent", open: "Opened", email_open: "Opened", opened: "Opened", click: "Clicked a link", reply: "Replied", replied: "Replied", email_reply: "Replied", bounce: "Bounced", bounced: "Bounced", unsubscribe: "Unsubscribed", unsubscribed: "Unsubscribed", added_to_campaign: "Added to campaign" };
const label = (t?: string | null) => {
  if (!t) return "Activity";
  const k = t.toLowerCase().replace(/^(smartlead|native)_(email_)?/, "");
  return EVENT_LABEL[k] ?? EVENT_LABEL[t.toLowerCase()] ?? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
};

function PersonSheet({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [inCamps, setInCamps] = useState<{ id: string; status: string | null; sent: number; replies: number }[]>([]);
  useEffect(() => {
    if (!person) return;
    setEvents(null);
    (async () => {
      // Only records tied to THIS person (never business-wide events).
      const [led, sl, ee, cm] = await Promise.all([
        supabase.from("crm_interaction_ledger").select("interaction_type, occurred_at, subject, summary, provider_campaign_id").eq("contact_id", person.id).order("occurred_at", { ascending: false }).limit(300),
        supabase.from("smartlead_activity_events").select("event_type, occurred_at, provider_campaign_id").eq("liftor_contact_id", person.id).order("occurred_at", { ascending: false }).limit(300),
        supabase.from("email_events").select("event_type, timestamp").eq("contact_id", person.id).limit(300),
        supabase.from("communications").select("direction, timestamp, message").eq("contact_id", person.id).limit(300),
      ]);
      const { data: leads } = await supabase.from("smartlead_lead_snapshots").select("provider_lead_id, provider_campaign_id, lead_status, sent_count, reply_count").ilike("email", person.email).limit(20);
      const leadIds = (leads ?? []).map((l: any) => l.provider_lead_id).filter(Boolean);
      const byLead = leadIds.length
        ? await supabase.from("smartlead_activity_events").select("event_type, occurred_at, provider_campaign_id").in("provider_lead_id", leadIds).order("occurred_at", { ascending: false }).limit(300)
        : { data: [] as any[] };
      const out: Ev[] = [];
      const seen = new Set<string>();
      const push = (type: string, at: string, detail?: string | null) => {
        const k = `${label(type)}:${String(at).slice(0, 16)}`;
        if (seen.has(k)) return; seen.add(k); out.push({ at, what: label(type), detail });
      };
      for (const r of (led.data ?? []) as any[]) push(r.interaction_type, r.occurred_at, r.subject || (r.provider_campaign_id ? `Campaign ${r.provider_campaign_id}` : r.summary));
      for (const r of [...((sl.data ?? []) as any[]), ...((byLead.data ?? []) as any[])]) push(r.event_type, r.occurred_at, `Campaign ${r.provider_campaign_id}`);
      for (const r of (ee.data ?? []) as any[]) push(r.event_type, r.timestamp);
      for (const r of (cm.data ?? []) as any[]) push(r.direction === "inbound" ? "reply" : "sent", r.timestamp, String(r.message ?? "").slice(0, 80));
      out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
      setEvents(out);
      setInCamps(((leads ?? []) as any[]).map((l) => ({ id: String(l.provider_campaign_id), status: l.lead_status, sent: l.sent_count ?? 0, replies: l.reply_count ?? 0 })));
    })();
  }, [person]);
  return (
    <Sheet open={!!person} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="theme-light w-full overflow-y-auto bg-background text-foreground sm:max-w-lg">
        {person && (<>
          <SheetHeader><SheetTitle>{person.name || person.email}</SheetTitle></SheetHeader>
          <div className="mt-2 space-y-1 text-sm">
            <div>{person.email}</div>
            <div className="text-muted-foreground">{[person.role, person.company, person.country].filter(Boolean).join(" · ")}</div>
            {person.blocked && <Badge variant="destructive">Do not contact</Badge>}
          </div>
          {inCamps.length > 0 && (<>
            <h3 className="mt-6 mb-2 font-semibold">Campaigns</h3>
            <ul className="space-y-1 text-sm">{inCamps.map((c) => <li key={c.id}>Campaign {c.id}: {c.sent} email{c.sent === 1 ? "" : "s"} sent, {c.replies} repl{c.replies === 1 ? "y" : "ies"}{c.sent === 0 ? " — waiting for first email" : ""}</li>)}</ul>
          </>)}
          <h3 className="mt-6 mb-2 font-semibold">Journey</h3>
          {events === null ? <p className="text-sm text-muted-foreground">Loading…</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">No contact with this person yet.</p> : (
            <ol className="space-y-3 border-l pl-4">
              {events.map((e, i) => (
                <li key={i} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-sm font-medium">{e.what}</div>
                  <div className="text-xs text-muted-foreground">{e.at ? new Date(e.at).toLocaleString("en-GB") : ""}{e.detail ? ` · ${e.detail}` : ""}</div>
                </li>
              ))}
            </ol>
          )}
          <Link to={`/founder/crm/contacts/${person.id}`} className="mt-6 inline-block text-sm underline">Open full record</Link>
        </>)}
      </SheetContent>
    </Sheet>
  );
}
