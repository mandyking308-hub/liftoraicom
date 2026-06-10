import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Network, Plus, Download, ShieldAlert, Lock, Pause, CheckCircle2, FileSignature } from "lucide-react";

const sb: any = supabase as any;

const REL_TYPES = ["adviser","supplier","potential_customer","referral_partner","buyer","investor","finance_route","government_trade_route","property_residency_route","operations_support","school_education_contact","legal_tax_contact","m_and_a_contact","media_content_contact","other"] as const;
const STATUSES = ["new","active","warm","needs_follow_up","waiting_on_them","meeting_booked","proposal_requested","nda_required","onboarding_pending","parked","rejected","do_not_contact"] as const;
const ROLES = ["customer","adviser","introducer","supplier","operator","buyer","partner","investor","intelligence_source","gatekeeper","unknown"] as const;
const TRUST = ["unknown","low","medium","high","vetted"] as const;
const DISCLOSURE = ["public_only","light_context","nda_before_detail","confidential_allowed","restricted"] as const;
const SOURCES = ["gmail","calendar","manual","event","referral","website","linkedin","other"] as const;

type Contact = any;

const emptyForm = {
  contact_name: "", organisation_name: "", email: "", phone: "", website: "",
  jurisdiction: "", city_country: "",
  relationship_type: "other", relationship_status: "new", opportunity_role: "unknown",
  trust_level: "unknown", disclosure_level: "public_only",
  commercial_value_score: 1, strategic_value_score: 1, urgency_score: 1,
  next_action_at: "", next_action_summary: "", source: "manual", source_notes: "",
  meeting_summary: "", ai_summary: "", founder_notes: "", tags: "",
};

