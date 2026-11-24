import { useCallback, useMemo, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ChevronDown, Mail, MessageSquare, Plus, RefreshCw, Send, Server, Users, Megaphone, Repeat } from "lucide-react";
import { scheduleBetween, nextEmail, EMAILS_PER_ROUND } from "@/lib/campaignSchedule";

type Row = Record<string, any>;
const day = (t?: string | Date | null) => (t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const n = (v?: number | null) => (v == null ? "—" : v.toLocaleString("en-GB"));
const OK = ["ok", "connected", "healthy", "active"];
const STALE_MS = 60 * 60 * 1000;

type Camp = {
  key: string; businessId: string; name: string; kind: "live" | "draft";
  status: string; people: number | null; sent: number | null; replies: number | null; bounces: number | null;
  start: Date | null; next: Date | null; nextLabel: string; aiRefresh?: boolean; draft?: Row;
};

export default function EmailOutreach() {
  const [d, setD] = useState<{ biz: Row[]; plans: Row[]; snaps: Row[]; drafts: Row[]; boxes: Row[]; replies: Row[]; books: Row[]; rel: Record<string, number> } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Camp | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data: biz } = await supabase.from("businesses").select("id, name").eq("portfolio_status", "active").order("name");
    const ids = (biz ?? []).map((b) => b.id);
    const [plans, snaps, drafts, boxes, replies, books, ...counts] = await Promise.all([
      supabase.from("campaign_recurrence_plans").select("*").eq("active", true).in("business_id", ids),
      supabase.from("smartlead_campaign_snapshots").select("*").in("business_id", ids),
      supabase.from("outreach_campaign_drafts").select("*").in("business_id", ids).eq("lead_criteria->>created_from", "email_outreach_dashboard").order("created_at", { ascending: false }),
      supabase.from("gsm_mailboxes").select("email, smtp_status, imap_status, quarantined_reason").eq("estate_classification", "gsm").eq("active", true).eq("retired", false).limit(1000),
      supabase.from("smartlead_activity_events").select("id, business_id, provider_campaign_id, details, occurred_at").in("business_id", ids).ilike("event_type", "%repl%").order("occurred_at", { ascending: false }).limit(10),
      supabase.from("portfolio_send_bookings").select("business_id, campaign_label, sequence_step, recipients_planned").in("business_id", ids).eq("sequence_step", 1),
      ...ids.map((id) => supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_id", id)),
    ]);
    setD({
      biz: biz ?? [], plans: plans.data ?? [], snaps: snaps.data ?? [], drafts: drafts.data ?? [], boxes: boxes.data ?? [], replies: replies.data ?? [], books: books.data ?? [],
      rel: Object.fromEntries(ids.map((id, i) => [id, (counts[i] as any).count ?? 0])),
    });
  }, []);
  const live = useLiveRefresh(load);

  const camps = useMemo<Camp[]>(() => {
    if (!d) return [];
    const now = new Date();
    const liveCamps: Camp[] = d.plans.map((p) => {
      const s = d.snaps.find((x) => x.provider_campaign_id === p.source_campaign_id);
      const fresh = !!s?.last_success_at && Date.now() - new Date(s.last_success_at).getTime() < STALE_MS;
      const start = new Date(p.first_sent_at);
      const nx = nextEmail(start, now);
      return {
        key: p.id, businessId: p.business_id, name: p.campaign_name, kind: "live",
        status: start > now ? "Scheduled" : "Running",
        people: s?.total_leads || d.books.filter((b) => b.business_id === p.business_id && String(b.campaign_label ?? "").includes(p.source_campaign_id)).reduce((a, b) => a + (b.recipients_planned ?? 0), 0) || null, sent: fresh ? s.sent_count : null, replies: fresh ? s.reply_count : null, bounces: fresh ? s.bounce_count : null,
        start, next: nx.at, nextLabel: `Round ${nx.round}, email ${nx.step}`,
      };
    });
    const draftCamps: Camp[] = d.drafts.map((r) => {
      const start = r.lead_criteria?.start_date ? new Date(r.lead_criteria.start_date) : null;
      return {
        key: r.id, businessId: r.business_id, name: r.campaign_name, kind: "draft",
        status: r.founder_approval_state === "approved" ? "Approved" : "Waiting for approval",
        people: null, sent: null, replies: null, bounces: null, start, next: start, nextLabel: "Email 1",
        aiRefresh: !!r.lead_criteria?.ai_refresh, draft: r,
      };
    });
    return [...liveCamps, ...draftCamps];
  }, [d]);

  const healthy = (d?.boxes ?? []).filter((m) => OK.includes(String(m.smtp_status).toLowerCase()) && OK.includes(String(m.imap_status).toLowerCase()) && !m.quarantined_reason).length;
  const sum = (k: "people" | "sent" | "replies") => camps.reduce((a, c) => a + (c[k] ?? 0), 0);
  const running = camps.filter((c) => c.kind === "live").length;

  const approve = async (c: Camp) => {
    const { error } = await supabase.from("outreach_campaign_drafts").update({ founder_approval_state: "approved", founder_approved_at: new Date().toISOString(), status: "approved" }).eq("id", c.key);
    if (error) return toast.error("Couldn't approve: " + error.message);
    toast.success(`${c.name} approved`);
    setDetail(null); live.refresh();
  };

  return (
    <FounderLayout>
      <div className="theme-light min-h-full space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email outreach</h1>
            <p className="text-sm text-muted-foreground">Every business, every campaign, every send date.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{live.at ? `Updated ${live.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Loading…"}</span>
            <Button size="sm" variant="outline" onClick={live.refresh} disabled={live.busy}><RefreshCw className={`mr-1 h-3 w-3 ${live.busy ? "animate-spin" : ""}`} />Update</Button>
            <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" />New campaign</Button>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat tone="blue" icon={Building2} label="Businesses" value={n(d?.biz.length)} />
          <Stat tone="violet" icon={Megaphone} label="Campaigns running" value={n(d ? running : null)} />
          <Stat tone="teal" icon={Users} label="People in campaigns" value={n(d ? sum("people") : null)} />
          <Stat tone="blue" icon={Send} label="Emails sent" value={n(d ? sum("sent") : null)} />
          <Stat tone="green" icon={MessageSquare} label="Replies" value={n(d ? sum("replies") : null)} />
          <Stat tone="amber" icon={Server} label="Healthy mailboxes" value={d ? `${healthy} / ${d.boxes.length}` : "—"} />
        </div>

        {/* Businesses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Businesses</h2>
          {!d ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card> : d.biz.map((b) => {
            const mine = camps.filter((c) => c.businessId === b.id);
            const isOpen = open[b.id] ?? true;
            return (
              <Collapsible key={b.id} open={isOpen} onOpenChange={(v) => setOpen((o) => ({ ...o, [b.id]: v }))}>
                <Card className="tech-card">
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between gap-3 p-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
                        <div>
                          <div className="font-semibold">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{mine.length} campaign{mine.length === 1 ? "" : "s"} · {n(d.rel[b.id])} people in CRM</div>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
                      {mine.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
                      {mine.map((c) => <CampaignCard key={c.key} c={c} onOpen={() => setDetail(c)} />)}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {d && <CalendarView camps={camps} names={Object.fromEntries(d.biz.map((b) => [b.id, b.name]))} />}

        {/* Replies */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" />Latest replies</CardTitle></CardHeader>
          <CardContent>
            {!d ? "Loading…" : d.replies.length === 0 ? <p className="text-sm text-muted-foreground">No replies yet.</p> : (
              <ul className="divide-y divide-border text-sm">{d.replies.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{r.details?.lead_email ?? r.details?.email ?? "Someone"} · {camps.find((c) => d.plans.find((p) => p.id === c.key && p.source_campaign_id === r.provider_campaign_id))?.name ?? "Campaign"}</span>
                  <span className="text-muted-foreground">{day(r.occurred_at)}</span>
                </li>))}</ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DetailSheet c={detail} onClose={() => setDetail(null)} onApprove={approve} />
      {d && <NewCampaignDialog open={creating} onClose={() => setCreating(false)} businesses={d.biz} onSaved={live.refresh} />}
    </FounderLayout>
  );
}

function Stat({ icon: Icon, label, value, tone = "blue" }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <Card className={`tech-card tone-${tone} relative overflow-hidden`}><CardContent className="p-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-[hsl(var(--tone))]" />
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--tone)/0.12)] text-[hsl(var(--tone))]"><Icon className="h-4 w-4" /></span>{label}</div>
      <div className="mt-3 whitespace-nowrap text-2xl font-bold tabular-nums xl:text-3xl text-[hsl(var(--tone))]">{value}</div>
    </CardContent></Card>
  );
}


function CampaignCard({ c, onOpen }: { c: Camp; onOpen: () => void }) {
  const pct = c.people && c.sent != null ? Math.min(100, Math.round((c.sent / c.people) * 100)) : null;
  return (
    <button onClick={onOpen} className={`tech-card ${c.status === "Running" ? "tone-green" : c.status === "Approved" ? "tone-blue" : "tone-amber"} rounded-lg border border-l-4 border-border border-l-[hsl(var(--tone))] bg-card p-4 text-left transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{c.name}</div>
        <Badge className="border-0 bg-[hsl(var(--tone)/0.15)] text-[hsl(var(--tone))] hover:bg-[hsl(var(--tone)/0.15)]">{c.status}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-[hsl(var(--tone-teal)/0.1)] py-2"><div className="text-lg font-bold tabular-nums text-[hsl(var(--tone-teal))]">{n(c.people)}</div><div className="text-muted-foreground">People</div></div>
        <div className="rounded-md bg-[hsl(var(--tone-blue)/0.1)] py-2"><div className="text-lg font-bold tabular-nums text-[hsl(var(--tone-blue))]">{n(c.sent)}</div><div className="text-muted-foreground">Sent</div></div>
        <div className="rounded-md bg-[hsl(var(--tone-green)/0.1)] py-2"><div className="text-lg font-bold tabular-nums text-[hsl(var(--tone-green))]">{n(c.replies)}</div><div className="text-muted-foreground">Replies</div></div>
      </div>
      {pct != null && <Progress value={pct} className="mt-3 h-1.5" />}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />Next: {c.nextLabel} · {day(c.next)}</span>
        <span className="flex items-center gap-1"><Repeat className="h-3 w-3" />4 emails, every quarter</span>
      </div>
    </button>
  );
}

