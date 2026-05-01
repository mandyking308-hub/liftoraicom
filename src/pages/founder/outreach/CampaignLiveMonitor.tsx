import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw, Play, Pause, AlertTriangle, Mail, Inbox as InboxIcon,
  Send, Bot, ExternalLink, CheckCircle2, XCircle, Activity,
} from "lucide-react";

const DEFAULT_BUSINESS = "Neon Candy";
const DEFAULT_CAMPAIGN_NAME = "Early Access Collaboration Test";

type Campaign = {
  id: string; campaign_name: string; business_name: string;
  status: "active" | "paused";
};
type InboxRow = {
  id: string; email_address: string; business_name: string;
  active: boolean; provider_type: string; live_readiness: string;
  inbound_status: string | null; inbound_polling_enabled: boolean | null;
  monitored_mailbox: string | null; daily_send_limit: number;
  current_send_count: number; emails_sent_today: number | null;
  last_sent_at: string | null; last_test_send_at: string | null;
  last_test_send_status: string | null; last_error_message: string | null;
  reply_to_email: string | null;
};
type QueueItem = {
  id: string; contact_id: string; campaign_id: string; sequence_step: number;
  scheduled_at: string; status: string; inbox_id: string | null;
  block_reason: string | null; sent_at: string | null; retry_count: number | null;
  smtp_accepted_at?: string | null;
  saved_to_sent_at?: string | null;
  provider_message_id?: string | null;
  provider_response?: string | null;
  send_error?: string | null;
  delivery_kind?: string | null;
};
type Inbound = {
  id: string; from_email: string; subject: string | null; received_at: string;
  contact_id: string | null; conversation_id: string | null; campaign_id: string | null;
  processing_status: string | null; is_bounce: boolean | null;
};
type Draft = {
  id: string; conversation_id: string | null; contact_id: string | null;
  classification: string | null; draft_body: string; status: string;
  triggered_by_inbound_id: string | null; created_at: string;
};
type ContactRow = { id: string; name: string | null; email: string | null };
type Activity = {
  id: string; event_type: string; description: string;
  entity_type: string | null; entity_id: string | null; created_at: string;
};