function disclosureTone(d: string) {
  if (d === "restricted" || d === "confidential_allowed") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (d === "nda_before_detail") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (d === "light_context") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

function pretty(s?: string | null) { return (s ?? "").replace(/_/g, " "); }

export default function RelationshipIntelligence() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [drawer, setDrawer] = useState<Contact | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [filters, setFilters] = useState({ type: "all", status: "all", disclosure: "all", trust: "all", jurisdiction: "", dueOnly: false, search: "" });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["rni-contacts"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationship_intelligence_contacts").select("*").order("updated_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["rni-events", drawer?.id],
    enabled: !!drawer?.id,
    queryFn: async () => {
      const { data } = await sb.from("relationship_intelligence_events").select("*").eq("contact_id", drawer!.id).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const tags = typeof payload.tags === "string" ? payload.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : (payload.tags ?? []);
      const next_action_at = payload.next_action_at ? new Date(payload.next_action_at).toISOString() : null;
      const row = { ...payload, tags, next_action_at };
      if (editing?.id) {
        const { error } = await sb.from("relationship_intelligence_contacts").update(row).eq("id", editing.id);
        if (error) throw error;
        await sb.from("relationship_intelligence_events").insert({ contact_id: editing.id, event_type: "updated", summary: "Contact updated" });
      } else {
        const { data: u } = await sb.auth.getUser();
        const { data, error } = await sb.from("relationship_intelligence_contacts").insert({ ...row, created_by: u?.user?.id ?? null }).select("id").single();
        if (error) throw error;
        await sb.from("relationship_intelligence_events").insert({ contact_id: data.id, event_type: "created", summary: "Contact added manually" });
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Relationship updated" : "Relationship added" });
      setOpen(false); setEditing(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["rni-contacts"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const quickAction = useMutation({
    mutationFn: async ({ c, kind }: { c: Contact; kind: string }) => {
      const patch: any = {};
      let summary = "";
      const now = new Date().toISOString();
      if (kind === "followed_up") { patch.last_contact_at = now; patch.relationship_status = "active"; summary = "Marked as followed up"; }
      else if (kind === "parked") { patch.relationship_status = "parked"; summary = "Parked"; }
      else if (kind === "nda") { patch.relationship_status = "nda_required"; patch.disclosure_level = "nda_before_detail"; summary = "Marked NDA required"; }
      else if (kind === "restrict") { patch.disclosure_level = "restricted"; summary = "Marked do-not-disclose sensitive info"; }
      const { error } = await sb.from("relationship_intelligence_contacts").update(patch).eq("id", c.id);
      if (error) throw error;
      await sb.from("relationship_intelligence_events").insert({ contact_id: c.id, event_type: kind, summary });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rni-contacts"] }); qc.invalidateQueries({ queryKey: ["rni-events"] }); toast({ title: "Updated" }); },
  });

  const addMeetingNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await sb.from("relationship_intelligence_contacts").update({ meeting_summary: note, last_contact_at: new Date().toISOString() }).eq("id", id);
      await sb.from("relationship_intelligence_events").insert({ contact_id: id, event_type: "meeting_note", summary: note.slice(0, 200) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rni-contacts"] }); qc.invalidateQueries({ queryKey: ["rni-events"] }); },
  });

  const addNextAction = useMutation({
    mutationFn: async ({ id, when, what }: { id: string; when: string; what: string }) => {
      await sb.from("relationship_intelligence_contacts").update({ next_action_at: when ? new Date(when).toISOString() : null, next_action_summary: what }).eq("id", id);
      await sb.from("relationship_intelligence_events").insert({ contact_id: id, event_type: "next_action_set", summary: what });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rni-contacts"] }); qc.invalidateQueries({ queryKey: ["rni-events"] }); },
  });

  const filtered = useMemo(() => contacts.filter((c: any) => {
    if (filters.type !== "all" && c.relationship_type !== filters.type) return false;
    if (filters.status !== "all" && c.relationship_status !== filters.status) return false;
    if (filters.disclosure !== "all" && c.disclosure_level !== filters.disclosure) return false;
    if (filters.trust !== "all" && c.trust_level !== filters.trust) return false;
    if (filters.jurisdiction && !(c.jurisdiction ?? "").toLowerCase().includes(filters.jurisdiction.toLowerCase())) return false;
    if (filters.dueOnly && !(c.next_action_at && new Date(c.next_action_at) <= new Date())) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${c.contact_name} ${c.organisation_name ?? ""} ${c.email ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [contacts, filters]);

  const counts = useMemo(() => {
    const c = contacts as any[];
    return {
      total: c.length,
      followUp: c.filter(x => x.relationship_status === "needs_follow_up").length,
      meetings: c.filter(x => x.relationship_status === "meeting_booked").length,
      nda: c.filter(x => x.relationship_status === "nda_required" || x.disclosure_level === "nda_before_detail").length,
      prospects: c.filter(x => x.relationship_type === "potential_customer").length,
      advisers: c.filter(x => x.relationship_type === "adviser" || x.relationship_type === "legal_tax_contact").length,
      suppliers: c.filter(x => x.relationship_type === "supplier" || x.relationship_type === "operations_support").length,
      parked: c.filter(x => x.relationship_status === "parked").length,
    };
  }, [contacts]);

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({
      ...emptyForm, ...c,
      next_action_at: c.next_action_at ? c.next_action_at.slice(0, 16) : "",
      tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
    });
    setOpen(true);
  }

  function exportCsv() {
    const cols = ["contact_name","organisation_name","email","phone","jurisdiction","relationship_type","relationship_status","opportunity_role","trust_level","disclosure_level","commercial_value_score","strategic_value_score","urgency_score","last_contact_at","next_action_at","next_action_summary","tags"];
    const rows = [cols.join(",")];
    for (const c of filtered as any[]) {
      rows.push(cols.map(k => {
        const v = (c as any)[k];
        const s = Array.isArray(v) ? v.join("|") : (v ?? "");
        return `"${String(s).replace(/"/g, '""')}"`;
      }).join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relationship-intelligence-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="text-primary" /> Relationship Intelligence</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">Founder network memory: advisers, suppliers, prospects, partners, buyers, government, legal/tax, M&A and operational contacts — with trust, disclosure and next-action context.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add relationship</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { l: "Total", v: counts.total },
          { l: "Needs follow-up", v: counts.followUp, tone: counts.followUp ? "warn" : undefined },
          { l: "Meetings booked", v: counts.meetings, tone: "ok" as const },
          { l: "NDA required", v: counts.nda, tone: counts.nda ? "warn" : undefined },
          { l: "Prospects", v: counts.prospects },
          { l: "Advisers", v: counts.advisers },
          { l: "Suppliers/ops", v: counts.suppliers },
          { l: "Parked", v: counts.parked },
        ].map((s, i) => (
          <Card key={i} className="tech-card"><CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">{s.l}</p>
            <p className={`text-xl font-bold ${s.tone === "warn" ? "text-yellow-300" : s.tone === "ok" ? "text-emerald-300" : ""}`}>{s.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3 text-xs text-yellow-200/90 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Founder-controlled relationship memory. No external outreach is sent from this module. Do not store passwords, bank details, client data, or sensitive family/business information in free-text unless explicitly approved. Gmail / calendar ingestion will create <em>draft suggestions</em> for founder approval — never auto-import.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All contacts</TabsTrigger>
          <TabsTrigger value="gmail">Gmail suggestions</TabsTrigger>
          <TabsTrigger value="calendar">Calendar capture</TabsTrigger>
          <TabsTrigger value="advisers">Adviser map</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier map</TabsTrigger>
          <TabsTrigger value="prospects">Customer / prospect map</TabsTrigger>
          <TabsTrigger value="buyers">Buyer / investor map</TabsTrigger>
          <TabsTrigger value="gov">Government / trade</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          <Card className="tech-card"><CardContent className="p-3 grid md:grid-cols-7 gap-2">
            <Input placeholder="Search name, org, tag…" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v })}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{REL_TYPES.map(t => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map(t => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.disclosure} onValueChange={v => setFilters({ ...filters, disclosure: v })}><SelectTrigger><SelectValue placeholder="Disclosure" /></SelectTrigger><SelectContent><SelectItem value="all">All disclosure</SelectItem>{DISCLOSURE.map(t => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.trust} onValueChange={v => setFilters({ ...filters, trust: v })}><SelectTrigger><SelectValue placeholder="Trust" /></SelectTrigger><SelectContent><SelectItem value="all">All trust</SelectItem>{TRUST.map(t => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Jurisdiction" value={filters.jurisdiction} onChange={e => setFilters({ ...filters, jurisdiction: e.target.value })} />
            <Button variant={filters.dueOnly ? "default" : "outline"} size="sm" onClick={() => setFilters({ ...filters, dueOnly: !filters.dueOnly })}>Due / overdue</Button>
          </CardContent></Card>

          {filtered.length === 0 ? (
            <Card className="tech-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Your network is becoming a business asset. Add advisers, suppliers, partners, prospects and strategic contacts here so Liftor can remember who matters, why they matter and what should happen next.
            </CardContent></Card>
          ) : (
            <Card className="tech-card"><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Contact</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                  <TableHead>Disclosure</TableHead><TableHead>Trust</TableHead>
                  <TableHead>Strategic</TableHead><TableHead>Next action</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setDrawer(c)}>
                      <TableCell>
                        <div className="font-medium">{c.contact_name}</div>
                        <div className="text-xs text-muted-foreground">{c.organisation_name} {c.jurisdiction ? `· ${c.jurisdiction}` : ""}</div>
                      </TableCell>
                      <TableCell className="text-xs">{pretty(c.relationship_type)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{pretty(c.relationship_status)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${disclosureTone(c.disclosure_level)}`}>{pretty(c.disclosure_level)}</Badge></TableCell>
                      <TableCell className="text-xs">{pretty(c.trust_level)}</TableCell>
                      <TableCell className="text-xs">{c.strategic_value_score}/5</TableCell>
                      <TableCell className="text-xs">
                        {c.next_action_at ? <div className={new Date(c.next_action_at) <= new Date() ? "text-yellow-300" : ""}>{new Date(c.next_action_at).toLocaleDateString()}</div> : <span className="text-muted-foreground">—</span>}
                        <div className="text-muted-foreground truncate max-w-[220px]">{c.next_action_summary}</div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {[
          { v: "gmail", t: "Gmail suggestions", d: "Future ingestion will land suggested relationship records here as drafts for founder approval. Nothing is imported automatically." },
          { v: "calendar", t: "Calendar meeting capture", d: "Upcoming and recent meetings will be drafted here for review and conversion to relationship records. No auto-import." },
          { v: "advisers", t: "Adviser map", d: "Use the All contacts tab filtered to type = adviser / legal_tax_contact / m_and_a_contact. A dedicated visual map is coming soon." },
          { v: "suppliers", t: "Supplier map", d: "Filter All contacts by supplier / operations_support. Visual supplier map coming soon." },
          { v: "prospects", t: "Customer / prospect map", d: "Filter All contacts by potential_customer / referral_partner. Visual prospect map coming soon." },
          { v: "buyers", t: "Buyer / investor map", d: "Filter All contacts by buyer / investor / finance_route. Visual capital map coming soon." },
          { v: "gov", t: "Government & trade routes", d: "Filter All contacts by government_trade_route / property_residency_route. Country map coming soon." },
        ].map(p => (
          <TabsContent key={p.v} value={p.v}>
            <Card className="tech-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{p.t}</p>{p.d}
            </CardContent></Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit relationship" : "Add relationship"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Contact name *"><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></Field>
            <Field label="Organisation"><Input value={form.organisation_name ?? ""} onChange={e => setForm({ ...form, organisation_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Website"><Input value={form.website ?? ""} onChange={e => setForm({ ...form, website: e.target.value })} /></Field>
            <Field label="Jurisdiction"><Input placeholder="UK / UAE / US / Malta…" value={form.jurisdiction ?? ""} onChange={e => setForm({ ...form, jurisdiction: e.target.value })} /></Field>
            <Field label="City / Country"><Input value={form.city_country ?? ""} onChange={e => setForm({ ...form, city_country: e.target.value })} /></Field>
            <Field label="Source"><Sel value={form.source} onChange={v => setForm({ ...form, source: v })} options={SOURCES} /></Field>
            <Field label="Relationship type"><Sel value={form.relationship_type} onChange={v => setForm({ ...form, relationship_type: v })} options={REL_TYPES} /></Field>
            <Field label="Status"><Sel value={form.relationship_status} onChange={v => setForm({ ...form, relationship_status: v })} options={STATUSES} /></Field>
            <Field label="Opportunity role"><Sel value={form.opportunity_role} onChange={v => setForm({ ...form, opportunity_role: v })} options={ROLES} /></Field>
            <Field label="Trust level"><Sel value={form.trust_level} onChange={v => setForm({ ...form, trust_level: v })} options={TRUST} /></Field>
            <Field label="Disclosure level"><Sel value={form.disclosure_level} onChange={v => setForm({ ...form, disclosure_level: v })} options={DISCLOSURE} /></Field>
            <Field label="Commercial value (1-5)"><Input type="number" min={1} max={5} value={form.commercial_value_score} onChange={e => setForm({ ...form, commercial_value_score: Number(e.target.value) })} /></Field>
            <Field label="Strategic value (1-5)"><Input type="number" min={1} max={5} value={form.strategic_value_score} onChange={e => setForm({ ...form, strategic_value_score: Number(e.target.value) })} /></Field>
            <Field label="Urgency (1-5)"><Input type="number" min={1} max={5} value={form.urgency_score} onChange={e => setForm({ ...form, urgency_score: Number(e.target.value) })} /></Field>
            <Field label="Next action due"><Input type="datetime-local" value={form.next_action_at ?? ""} onChange={e => setForm({ ...form, next_action_at: e.target.value })} /></Field>
            <Field label="Tags (comma separated)"><Input value={form.tags ?? ""} onChange={e => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Next action summary" full><Input value={form.next_action_summary ?? ""} onChange={e => setForm({ ...form, next_action_summary: e.target.value })} /></Field>
            <Field label="Source notes" full><Textarea rows={2} value={form.source_notes ?? ""} onChange={e => setForm({ ...form, source_notes: e.target.value })} /></Field>
            <Field label="Meeting summary" full><Textarea rows={2} value={form.meeting_summary ?? ""} onChange={e => setForm({ ...form, meeting_summary: e.target.value })} /></Field>
            <Field label="AI summary (founder-curated)" full><Textarea rows={2} value={form.ai_summary ?? ""} onChange={e => setForm({ ...form, ai_summary: e.target.value })} /></Field>
            <Field label="Founder notes" full><Textarea rows={3} value={form.founder_notes ?? ""} onChange={e => setForm({ ...form, founder_notes: e.target.value })} placeholder="Avoid storing passwords, bank details or sensitive client info here." /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.contact_name || upsert.isPending} onClick={() => upsert.mutate(form)}>{editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Dialog open={!!drawer} onOpenChange={(v) => !v && setDrawer(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {drawer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {drawer.contact_name}
                  <Badge variant="outline" className={`text-[10px] ${disclosureTone(drawer.disclosure_level)}`}>
                    <Lock className="h-3 w-3 mr-1" />{pretty(drawer.disclosure_level)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid md:grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Organisation:</span> {drawer.organisation_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {drawer.email ?? "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {drawer.phone ?? "—"}</div>
                  <div><span className="text-muted-foreground">Jurisdiction:</span> {drawer.jurisdiction ?? "—"}</div>
                  <div><span className="text-muted-foreground">Type:</span> {pretty(drawer.relationship_type)}</div>
                  <div><span className="text-muted-foreground">Status:</span> {pretty(drawer.relationship_status)}</div>
                  <div><span className="text-muted-foreground">Opportunity role:</span> {pretty(drawer.opportunity_role)}</div>
                  <div><span className="text-muted-foreground">Trust:</span> {pretty(drawer.trust_level)}</div>
                  <div><span className="text-muted-foreground">Last contact:</span> {drawer.last_contact_at ? new Date(drawer.last_contact_at).toLocaleString() : "—"}</div>
                  <div><span className="text-muted-foreground">Next action:</span> {drawer.next_action_at ? new Date(drawer.next_action_at).toLocaleString() : "—"}</div>
                </div>
                {(drawer.disclosure_level === "restricted" || drawer.disclosure_level === "nda_before_detail") && (
                  <div className="text-[11px] text-yellow-300 border border-yellow-500/30 bg-yellow-500/5 p-2 rounded flex items-start gap-2">
                    <ShieldAlert className="h-3 w-3 mt-0.5" /> Disclosure restricted — do not share confidential context externally without founder approval.
                  </div>
                )}
                {drawer.next_action_summary && <Section title="Next action">{drawer.next_action_summary}</Section>}
                {drawer.meeting_summary && <Section title="Last meeting summary">{drawer.meeting_summary}</Section>}
                {drawer.ai_summary && <Section title="AI summary">{drawer.ai_summary}</Section>}
                {drawer.founder_notes && <Section title="Founder notes">{drawer.founder_notes}</Section>}
                {drawer.tags?.length > 0 && <div className="flex gap-1 flex-wrap">{drawer.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>}

                <Section title="Related emails / meetings">
                  <p className="text-xs text-muted-foreground">Gmail and calendar linking will appear here once founder-approved ingestion is enabled.</p>
                </Section>

                <Section title="Quick actions">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => quickAction.mutate({ c: drawer, kind: "followed_up" })}><CheckCircle2 className="h-3 w-3 mr-1" /> Mark followed up</Button>
                    <Button size="sm" variant="outline" onClick={() => quickAction.mutate({ c: drawer, kind: "parked" })}><Pause className="h-3 w-3 mr-1" /> Park</Button>
                    <Button size="sm" variant="outline" onClick={() => quickAction.mutate({ c: drawer, kind: "nda" })}><FileSignature className="h-3 w-3 mr-1" /> Mark NDA required</Button>
                    <Button size="sm" variant="outline" onClick={() => quickAction.mutate({ c: drawer, kind: "restrict" })}><Lock className="h-3 w-3 mr-1" /> Do not disclose</Button>
                    <Button size="sm" onClick={() => { openEdit(drawer); setDrawer(null); }}>Edit</Button>
                  </div>
                </Section>

                <Section title="Add meeting note">
                  <MeetingNoteForm onSubmit={(note) => addMeetingNote.mutate({ id: drawer.id, note })} />
                </Section>
                <Section title="Add next action">
                  <NextActionForm onSubmit={(when, what) => addNextAction.mutate({ id: drawer.id, when, what })} />
                </Section>

                <Section title="Action history">
                  {events.length === 0 ? <p className="text-xs text-muted-foreground">No history yet.</p> : (
                    <ul className="space-y-1 text-xs">
                      {events.map((e: any) => (
                        <li key={e.id} className="border-l-2 border-border/50 pl-2">
                          <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {pretty(e.event_type)}</span>
                          {e.summary && <div>{e.summary}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><label className="text-xs text-muted-foreground block mb-1">{label}</label>{children}</div>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{pretty(o)}</SelectItem>)}</SelectContent></Select>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-t border-border/40 pt-2"><p className="text-xs uppercase text-muted-foreground mb-1">{title}</p>{children}</div>;
}
function MeetingNoteForm({ onSubmit }: { onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="What was discussed, decisions, follow-ups…" />
      <Button size="sm" disabled={!note.trim()} onClick={() => { onSubmit(note); setNote(""); }}>Save meeting note</Button>
    </div>
  );
}
function NextActionForm({ onSubmit }: { onSubmit: (when: string, what: string) => void }) {
  const [when, setWhen] = useState("");
  const [what, setWhat] = useState("");
  return (
    <div className="grid md:grid-cols-3 gap-2">
      <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
      <Input className="md:col-span-2" value={what} onChange={e => setWhat(e.target.value)} placeholder="Next action…" />
      <Button size="sm" disabled={!what.trim()} onClick={() => { onSubmit(when, what); setWhen(""); setWhat(""); }}>Set next action</Button>
    </div>
  );
}