/** 12-month timeline: one row per campaign, a dot per email, rounds repeating every quarter. */
function CalendarView({ camps, names }: { camps: Camp[]; names: Record<string, string> }) {
  const from = new Date(); from.setUTCDate(1); from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 12);
  const span = to.getTime() - from.getTime();
  const pos = (t: Date) => `${((t.getTime() - from.getTime()) / span) * 100}%`;
  const months = Array.from({ length: 12 }, (_, i) => { const m = new Date(from); m.setUTCMonth(m.getUTCMonth() + i); return m; });
  const rows = camps.filter((c) => c.start);
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg"><Repeat className="h-5 w-5 text-primary" />Campaign calendar</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Email sent / due</span>
          <span className="flex items-center gap-1"><span className="h-3 w-0.5 bg-destructive" />Today</span>
          <span>Repeats every quarter, forever</span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="ml-56 grid grid-cols-12 border-b border-border pb-2 text-xs text-muted-foreground">
            {months.map((m) => <div key={m.toISOString()}>{m.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}</div>)}
          </div>
          {rows.length === 0 && <p className="py-4 text-sm text-muted-foreground">No campaigns scheduled.</p>}
          {rows.map((c) => {
            const emails = scheduleBetween(c.start!, from, to);
            const rounds = [...new Set(emails.map((e) => e.round))];
            return (
              <div key={c.key} className="flex items-center border-b border-border/50 py-3">
                <div className="w-56 shrink-0 pr-3">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{names[c.businessId]}</div>
                </div>
                <div className="relative h-8 flex-1">
                  {months.map((m, i) => <div key={i} className="absolute top-0 h-full border-l border-border/40" style={{ left: `${(i / 12) * 100}%` }} />)}
                  {rounds.map((r) => {
                    const es = emails.filter((e) => e.round === r);
                    return <div key={r} className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[hsl(var(--tone-violet)/0.2)]" style={{ left: pos(es[0].at), width: `calc(${pos(es[es.length - 1].at)} - ${pos(es[0].at)} + 8px)` }} title={`Round ${r}`} />;
                  })}
                  {emails.map((e) => (
                    <div key={`${e.round}-${e.step}`} title={`Round ${e.round}, email ${e.step} of ${EMAILS_PER_ROUND} · ${day(e.at)}`}
                      className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background ${c.kind === "draft" ? "bg-muted-foreground" : "bg-primary"}`} style={{ left: pos(e.at) }} />
                  ))}
                  <div className="absolute top-0 h-full w-0.5 bg-destructive" style={{ left: pos(new Date()) }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSheet({ c, onClose, onApprove }: { c: Camp | null; onClose: () => void; onApprove: (c: Camp) => void }) {
  const upcoming = c?.start ? scheduleBetween(c.start, new Date(Date.now() - 30 * 86400000), new Date(Date.now() + 200 * 86400000)) : [];
  const emails: Row[] = c?.draft?.email_sequence ?? [];
  return (
    <Sheet open={!!c} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="theme-light w-full overflow-y-auto sm:max-w-lg">
        {c && <>
          <SheetHeader><SheetTitle>{c.name}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-5 text-sm">
            <Badge className="border-0 bg-[hsl(var(--tone)/0.15)] text-[hsl(var(--tone))] hover:bg-[hsl(var(--tone)/0.15)]">{c.status}</Badge>
            <div className="grid grid-cols-2 gap-3">
              {[["People", c.people], ["Sent", c.sent], ["Replies", c.replies], ["Bounces", c.bounces]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular-nums">{n(v as number | null)}</div></div>
              ))}
            </div>
            <div>
              <h3 className="mb-2 font-medium">Send dates</h3>
              <ul className="space-y-1">{upcoming.map((e) => (
                <li key={`${e.round}-${e.step}`} className={`flex justify-between rounded px-2 py-1 ${e.at < new Date() ? "text-muted-foreground" : ""}`}>
                  <span>Round {e.round} · Email {e.step}</span><span>{day(e.at)}</span>
                </li>))}</ul>
              <p className="mt-2 text-xs text-muted-foreground">Then every 3 months, forever.</p>
            </div>
            {c.kind === "draft" && <>
              <div><h3 className="mb-1 font-medium">AI refresh each quarter</h3><p>{c.aiRefresh ? "On: the emails are lightly reworded for each new round." : "Off: the same emails are used each round."}</p></div>
              {emails.length > 0 && <div><h3 className="mb-2 font-medium">Emails</h3>
                <ol className="space-y-3">{emails.map((e, i) => <li key={i} className="rounded-lg border border-border p-3"><div className="font-medium">{i + 1}. {e.subject}</div><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{e.body}</p></li>)}</ol></div>}
              {c.status !== "Approved" && <Button className="w-full" onClick={() => onApprove(c)}><Send className="mr-2 h-4 w-4" />Approve campaign</Button>}
            </>}
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}

function NewCampaignDialog({ open, onClose, businesses, onSaved }: { open: boolean; onClose: () => void; businesses: Row[]; onSaved: () => void }) {
  const blank = () => Array.from({ length: EMAILS_PER_ROUND }, () => ({ subject: "", body: "" }));
  const [biz, setBiz] = useState<string>("");
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [audience, setAudience] = useState("");
  const [emails, setEmails] = useState(blank);
  const [quarterly, setQuarterly] = useState(true);
  const [ai, setAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const bizId = biz || businesses[0]?.id || "";
  const ok = bizId && name.trim() && start && emails.every((e) => e.subject.trim() && e.body.trim());

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("outreach_campaign_drafts").insert({
      business_id: bizId, campaign_name: name.trim(), status: "draft", founder_approval_state: "requested",
      email_sequence: emails, external_send_blocked: true, unsubscribe_required: true,
      lead_criteria: { created_from: "email_outreach_dashboard", start_date: start, audience: audience.trim(), repeat_quarterly: quarterly, ai_refresh: ai },
    });
    setSaving(false);
    if (error) return toast.error("Couldn't save: " + error.message);
    toast.success("Campaign saved");
    setName(""); setStart(""); setAudience(""); setEmails(blank()); setAi(false);
    onClose(); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Business</Label>
              <Select value={bizId} onValueChange={setBiz}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          </div>
          <div><Label>Campaign name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kindnesss — UK primary schools" /></div>
          <div><Label>Who it goes to</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Apollo list: UK primary head teachers" /></div>
          {emails.map((e, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Email {i + 1}{i > 0 ? ` · ${i * 7} days later` : ""}</div>
              <Input placeholder="Subject" value={e.subject} onChange={(ev) => setEmails((xs) => xs.map((x, j) => (j === i ? { ...x, subject: ev.target.value } : x)))} />
              <Textarea rows={4} placeholder="Email text" value={e.body} onChange={(ev) => setEmails((xs) => xs.map((x, j) => (j === i ? { ...x, body: ev.target.value } : x)))} />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={quarterly} onCheckedChange={(v) => setQuarterly(!!v)} />Repeat every quarter</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={ai} onCheckedChange={(v) => setAi(!!v)} />Let AI lightly refresh the emails for each new quarterly round</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!ok || saving} onClick={save}>{saving ? "Saving…" : "Save campaign"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
