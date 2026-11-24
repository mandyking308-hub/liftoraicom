import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { trackingFlags } from "../../../supabase/functions/_shared/smartleadCampaignSync";

type Row = Record<string, any>;
const day = (t?: string | null) => (t ? new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
const time = (t?: string | null) => (t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const STALE_MS = 60 * 60 * 1000;
const OK = ["ok", "connected", "healthy", "active"];

/** A booking belongs to a campaign when its label names the Smartlead id, or both are the pilot. */
const bookingMatches = (label: string, id: string, name: string) =>
  label.includes(id) || (/pilot/i.test(label) && /pilot/i.test(name));

/** One-page Email outreach overview. Reads saved Liftor records only; nothing here sends or changes campaigns. */
export default function EmailOutreach() {
  const [d, setD] = useState<{ plans: Row[]; snaps: Row[]; bookings: Row[]; boxes: Row[]; replies: Row[]; names: Record<string, string> } | null>(null);

  const load = useCallback(async () => {
    const [plans, snaps, bookings, boxes, replies] = await Promise.all([
      supabase.from("campaign_recurrence_plans").select("*").eq("active", true),
      supabase.from("smartlead_campaign_snapshots").select("*"),
      supabase.from("portfolio_send_bookings").select("business_id, campaign_label, starts_at, ends_at, sequence_step, recipients_planned, status").order("starts_at"),
      supabase.from("gsm_mailboxes").select("email, smtp_status, imap_status, quarantined_reason, last_error").eq("estate_classification", "gsm").eq("active", true).eq("retired", false).limit(1000),
      supabase.from("smartlead_activity_events").select("id, business_id, provider_campaign_id, details, occurred_at, liftor_contact_id").ilike("event_type", "%repl%").order("occurred_at", { ascending: false }).limit(20),
    ]);
    const ids = [...new Set((plans.data ?? []).map((p) => p.business_id))];
    const { data: biz } = ids.length ? await supabase.from("businesses").select("id, name").in("id", ids) : { data: [] };
    setD({
      plans: plans.data ?? [], snaps: snaps.data ?? [], bookings: bookings.data ?? [], boxes: boxes.data ?? [], replies: replies.data ?? [],
      names: Object.fromEntries((biz ?? []).map((b) => [b.id, b.name])),
    });
  }, []);
  const live = useLiveRefresh(load);

  const now = Date.now();
  const campaigns = (d?.plans ?? []).map((p) => {
    const snap = d!.snaps.find((s) => s.provider_campaign_id === p.source_campaign_id && s.business_id === p.business_id);
    const books = d!.bookings.filter((b) => b.business_id === p.business_id && bookingMatches(b.campaign_label ?? "", p.source_campaign_id, p.campaign_name));
    const fresh = !!snap?.last_success_at && now - new Date(snap.last_success_at).getTime() < STALE_MS;
    const next = books.find((b) => new Date(b.ends_at).getTime() > now);
    return { p, snap, books, fresh, next, people: snap?.total_leads || books.reduce((n, b) => n + (b.sequence_step === 1 ? b.recipients_planned ?? 0 : 0), 0) };
  });
  const badBoxes = (d?.boxes ?? []).filter((m) => !OK.includes(String(m.smtp_status).toLowerCase()) || !OK.includes(String(m.imap_status).toLowerCase()) || m.quarantined_reason);
  const upcoming = [
    ...Object.values((d?.bookings ?? []).filter((b) => new Date(b.ends_at).getTime() > now).reduce<Record<string, { at: string; what: string; who: string; n: number | null }>>((acc, b) => {
      const k = `${b.business_id}|${b.campaign_label}|${b.sequence_step}`;
      const g = (acc[k] ??= { at: b.starts_at, what: `${b.campaign_label} — email ${b.sequence_step}`, who: d!.names[b.business_id] ?? "—", n: 0 });
      if (b.starts_at < g.at) g.at = b.starts_at;
      g.n = (g.n ?? 0) + (b.recipients_planned ?? 0);
      return acc;
    }, {})),
    ...(d?.plans ?? []).filter((p) => p.next_round_at).map((p) => ({ at: p.next_round_at, what: `${p.campaign_name} — next quarterly round (starts only if checks pass)`, who: d!.names[p.business_id] ?? "—", n: null })),
  ].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 8);

  const problems: string[] = [];
  campaigns.forEach(({ p, snap, fresh }) => {
    if (!fresh) problems.push(`${p.campaign_name}: figures not updating from Smartlead${snap?.last_success_at ? ` (last update ${time(snap.last_success_at)})` : ""}.`);
    const tf = trackingFlags(snap?.track_settings);
    if (tf.opensTracked || tf.clicksTracked) problems.push(`${p.campaign_name}: open/click tracking is on — check the privacy notice mentions it.`);
  });
  if (badBoxes.length) problems.push(`${badBoxes.length} mailbox${badBoxes.length === 1 ? "" : "es"} with a connection problem.`);

  return (
    <FounderLayout>
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Email outreach</h1>
            <p className="text-sm text-muted-foreground">What's running, who replied, what's next.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-live="polite">{live.at ? `Figures as of ${live.at.toLocaleTimeString("en-GB")}` : "Loading…"}</span>
            <Button size="sm" variant="outline" onClick={live.refresh} disabled={live.busy}>
              <RefreshCw className={`mr-1 h-3 w-3 ${live.busy ? "animate-spin" : ""}`} />Update
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>1. Campaigns running</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/founder/outreach-command-centre">Details</Link></Button></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead><TableHead>Campaign</TableHead><TableHead>Status</TableHead><TableHead>People</TableHead>
                <TableHead>Sending dates</TableHead><TableHead>Next email due</TableHead><TableHead>Sent</TableHead><TableHead>Replies</TableHead><TableHead>Bounces</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {!d ? <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>
                  : campaigns.length === 0 ? <TableRow><TableCell colSpan={9} className="text-muted-foreground">No campaigns.</TableCell></TableRow>
                  : campaigns.map(({ p, snap, books, fresh, next, people }) => (
                    <TableRow key={p.id}>
                      <TableCell>{d.names[p.business_id] ?? "—"}</TableCell>
                      <TableCell><Link className="text-primary hover:underline" to={`/founder/outreach-command-centre?campaign=${p.source_campaign_id}`}>{p.campaign_name}</Link></TableCell>
                      <TableCell><Badge variant="outline">{snap?.campaign_status ?? "Not updated"}</Badge></TableCell>
                      <TableCell>{people ? people.toLocaleString("en-GB") : "—"}</TableCell>
                      <TableCell>{books.length ? `${day(books[0].starts_at)} – ${day(books[books.length - 1].ends_at)}` : "—"}</TableCell>
                      <TableCell>{next ? `Email ${next.sequence_step}, ${day(next.starts_at)}` : "—"}</TableCell>
                      {fresh ? <>
                        <TableCell>{snap.sent_count ?? 0}</TableCell><TableCell>{snap.reply_count ?? 0}</TableCell><TableCell>{snap.bounce_count ?? 0}</TableCell>
                      </> : <TableCell colSpan={3} className="text-muted-foreground">Not yet updated — see Smartlead</TableCell>}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>2. New replies</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/founder/conversations">Details</Link></Button></CardHeader>
          <CardContent>
            {!d ? "Loading…" : d.replies.length === 0
              ? <p className="text-sm text-muted-foreground">No replies recorded in Liftor yet. Education campaign replies currently show only in Smartlead's Master Inbox.</p>
              : <ul className="divide-y divide-border text-sm">{d.replies.map((r) => {
                  const camp = d.plans.find((p) => p.source_campaign_id === r.provider_campaign_id);
                  return <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{r.details?.lead_email ?? r.details?.email ?? "Someone"} · {d.names[r.business_id] ?? "—"} · {camp?.campaign_name ?? r.provider_campaign_id}</span>
                    <span className="flex items-center gap-3 text-muted-foreground">{time(r.occurred_at)}
                      <Link className="text-primary hover:underline" to={`/founder/outreach-command-centre?campaign=${r.provider_campaign_id}`}>Open</Link></span>
                  </li>;
                })}</ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>3. Coming up</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/founder/portfolio-calendar">Details</Link></Button></CardHeader>
          <CardContent>
            {!d ? "Loading…" : upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nothing booked.</p>
              : <ul className="divide-y divide-border text-sm">{upcoming.map((u, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{day(u.at)}</b> · {u.who} · {u.what}</span>
                    {u.n ? <span className="text-muted-foreground">{u.n.toLocaleString("en-GB")} people</span> : null}</li>
                ))}</ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>4. Mailboxes</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/founder/gsm-outbound">Details</Link></Button></CardHeader>
          <CardContent className="text-sm">
            {!d ? "Loading…" : <>
              <p>{d.boxes.length} mailboxes · {d.boxes.length - badBoxes.length} connected · {badBoxes.length} problems</p>
              {badBoxes.length > 0 && <ul className="mt-2 list-disc pl-5 text-muted-foreground">{badBoxes.slice(0, 20).map((m) => <li key={m.email}>{m.email} — {m.quarantined_reason ?? m.last_error ?? `SMTP ${m.smtp_status}, IMAP ${m.imap_status}`}</li>)}</ul>}
            </>}
          </CardContent>
        </Card>

        {d && problems.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />5. Needs you</CardTitle></CardHeader>
            <CardContent><ul className="list-disc space-y-1 pl-5 text-sm">{problems.map((p) => <li key={p}>{p}</li>)}</ul></CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
}