function fmtTime(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}
function relTime(ts: string | null | undefined) {
  if (!ts) return "—";
  const ms = Date.now() - new Date(ts).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const CampaignLiveMonitor = () => {
  const [params] = useSearchParams();
  const businessName = params.get("business") ?? DEFAULT_BUSINESS;
  const campaignNameParam = params.get("campaign") ?? DEFAULT_CAMPAIGN_NAME;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [inbox, setInbox] = useState<InboxRow | null>(null);
  const [allInboxes, setAllInboxes] = useState<InboxRow[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [contacts, setContacts] = useState<Record<string, ContactRow>>({});
  const [inbound, setInbound] = useState<Inbound[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [queueFilter, setQueueFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const startOfDayIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Campaign
      const { data: campaigns } = await supabase
        .from("outreach_campaigns").select("id,campaign_name,business_name,status")
        .eq("business_name", businessName)
        .eq("campaign_name", campaignNameParam)
        .limit(1);
      const camp = (campaigns?.[0] ?? null) as Campaign | null;
      setCampaign(camp);

      // Inboxes for business
      const { data: ix } = await supabase
        .from("inboxes").select(
          "id,email_address,business_name,active,provider_type,live_readiness," +
          "inbound_status,inbound_polling_enabled,monitored_mailbox,daily_send_limit," +
          "current_send_count,emails_sent_today,last_sent_at,last_test_send_at," +
          "last_test_send_status,last_error_message,reply_to_email")
        .eq("business_name", businessName);
      const inboxList = ((ix as unknown) as InboxRow[] | null) ?? [];
      setAllInboxes(inboxList);
      const liveReady = inboxList.find(
        (i) => i.active && i.provider_type === "ionos_smtp" && i.live_readiness === "live_ready",
      ) ?? inboxList[0] ?? null;
      setInbox(liveReady);

      if (camp) {
        // Queue for the campaign
        const { data: q } = await supabase
          .from("email_queue")
          .select("id,contact_id,campaign_id,sequence_step,scheduled_at,status,inbox_id,block_reason,sent_at,retry_count,smtp_accepted_at,saved_to_sent_at,provider_message_id,provider_response,send_error,delivery_kind")
          .eq("campaign_id", camp.id)
          .order("scheduled_at", { ascending: false }).limit(100);
        const qItems = (q as QueueItem[] | null) ?? [];
        setQueue(qItems);

        // Contacts referenced by queue + inbound + drafts
        const ids = new Set<string>();
        qItems.forEach((x) => x.contact_id && ids.add(x.contact_id));

        // Inbound for business (via inbox ids)
        const inboxIds = inboxList.map((i) => i.id);
        let inboundRows: Inbound[] = [];
        if (inboxIds.length) {
          const { data: inb } = await supabase
            .from("inbound_messages")
            .select("id,from_email,subject,received_at,contact_id,conversation_id,campaign_id,processing_status,is_bounce")
            .in("inbox_id", inboxIds)
            .order("received_at", { ascending: false }).limit(30);
          inboundRows = (inb as Inbound[] | null) ?? [];
          setInbound(inboundRows);
          inboundRows.forEach((r) => r.contact_id && ids.add(r.contact_id));
        } else {
          setInbound([]);
        }

        // Pending drafts via conversations of this business
        const { data: convs } = await supabase
          .from("conversations").select("id").eq("business_name", businessName).limit(500);
        const convIds = ((convs as { id: string }[] | null) ?? []).map((c) => c.id);
        let dr: Draft[] = [];
        if (convIds.length) {
          const { data: drow } = await supabase
            .from("ai_drafts")
            .select("id,conversation_id,contact_id,classification,draft_body,status,triggered_by_inbound_id,created_at")
            .in("conversation_id", convIds)
            .order("created_at", { ascending: false }).limit(30);
          dr = (drow as Draft[] | null) ?? [];
        }
        setDrafts(dr);
        dr.forEach((d) => d.contact_id && ids.add(d.contact_id));

        // Contacts
        if (ids.size) {
          const { data: c } = await supabase
            .from("contacts").select("id,name,email").in("id", Array.from(ids));
          const map: Record<string, ContactRow> = {};
          ((c as ContactRow[] | null) ?? []).forEach((row) => { map[row.id] = row; });
          setContacts(map);
        }

        // Activity log entries related to this campaign + business inboxes
        const entityIds = [camp.id, ...inboxIds];
        const { data: act } = await supabase
          .from("activity_log")
          .select("id,event_type,description,entity_type,entity_id,created_at")
          .in("entity_id", entityIds)
          .order("created_at", { ascending: false }).limit(40);
        setActivity((act as Activity[] | null) ?? []);
      }
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [businessName, campaignNameParam]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { void load(); }, 45_000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function pollNow() {
    if (!inbox) { toast.error("No inbox selected"); return; }
    setPolling(true);
    const t = toast.loading("Polling inbox… (may take up to 60s)");
    try {
      const { data, error } = await supabase.functions.invoke("outreach-inbound-poll", {
        body: { inbox_id: inbox.id },
      });
      toast.dismiss(t);
      if (error) { toast.error(error.message); return; }
      const r = (data as { results?: Array<Record<string, number | string>> } | null)?.results?.[0] ?? {};
      toast.success(
        `Scanned ${r.messages_scanned ?? 0} · Imported ${r.imported ?? 0} · Matched ${r.matched ?? 0} · ` +
        `Unmatched ${r.unmatched ?? 0} · Drafts +${r.ai_drafts_created ?? 0}`,
        { duration: 9000 },
      );
      await load();
    } catch (e) {
      toast.dismiss(t);
      toast.error((e as Error).message);
    } finally {
      setPolling(false);
    }
  }

  async function testImap() {
    if (!inbox) return;
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("outreach-test-imap", {
      body: { inbox_id: inbox.id },
    });
    setTesting(false);
    const p = (data ?? {}) as { ok?: boolean; messages?: number; unseen?: number; message?: string };
    if (error || !p.ok) toast.error(p.message ?? error?.message ?? "IMAP test failed");
    else toast.success(`IMAP connected — ${p.messages ?? 0} messages, ${p.unseen ?? 0} unseen`);
    void load();
  }

  async function setCampaignStatus(next: "active" | "paused") {
    if (!campaign) return;
    if (next === "active") {
      const { error } = await supabase.rpc("activate_outreach_campaign", { _campaign_id: campaign.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Campaign resumed");
    } else {
      const { error } = await supabase.from("outreach_campaigns").update({ status: "paused" }).eq("id", campaign.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Campaign paused");
    }
    void load();
  }

  // Derived stats
  const today = (ts: string | null | undefined) => !!ts && new Date(ts) >= new Date(startOfDayIso);
  const sentToday = queue.filter((q) => q.status === "sent" && today(q.sent_at));
  const queuedToday = queue.filter((q) => ["pending", "delayed", "throttled"].includes(q.status) && today(q.scheduled_at));
  // Historical cleanup / legacy blocked rows — exclude from live failure counts
  const LEGACY_BLOCK_REASONS = new Set([
    "SIMULATED_PARENT_NOT_SENT",
    "SIMULATED_LEGACY_QUARANTINED",
  ]);
  const isLegacyCleanup = (q: QueueItem) =>
    (q.status === "blocked" || q.status === "failed") &&
    !!q.block_reason &&
    LEGACY_BLOCK_REASONS.has(q.block_reason);
  const failedToday = queue.filter(
    (q) => (q.status === "failed" || q.status === "blocked") && today(q.scheduled_at) && !isLegacyCleanup(q),
  );
  const legacyCleanupRows = queue.filter(isLegacyCleanup);
  const repliesToday = inbound.filter((i) => today(i.received_at) && !i.is_bounce);
  const bouncesToday = inbound.filter((i) => today(i.received_at) && i.is_bounce);
  const pendingDrafts = drafts.filter((d) => d.status === "pending");
  const nextScheduled = queue
    .filter((q) => ["pending", "delayed", "throttled"].includes(q.status))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const dailyLimit = inbox?.daily_send_limit ?? 0;
  const usedToday = inbox?.emails_sent_today ?? inbox?.current_send_count ?? sentToday.length;
  const remaining = Math.max(0, dailyLimit - usedToday);

  const filteredQueue = queue.filter((q) => {
    if (queueFilter === "ALL") return true;
    if (queueFilter === "sent_real") return q.status === "sent" && q.delivery_kind === "smtp_real" && !!q.smtp_accepted_at;
    if (queueFilter === "sent_sim") return q.status === "sent" && (q.delivery_kind !== "smtp_real" || !q.smtp_accepted_at);
    return q.status === queueFilter;
  }).slice(0, 10);

  const issues = useMemo(() => {
    const out: Array<{ type: string; severity: "high" | "med"; ts: string; what: string; suggest: string }> = [];
    queue.filter((q) => (q.status === "failed" || q.status === "blocked") && !isLegacyCleanup(q)).slice(0, 10).forEach((q) => {
      out.push({
        type: q.status === "blocked" ? "Send blocked" : "Send failed",
        severity: "high",
        ts: q.sent_at ?? q.scheduled_at,
        what: `Step ${q.sequence_step} → ${contacts[q.contact_id]?.email ?? q.contact_id}`,
        suggest: q.block_reason ?? "Inspect queue item; retry will run automatically up to 3 times.",
      });
    });
    inbound.filter((i) => i.is_bounce).slice(0, 5).forEach((i) => {
      out.push({ type: "Bounce", severity: "high", ts: i.received_at,
        what: `${i.from_email} — ${i.subject ?? "(no subject)"}`,
        suggest: "Contact will be flagged DO_NOT_CONTACT automatically." });
    });
    inbound.filter((i) => i.processing_status === "unmatched").slice(0, 5).forEach((i) => {
      out.push({ type: "Unmatched reply", severity: "med", ts: i.received_at,
        what: `${i.from_email} — ${i.subject ?? "(no subject)"}`,
        suggest: "Open reply, link to a contact, or add the sender to the campaign." });
    });
    if (inbox && inbox.live_readiness !== "live_ready") {
      out.push({ type: "Inbox not Live Ready", severity: "high", ts: inbox.last_test_send_at ?? new Date().toISOString(),
        what: inbox.email_address, suggest: "Run a real outbound test send from the inbox configuration." });
    }
    if (campaign?.status === "paused") {
      out.push({ type: "Campaign paused", severity: "med", ts: new Date().toISOString(),
        what: campaign.campaign_name, suggest: "Resume from the controls below if intentional." });
    }
    if (dailyLimit > 0 && remaining === 0) {
      out.push({ type: "Daily limit reached", severity: "med", ts: new Date().toISOString(),
        what: `${usedToday}/${dailyLimit} sent today`, suggest: "Sends will resume after midnight UTC reset." });
    }
    return out;
  }, [queue, inbound, inbox, campaign, dailyLimit, remaining, usedToday, contacts]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{businessName} Campaign Live Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Real-time view of outreach, inbox health, replies and AI drafts.
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span><strong className="text-foreground">Campaign:</strong> {campaign?.campaign_name ?? campaignNameParam}</span>
              <span><strong className="text-foreground">Business:</strong> {businessName}</span>
              <span><strong className="text-foreground">Mode:</strong> <Badge variant="default">BUSINESS-LIVE</Badge></span>
              <span><strong className="text-foreground">Inbox:</strong> {inbox?.email_address ?? "—"}</span>
              <span><strong className="text-foreground">Outbound:</strong> {inbox?.provider_type === "ionos_smtp" ? "IONOS SMTP" : (inbox?.provider_type ?? "—")} — {inbox?.live_readiness ?? "—"}</span>
              <span><strong className="text-foreground">Inbound:</strong> IONOS IMAP {inbox?.inbound_polling_enabled ? "polling enabled" : "polling disabled"}</span>
              <span><strong className="text-foreground">AI mode:</strong> Founder approval required</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAutoRefresh((v) => !v)}>
                {autoRefresh ? "Auto-refresh: on" : "Auto-refresh: off"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Last refreshed: {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</p>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard label="Campaign status" value={campaign?.status ?? "—"} tone={campaign?.status === "active" ? "good" : "warn"} />
          <StatCard label="Inbox status" value={inbox?.live_readiness ?? "—"} tone={inbox?.live_readiness === "live_ready" ? "good" : "warn"} />
          <StatCard label="Daily limit" value={`${usedToday}/${dailyLimit}`} sub={`${remaining} remaining`} />
          <StatCard label="Sent today" value={String(sentToday.length)} />
          <StatCard label="Queued today" value={String(queuedToday.length)} />
          <StatCard label="Failed today" value={String(failedToday.length)} tone={failedToday.length ? "warn" : undefined} />
          <StatCard label="Replies today" value={String(repliesToday.length)} />
          <StatCard label="Bounces today" value={String(bouncesToday.length)} tone={bouncesToday.length ? "warn" : undefined} />
          <StatCard label="Pending AI drafts" value={String(pendingDrafts.length)} tone={pendingDrafts.length ? "warn" : undefined} />
          <StatCard label="Last outbound send" value={relTime(inbox?.last_sent_at)} sub={fmtTime(inbox?.last_sent_at)} />
          <StatCard label="Last IMAP test" value={relTime(inbox?.last_test_send_at)} sub={inbox?.last_test_send_status ?? "—"} />
          <StatCard label="Next scheduled send" value={nextScheduled ? relTime(nextScheduled.scheduled_at) : "—"} sub={nextScheduled ? fmtTime(nextScheduled.scheduled_at) : ""} />
        </div>

        {/* Live banner */}
        {campaign?.status === "active" && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <strong>Campaign is live.</strong> Emails are being sent through{" "}
            <code className="font-mono">{inbox?.email_address}</code> according to the daily limit
            ({usedToday}/{dailyLimit}). {remaining === 0 && (
              <span className="text-destructive font-medium">Daily send limit reached. Remaining sends will wait until the next send window.</span>
            )}
          </div>
        )}

        {/* NeonCandy inbox sanity */}
        {businessName.trim().toLowerCase() === "neon candy" && (
          (() => {
            const VALID = "hello@neoncandy.online";
            const INVALID = "music@neoncandy.net";
            const invalidQueue = queue.filter((q) => {
              const ix = allInboxes.find((i) => i.id === q.inbox_id);
              return ix && ix.email_address.toLowerCase() === INVALID;
            });
            const validInbox = allInboxes.find((i) => i.email_address.toLowerCase() === VALID);
            const invalidInbox = allInboxes.find((i) => i.email_address.toLowerCase() === INVALID);
            const ok = invalidQueue.length === 0 && (!invalidInbox || !invalidInbox.active);
            return (
              <Card className={ok ? "" : "border-destructive/40"}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    Neon Candy inbox sanity
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded border p-2">
                      <p className="text-xs text-muted-foreground">Valid sender</p>
                      <p className="font-mono">{VALID}</p>
                      <p className="text-xs">{validInbox ? `${validInbox.live_readiness} · ${validInbox.active ? "active" : "inactive"}` : "missing"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-xs text-muted-foreground">Disabled sender</p>
                      <p className="font-mono">{INVALID}</p>
                      <p className="text-xs">
                        {invalidInbox
                          ? `${invalidInbox.live_readiness} · ${invalidInbox.active ? "ACTIVE — must be disabled" : "disabled ✓"}`
                          : "not present ✓"}
                      </p>
                    </div>
                  </div>
                  {invalidQueue.length > 0 ? (
                    <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                      <strong>{invalidQueue.length}</strong> queue row(s) still attached to {INVALID}. These will be hard-blocked by the worker (NEONCANDY_INVALID_INBOX) until reassigned.
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No queue rows still attached to the disabled inbox.</p>
                  )}
                </CardContent>
              </Card>
            );
          })()
        )}

        {/* Verify sent mail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />Verify sent mail (today)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const sentTodayRows = sentToday;
              const smtpAccepted = sentTodayRows.filter((q) => !!q.smtp_accepted_at && q.delivery_kind === "smtp_real");
              const savedToSent = sentTodayRows.filter((q) => !!q.saved_to_sent_at);
              const simulated = sentTodayRows.filter((q) => q.delivery_kind === "simulated" || (!q.smtp_accepted_at && !q.delivery_kind));
              const failedRows = queue.filter((q) => today(q.scheduled_at) && (q.status === "failed" || q.status === "blocked") && q.send_error);
              const last5 = smtpAccepted.slice(0, 5);
              const lastResp = sentTodayRows.find((q) => q.provider_response)?.provider_response ?? "—";
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Queue marked sent" value={String(sentTodayRows.length)} />
                    <StatCard label="SMTP accepted" value={String(smtpAccepted.length)} tone={smtpAccepted.length ? "good" : "warn"} />
                    <StatCard label="Saved to Sent folder" value={String(savedToSent.length)} tone={savedToSent.length ? "good" : "warn"} />
                    <StatCard label="Simulated only" value={String(simulated.length)} tone={simulated.length ? "warn" : undefined} />
                  </div>
                  {simulated.length > 0 && (
                    <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                      <strong>{simulated.length}</strong> row(s) marked sent without SMTP confirmation. These were not transmitted to recipients.
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Last 5 SMTP-accepted recipients</p>
                    {last5.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No SMTP-confirmed sends today.</p>
                    ) : (
                      <ul className="text-xs space-y-1 font-mono">
                        {last5.map((q) => (
                          <li key={q.id} className="flex flex-wrap gap-x-3">
                            <span>{contacts[q.contact_id]?.email ?? q.contact_id}</span>
                            <span className="text-muted-foreground">{fmtTime(q.smtp_accepted_at)}</span>
                            <span className="text-muted-foreground truncate max-w-[18rem]" title={q.provider_message_id ?? ""}>
                              {q.provider_message_id ?? "(no message-id)"}
                            </span>
                            {q.saved_to_sent_at ? (
                              <Badge variant="outline" className="text-[10px]">in Sent folder</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">not in Sent folder</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Last SMTP response: </span>
                    <span className="font-mono">{lastResp}</span>
                  </div>
                  {failedRows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Recent send errors</p>
                      <ul className="text-xs space-y-1">
                        {failedRows.slice(0, 3).map((q) => (
                          <li key={q.id} className="font-mono text-destructive truncate" title={q.send_error ?? ""}>
                            {contacts[q.contact_id]?.email ?? q.contact_id}: {q.send_error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Controls grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><InboxIcon className="h-4 w-4" />Inbound poll controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={testImap} disabled={!inbox || testing}>
                  {testing ? "Testing…" : "Test IMAP connection"}
                </Button>
                <Button size="sm" onClick={pollNow} disabled={!inbox || polling}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${polling ? "animate-spin" : ""}`} />
                  {polling ? "Polling…" : "Poll now"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Last test: {fmtTime(inbox?.last_test_send_at)} ({inbox?.last_test_send_status ?? "—"})
              </p>
              {inbox?.last_error_message && (
                <p className="text-xs text-destructive">Last error: {inbox.last_error_message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Campaign controls</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {campaign?.status === "active" ? (
                <Button size="sm" variant="outline" onClick={() => setCampaignStatus("paused")}>
                  <Pause className="h-3 w-3 mr-1" />Pause campaign
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCampaignStatus("active")}>
                  <Play className="h-3 w-3 mr-1" />Resume campaign
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to="/founder/outreach/campaigns">View sequence</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/founder/outreach/queue">View queue</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/founder/contacts">View contacts</Link>
              </Button>
              {inbox && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/founder/crm/inboxes/${inbox.id}`}>Inbox configuration</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" />Queue (next 10)</CardTitle>
            <Select value={queueFilter} onValueChange={setQueueFilter}>
              <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "pending", "sent_real", "sent_sim", "blocked", "delayed", "failed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {filteredQueue.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Contact</th>
                    <th className="text-left p-2">Step</th>
                    <th className="text-left p-2">Scheduled</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="p-2">
                        <div className="font-medium">{contacts[q.contact_id]?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{contacts[q.contact_id]?.email ?? q.contact_id}</div>
                      </td>
                      <td className="p-2">{q.sequence_step}</td>
                      <td className="p-2 text-xs">{fmtTime(q.scheduled_at)}</td>
                     <td className="p-2">
                       {q.status === "sent" ? (
                         q.delivery_kind === "smtp_real" && q.smtp_accepted_at ? (
                           <Badge variant="default">sent (real)</Badge>
                         ) : (
                           <Badge variant="destructive">sent (sim)</Badge>
                         )
                       ) : (q.status === "failed" || q.status === "blocked") ? (
                         <Badge variant="destructive">{q.status}</Badge>
                       ) : (
                         <Badge variant="outline">{q.status}</Badge>
                       )}
                     </td>
                      <td className="p-2 text-xs text-muted-foreground">{q.block_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Sent today */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Sent today (real SMTP only)</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {sentToday.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No real sends today.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Recipient</th>
                    <th className="text-left p-2">Step</th>
                    <th className="text-left p-2">Sent at</th>
                    <th className="text-left p-2">Inbox</th>
                  </tr>
                </thead>
                <tbody>
                  {sentToday.slice(0, 25).map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="p-2">
                        <div className="font-medium">{contacts[q.contact_id]?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{contacts[q.contact_id]?.email ?? q.contact_id}</div>
                      </td>
                      <td className="p-2">{q.sequence_step}</td>
                      <td className="p-2 text-xs">{fmtTime(q.sent_at)}</td>
                      <td className="p-2 text-xs">{inbox?.email_address ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-4 pb-3 text-[11px] text-muted-foreground">
              Note: only items with real SMTP success appear here. Simulated activity is tracked separately in activity logs.
            </p>
          </CardContent>
        </Card>

        {/* Replies */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Inbound replies</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {inbound.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No inbound messages yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">From</th>
                    <th className="text-left p-2">Subject</th>
                    <th className="text-left p-2">Received</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {inbound.map((i) => {
                    const isBounce = !!i.is_bounce;
                    const matched = i.processing_status === "routed" || !!i.contact_id;
                    const status = isBounce ? "bounce" : matched ? "matched" : (i.processing_status ?? "unmatched");
                    return (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="p-2 text-xs">
                          <div>{contacts[i.contact_id ?? ""]?.name ?? "—"}</div>
                          <div className="text-muted-foreground">{i.from_email}</div>
                        </td>
                        <td className="p-2 text-xs">{i.subject ?? "—"}</td>
                        <td className="p-2 text-xs">{relTime(i.received_at)}</td>
                        <td className="p-2">
                          <Badge variant={isBounce ? "destructive" : matched ? "default" : "outline"}>{status}</Badge>
                        </td>
                        <td className="p-2 text-right">
                          {i.conversation_id ? (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/founder/conversations/${i.conversation_id}`}>
                                Open <ExternalLink className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          ) : !matched ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/founder/conversations`}>Review unmatched</Link>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pending AI drafts */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" />Pending AI drafts (founder approval required)</CardTitle></CardHeader>
          <CardContent className="p-0">
            {pendingDrafts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No drafts awaiting approval.</p>
            ) : (
              <div className="divide-y">
                {pendingDrafts.map((d) => (
                  <div key={d.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm">
                        <strong>{contacts[d.contact_id ?? ""]?.name ?? contacts[d.contact_id ?? ""]?.email ?? "Contact"}</strong>
                        {d.classification && <Badge variant="outline" className="ml-2">{d.classification}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{relTime(d.created_at)}</div>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded border max-h-32 overflow-auto">{d.draft_body.slice(0, 600)}{d.draft_body.length > 600 ? "…" : ""}</pre>
                    <div className="flex gap-2 flex-wrap">
                      {d.conversation_id && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/founder/conversations/${d.conversation_id}`}>Open conversation</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="px-4 pb-3 text-[11px] text-muted-foreground">
              Approve, edit or reject drafts inside the conversation. Nothing auto-sends.
            </p>
          </CardContent>
        </Card>

        {/* Issues */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Attention needed</CardTitle></CardHeader>
          <CardContent className="p-0">
            {issues.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />All clear — no issues detected.</p>
            ) : (
              <div className="divide-y">
                {issues.map((i, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3">
                    <XCircle className={`h-4 w-4 mt-0.5 ${i.severity === "high" ? "text-destructive" : "text-amber-500"}`} />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <strong>{i.type}</strong>
                        <span className="text-xs text-muted-foreground">{relTime(i.ts)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{i.what}</div>
                      <div className="text-xs mt-1">Suggested action: {i.suggest}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="divide-y">
                {activity.slice(0, 15).map((a) => (
                  <div key={a.id} className="p-2 text-xs flex justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="mr-2">{a.event_type}</Badge>
                      {a.description}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">{relTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

const StatCard = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) => (
  <Card>
    <CardContent className="p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone === "good" ? "text-primary" : tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

export default CampaignLiveMonitor;