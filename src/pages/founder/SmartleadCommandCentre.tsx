import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { trackingFlags } from "../../../supabase/functions/_shared/smartleadCampaignSync";

type Mapping = { business_id: string; provider_campaign_id: string; provider_campaign_name: string | null };
type Snap = Record<string, any>;

const fmt = (v: unknown) => (v === null || v === undefined ? "—" : String(v));
const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString() : "—");
const STALE_MS = 30 * 60 * 1000;

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("smartlead-campaign-sync", { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      try { detail = (await error.context.json())?.error ?? detail; } catch { /* keep */ }
    }
    throw new Error(detail);
  }
  return data;
}

export default function SmartleadCommandCentre() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [mappings, setMappings] = useState<(Mapping & { business_name: string })[]>([]);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [leads, setLeads] = useState<Snap[]>([]);
  const [runs, setRuns] = useState<Snap[]>([]);
  const [events, setEvents] = useState<Snap[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [thread, setThread] = useState<Snap | null>(null);
  const [messages, setMessages] = useState<Snap[]>([]);
  const [drafts, setDrafts] = useState<Snap[]>([]);
  const [draftBody, setDraftBody] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wantOpens, setWantOpens] = useState(false);
  const [wantClicks, setWantClicks] = useState(false);
  const [disclosed, setDisclosed] = useState(false);
  const [trackConfirm, setTrackConfirm] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  const sel = useMemo(() => {
    const b = params.get("business"), c = params.get("campaign");
    return mappings.find((m) => m.business_id === b && m.provider_campaign_id === c) ?? mappings[0] ?? null;
  }, [params, mappings]);

  useEffect(() => {
    (async () => {
      const { data: maps } = await supabase.from("outbound_provider_campaign_mappings")
        .select("business_id, provider_campaign_id, provider_campaign_name").eq("provider_type", "smartlead").eq("mapping_status", "mapped");
      const ids = [...new Set((maps ?? []).map((m) => m.business_id))];
      const { data: biz } = ids.length
        ? await supabase.from("businesses").select("id, name, portfolio_status").in("id", ids).eq("portfolio_status", "active")
        : { data: [] as any[] };
      const names = new Map((biz ?? []).map((b: any) => [b.id, b.name]));
      setMappings((maps ?? []).filter((m) => names.has(m.business_id)).map((m) => ({ ...(m as Mapping), business_name: names.get(m.business_id)! })));
    })();
  }, []);

  const load = useCallback(async () => {
    if (!sel) return;
    const f = (t: string) => supabase.from(t as any).select("*").eq("business_id", sel.business_id).eq("provider_campaign_id", sel.provider_campaign_id);
    const [s, l, r, ev] = await Promise.all([
      f("smartlead_campaign_snapshots").maybeSingle(),
      f("smartlead_lead_snapshots").order("last_name"),
      f("smartlead_sync_runs").order("started_at", { ascending: false }).limit(8),
      f("smartlead_activity_events").order("created_at", { ascending: false }).limit(50),
    ]);
    setEvents((ev.data as Snap[]) ?? []);
    setSnap((s.data as Snap) ?? null); setLeads((l.data as Snap[]) ?? []); setRuns((r.data as Snap[]) ?? []);
  }, [sel]);
  useEffect(() => { load(); }, [load]);

  const syncNow = async () => {
    if (!sel) return;
    setSyncing(true);
    try {
      const r = await invoke({ action: "sync", business_id: sel.business_id, campaign_id: sel.provider_campaign_id });
      toast({ title: "Synced from Smartlead", description: `${r.leads} contacts, ${r.messages} messages (${r.new_messages} new).` });
    } catch (e) {
      toast({ title: "Sync failed", description: (e as Error).message, variant: "destructive" });
    } finally { setSyncing(false); load(); }
  };

  useEffect(() => {
    const f = trackingFlags(snap?.track_settings);
    setWantOpens(f.opensTracked === true); setWantClicks(f.clicksTracked === true);
  }, [snap?.track_settings]);

  const saveTracking = async () => {
    if (!sel) return;
    setSavingTrack(true);
    try {
      await invoke({ action: "set_tracking", business_id: sel.business_id, campaign_id: sel.provider_campaign_id, opens: wantOpens, clicks: wantClicks, confirmation: trackConfirm });
      toast({ title: "Tracking updated for this campaign only" });
      setTrackConfirm("");
      await syncNow();
    } catch (e) { toast({ title: "Tracking not changed", description: (e as Error).message, variant: "destructive" }); }
    finally { setSavingTrack(false); }
  };

  const openThread = async (lead: Snap) => {
    setThread(lead); setDraftBody(""); setConfirm("");
    const [m, d] = await Promise.all([
      supabase.from("smartlead_thread_messages").select("*").eq("business_id", lead.business_id).eq("provider_campaign_id", lead.provider_campaign_id).eq("provider_lead_id", lead.provider_lead_id).order("sent_at"),
      supabase.from("smartlead_reply_drafts").select("*").eq("business_id", lead.business_id).eq("provider_campaign_id", lead.provider_campaign_id).eq("provider_lead_id", lead.provider_lead_id).order("created_at", { ascending: false }),
    ]);
    setMessages(m.data ?? []); setDrafts(d.data ?? []);
  };

  const saveDraft = async () => {
    if (!thread || !draftBody.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("smartlead_reply_drafts").insert({
      business_id: thread.business_id, provider_campaign_id: thread.provider_campaign_id, provider_lead_id: thread.provider_lead_id,
      body: draftBody.trim(), created_by: u.user?.id ?? null,
    });
    if (error) return toast({ title: "Draft not saved", description: error.message, variant: "destructive" });
    toast({ title: "Draft saved", description: "Nothing has been sent." });
    openThread(thread);
  };

  const sendDraft = async (draftId: string) => {
    if (!thread) return;
    try {
      await invoke({ action: "send_reply", business_id: thread.business_id, campaign_id: thread.provider_campaign_id, draft_id: draftId, confirmation: confirm });
      toast({ title: "Reply sent via Smartlead" });
      openThread(thread);
    } catch (e) { toast({ title: "Reply not sent", description: (e as Error).message, variant: "destructive" }); }
  };

  const lastOk = snap?.last_success_at as string | undefined;
  const stale = !lastOk || Date.now() - new Date(lastOk).getTime() > STALE_MS;
  const tf = trackingFlags(snap?.track_settings);
  const opensOff = tf.opensTracked === false, clicksOff = tf.clicksTracked === false;
  const hasReplies = messages.some((m) => m.direction === "REPLY");

  const metrics: [string, unknown, string?][] = snap ? [
    ["Status", snap.campaign_status], ["Contacts", snap.total_leads], ["Not started", snap.not_started],
    ["In progress", snap.in_progress], ["Sent", snap.sent_count],
    ["Opens (approx.)", opensOff ? "tracking off" : snap.unique_open_count, "Tracked opens are approximate; Apple Mail privacy can inflate them."],
    ["Clicks", clicksOff ? "tracking off" : snap.unique_click_count], ["Replies", snap.reply_count],
    ["Interested (Smartlead)", snap.interested], ["Bounced", snap.bounce_count], ["Unsubscribed", snap.unsubscribed_count],
    ["Daily cap", snap.max_leads_per_day],
  ] : [];

  return (
    <FounderLayout>
      <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Outreach Command Centre</h1>
            <p className="text-sm text-muted-foreground">Live Smartlead figures, synced into Liftor. Background sync is not enabled yet — use Sync now.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              value={sel ? `${sel.business_id}|${sel.provider_campaign_id}` : ""}
              onChange={(e) => { const [b, c] = e.target.value.split("|"); setParams({ business: b, campaign: c }); }}>
              {mappings.map((m) => (
                <option key={m.business_id + m.provider_campaign_id} value={`${m.business_id}|${m.provider_campaign_id}`}>
                  {m.business_name} — #{m.provider_campaign_id}
                </option>
              ))}
            </select>
            <Button onClick={syncNow} disabled={!sel || syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />Sync now</Button>
          </div>
        </div>

        {!sel && <Card><CardContent className="p-6 text-sm text-muted-foreground">No Smartlead campaign is mapped to an active business yet.</CardContent></Card>}

        {sel && (
          <>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>Last successful fetch: <span className="text-foreground">{fmtTime(lastOk)}</span></span>
              {stale && <Badge variant="outline" className="border-destructive/50 text-destructive"><AlertTriangle className="mr-1 h-3 w-3" />Data may be stale — press Sync now</Badge>}
              {snap?.last_error && <Badge variant="destructive">Last error: {snap.last_error}</Badge>}
              <Link className="text-primary underline" to="/founder/business-setup-tunnel">Open business</Link>
            </div>

            {snap && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {metrics.map(([label, v, hint]) => (
                  <div key={label} title={hint} className="tech-card rounded-xl border border-border p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold text-foreground">{fmt(v)}</div>
                  </div>
                ))}
              </div>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Senders</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(snap?.senders ?? []).map((s: Snap) => (
                  <Badge key={s.id} variant="outline">{s.from_email} · {s.smtp_ok && s.imap_ok ? "connected" : "connection issue"} · {fmt(s.daily_sent_count)}/{fmt(s.message_per_day)} today</Badge>
                ))}
                {!snap?.senders?.length && <span className="text-sm text-muted-foreground">Not synced yet.</span>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Prospects</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>School group</TableHead><TableHead>Email</TableHead>
                    <TableHead>Smartlead status</TableHead><TableHead>Sent</TableHead><TableHead>Opens / clicks</TableHead>
                    <TableHead>Last reply</TableHead><TableHead>Opt-out</TableHead><TableHead />
                  </TableRow></TableHeader>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.provider_lead_id}>
                        <TableCell className="text-foreground">{l.first_name} {l.last_name}</TableCell>
                        <TableCell>{fmt(l.company_name)}</TableCell>
                        <TableCell className="font-mono text-xs">{l.email}</TableCell>
                        <TableCell><Badge variant="outline">{fmt(l.lead_status)}</Badge></TableCell>
                        <TableCell>{l.sent_count} {l.last_sent_at ? `· ${fmtTime(l.last_sent_at)}` : ""}</TableCell>
                        <TableCell>{`${opensOff ? "off" : fmt(l.open_count)} / ${clicksOff ? "off" : fmt(l.click_count)}`}</TableCell>
                        <TableCell className="max-w-xs truncate" title={l.last_reply_preview ?? ""}>{l.last_reply_at ? `${fmtTime(l.last_reply_at)} — ${l.last_reply_preview ?? ""}` : "No reply"}</TableCell>
                        <TableCell>{l.is_unsubscribed ? <Badge variant="destructive">Unsubscribed</Badge> : "—"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => openThread(l)}><MessageSquare className="mr-1 h-3 w-3" />View thread</Button></TableCell>
                      </TableRow>
                    ))}
                    {!leads.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No synced contacts yet — press Sync now.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Open &amp; click tracking (this campaign only)</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Currently: opens <span className="text-foreground">{tf.opensTracked === null ? "unknown" : tf.opensTracked ? "tracked" : "off"}</span>,
                  clicks <span className="text-foreground">{tf.clicksTracked === null ? "unknown" : tf.clicksTracked ? "tracked" : "off"}</span>.
                  Tracked opens are approximate — privacy features (e.g. Apple Mail) can register opens nobody made, so an open is never proof someone read the email. Past emails cannot be back-filled.
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={wantOpens} onChange={(e) => setWantOpens(e.target.checked)} />Track opens</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={wantClicks} onChange={(e) => setWantClicks(e.target.checked)} />Track clicks</label>
                </div>
                <label className="flex items-start gap-2 text-muted-foreground"><input type="checkbox" className="mt-1" checked={disclosed} onChange={(e) => setDisclosed(e.target.checked)} />I confirm the privacy notice linked from these emails discloses open/click tracking.</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="h-9 w-80" placeholder="Type CHANGE TRACKING FOR THIS CAMPAIGN ONLY" value={trackConfirm} onChange={(e) => setTrackConfirm(e.target.value)} />
                  <Button size="sm" variant="outline" disabled={savingTrack || ((wantOpens || wantClicks) && !disclosed) || trackConfirm !== "CHANGE TRACKING FOR THIS CAMPAIGN ONLY"} onClick={saveTracking}>Save tracking</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Instant updates from Smartlead (webhook)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {Array.isArray(snap.webhooks) && snap.webhooks.length ? snap.webhooks.map((w: Snap) => (
                  <div key={w.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-foreground">{w.name}</span><Badge variant="outline">#{w.id}</Badge><Badge variant="secondary">Configured on Smartlead</Badge><Badge variant="destructive">Liftor receiver disabled until signing key is verified</Badge></div>
                    <div>Events: {(w.event_types ?? []).join(", ").toLowerCase().replace(/_/g, " ")}{w.categories?.length ? ` · categories: ${w.categories.join(", ")}` : ""}</div>
                    <div>Last changed on Smartlead: {fmtTime(w.updated_at)} · target {w.url_path}</div>
                  </div>
                )) : <p>No webhook found on Smartlead for this campaign (as of the last sync).</p>}
                <p>Until the receiver is enabled, Liftor mirrors everything by reading Smartlead directly (Sync now and the automatic sync). Unsigned updates are always rejected.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle className="text-base">Activity log (real Smartlead events)</CardTitle><Button size="sm" variant="outline" onClick={load}>Update activity</Button></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {events.map((e) => {
                  const who = leads.find((l) => l.provider_lead_id === e.provider_lead_id);
                  return (
                    <div key={e.id} className="flex flex-wrap gap-3 text-muted-foreground">
                      <span className="text-foreground">{fmtTime(e.occurred_at ?? e.created_at)}</span>
                      <Badge variant="outline">{String(e.event_type).replace(/_/g, " ")}</Badge>
                      <span>{who ? `${who.first_name ?? ""} ${who.last_name ?? ""}` : `lead ${e.provider_lead_id}`}</span>
                      {e.liftor_action && <span className="text-destructive">Liftor: {String(e.liftor_action).replace(/_/g, " ")}</span>}
                    </div>
                  );
                })}
                {!events.length && <p className="text-muted-foreground">No activity yet — nothing has been sent, opened, clicked, replied, bounced or unsubscribed.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent syncs</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {runs.map((r) => (
                  <div key={r.id} className="flex flex-wrap gap-3 text-muted-foreground">
                    <span className="text-foreground">{fmtTime(r.started_at)}</span>
                    <Badge variant={r.status === "succeeded" ? "outline" : "destructive"}>{r.status}</Badge>
                    <span>{r.trigger}</span><span>{fmt(r.leads_seen)} contacts</span><span>{fmt(r.messages_seen)} messages</span>
                    <span>{fmt(r.latency_ms)} ms</span>{r.error_code && <span className="text-destructive">{r.error_code}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={!!thread} onOpenChange={(o) => !o && setThread(null)}>
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle>{thread?.first_name} {thread?.last_name} — {thread?.company_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`rounded-lg border p-3 ${m.direction === "REPLY" ? "border-primary/50" : "border-border"}`}>
                  <div className="mb-1 text-xs text-muted-foreground">{m.direction === "REPLY" ? "Their reply" : "We sent"} · {fmtTime(m.sent_at)} · {m.subject}</div>
                  <div className="whitespace-pre-wrap text-sm text-foreground">{(m.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</div>
                </div>
              ))}
              {!messages.length && <p className="text-sm text-muted-foreground">No messages have been sent or received for this contact.</p>}

              <div className="space-y-2 border-t border-border pt-3">
                <div className="text-sm font-medium text-foreground">Reply drafts (never sent automatically)</div>
                {drafts.map((d) => (
                  <div key={d.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="whitespace-pre-wrap text-foreground">{d.body}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{d.status}</Badge>
                      {d.status === "draft" && hasReplies && (
                        <>
                          <Input className="h-8 w-56" placeholder="Type SEND THIS REPLY" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                          <Button size="sm" disabled={confirm !== "SEND THIS REPLY"} onClick={() => sendDraft(d.id)}>Send via Smartlead</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <Textarea placeholder="Write a reply draft…" value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
                <Button variant="outline" size="sm" onClick={saveDraft} disabled={!draftBody.trim()}>Save draft</Button>
                {!hasReplies && <p className="text-xs text-muted-foreground">Sending is available only once this contact has replied.</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}
