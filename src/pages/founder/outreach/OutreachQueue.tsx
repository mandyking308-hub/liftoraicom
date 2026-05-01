import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Play, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import SimulatedSendingBanner from "@/components/outreach/SimulatedSendingBanner";
import ApolloRunFilteredPanel from "@/components/founder/outreach/ApolloRunFilteredPanel";

type QueueItem = {
  id: string; contact_id: string; campaign_id: string; sequence_step: number;
  scheduled_at: string; status: "pending" | "sent" | "failed" | "blocked";
  inbox_id: string | null; business_name: string; block_reason: string; sent_at: string | null;
};

type ContactLite = { id: string; name: string | null; email: string | null };

type InboxCapacity = {
  id: string;
  email_address: string;
  provider_type: string;
  live_readiness: string;
  daily_send_limit: number;
  current_send_count: number;
  warmup_started_at: string | null;
  sent_today_utc: number;     // calculated from email_queue.sent_at (today UTC)
  sent_last_24h: number;      // calculated from email_queue.sent_at (rolling)
  warmup_max: number;         // ramp limit derived from age_days
  effective_cap: number;      // max(warmup_max, daily_send_limit) — matches enforce_inbox_ramp
  remaining: number;          // effective_cap - max(current_send_count, sent_today_utc)
  guard_uses: "current_send_count";
};

const STATUSES = ["ALL", "pending", "sent", "blocked", "failed"] as const;

const variant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "sent") return "default";
  if (s === "blocked" || s === "failed") return "destructive";
  if (s === "pending") return "outline";
  return "secondary";
};

const OutreachQueue = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<typeof STATUSES[number]>("pending");
  const [contacts, setContacts] = useState<Record<string, ContactLite>>({});
  const [running, setRunning] = useState(false);
  const [inboxCaps, setInboxCaps] = useState<InboxCapacity[]>([]);
  const [lastResult, setLastResult] = useState<null | {
    invoked: boolean;
    processed: number; sent: number; blocked: number; delayed: number; deferred?: number; failed?: number;
    chained?: boolean;
    dailyRemaining: number | null;
    blockReasons: { reason: string; count: number }[];
    nextSendAt: string | null;
    note: string;
  }>(null);

  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadInboxCaps(); }, []);

  async function load() {
    let q = supabase.from("email_queue").select("*").order("scheduled_at", { ascending: true }).limit(200);
    if (filter !== "ALL") q = q.eq("status", filter);
    const { data } = await q;
    const rows = (data as QueueItem[]) ?? [];
    setItems(rows);
    const ids = Array.from(new Set(rows.map((r) => r.contact_id).filter(Boolean)));
    if (ids.length > 0) {
      const { data: cs } = await supabase.from("contacts").select("id,name,email").in("id", ids);
      const map: Record<string, ContactLite> = {};
      (cs ?? []).forEach((c) => { map[(c as ContactLite).id] = c as ContactLite; });
      setContacts(map);
    } else {
      setContacts({});
    }
  }
  useEffect(() => { void load(); }, [filter]);

  async function loadInboxCaps() {
    const { data: inboxes } = await supabase
      .from("inboxes")
      .select("id,email_address,provider_type,live_readiness,daily_send_limit,current_send_count,warmup_started_at")
      .eq("active", true);
    if (!inboxes) return;
    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const caps: InboxCapacity[] = await Promise.all(
      inboxes.map(async (ix: any) => {
        const [{ count: todayCount }, { count: rolling24h }] = await Promise.all([
          supabase.from("email_queue").select("id", { count: "exact", head: true })
            .eq("inbox_id", ix.id).eq("status", "sent")
            .gte("sent_at", todayStartUtc.toISOString()),
          supabase.from("email_queue").select("id", { count: "exact", head: true })
            .eq("inbox_id", ix.id).eq("status", "sent")
            .gte("sent_at", last24h.toISOString()),
        ]);
        const ageDays = ix.warmup_started_at
          ? Math.max(0, Math.floor((Date.now() - new Date(ix.warmup_started_at).getTime()) / 86400000))
          : 0;
        const warmupMax = ageDays < 3 ? 20 : ageDays < 7 ? 40 : 80;
        const effectiveCap = Math.max(warmupMax, ix.daily_send_limit ?? 0);
        const usedForGuard = Math.max(ix.current_send_count ?? 0, todayCount ?? 0);
        return {
          ...ix,
          sent_today_utc: todayCount ?? 0,
          sent_last_24h: rolling24h ?? 0,
          warmup_max: warmupMax,
          effective_cap: effectiveCap,
          remaining: Math.max(0, effectiveCap - usedForGuard),
          guard_uses: "current_send_count" as const,
        };
      }),
    );
    setInboxCaps(caps);
  }

  async function runWorker() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("outreach-send-worker", { body: {} });
      if (error) throw error;

      // Pull diagnostics: due items, today's sends, top block reasons, next send time
      const nowIso = new Date().toISOString();
      const [{ count: dueCount }, { data: inboxRows }, { data: nextRow }, { data: recentBlocks }] = await Promise.all([
        supabase.from("email_queue").select("id", { count: "exact", head: true })
          .in("status", ["pending", "delayed", "throttled"]).lte("scheduled_at", nowIso),
        supabase.from("inboxes").select("daily_send_limit,current_send_count")
          .eq("live_readiness", "live_ready"),
        supabase.from("email_queue").select("scheduled_at")
          .in("status", ["pending", "delayed"]).order("scheduled_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("email_queue").select("block_reason")
          .in("status", ["blocked", "delayed"]).not("block_reason", "is", null).order("scheduled_at", { ascending: false }).limit(50),
      ]);

      let dailyRemaining: number | null = null;
      if (inboxRows && inboxRows.length > 0) {
        dailyRemaining = inboxRows.reduce((acc, r: { daily_send_limit: number; current_send_count: number }) =>
          acc + Math.max(0, (r.daily_send_limit ?? 0) - (r.current_send_count ?? 0)), 0);
      }

      const reasonMap: Record<string, number> = {};
      (recentBlocks ?? []).forEach((r: { block_reason: string }) => {
        if (!r.block_reason) return;
        reasonMap[r.block_reason] = (reasonMap[r.block_reason] ?? 0) + 1;
      });
      const blockReasons = Object.entries(reasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const nextSendAt = (nextRow as { scheduled_at: string } | null)?.scheduled_at ?? null;

      // Build a human note
      let note = "";
      const sent = data?.sent ?? 0;
      const processed = data?.processed ?? 0;
      if ((dueCount ?? 0) === 0) {
        note = nextSendAt
          ? `No due items yet. Next send scheduled for ${new Date(nextSendAt).toLocaleString()}.`
          : "No due items in the queue.";
      } else if (dailyRemaining === 0) {
        note = "Daily limit reached. Sends resume tomorrow at 08:00 UTC.";
      } else if (sent === 0 && processed === 0) {
        note = "Worker invoked but no items were processed in this run. Check block reasons below.";
      } else {
        note = `Worker invoked. Sent ${sent} of ${processed} processed.${data?.deferred ? ` ${data.deferred} deferred to next chain.` : ""}`;
      }

      setLastResult({
        invoked: true,
        processed,
        sent,
        blocked: data?.blocked ?? 0,
        delayed: data?.delayed ?? 0,
        deferred: data?.deferred ?? 0,
        failed: data?.failed ?? 0,
        chained: !!data?.chained,
        dailyRemaining,
        blockReasons,
        nextSendAt,
        note,
      });

      if (sent > 0) toast.success(`Sent ${sent} · processed ${processed}`);
      else toast(note);

      void load();
    } catch (err) {
      setLastResult({
        invoked: false, processed: 0, sent: 0, blocked: 0, delayed: 0,
        dailyRemaining: null, blockReasons: [], nextSendAt: null,
        note: `Worker invocation failed: ${(err as Error).message}`,
      });
      toast.error((err as Error).message);
    } finally { setRunning(false); }
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Queue</h1>
            <p className="text-sm text-muted-foreground">Send window: 08:00–17:00 UTC. Sanity layer blocks ineligible contacts.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof STATUSES[number])}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
            <Button size="sm" onClick={runWorker} disabled={running}><Play className="h-4 w-4 mr-2" />{running ? "Running…" : "Run worker now"}</Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/founder/outreach/live-monitor"><Activity className="h-4 w-4 mr-2" />View Live Monitor</Link>
            </Button>
          </div>
        </div>

        <SimulatedSendingBanner />

        <ApolloRunFilteredPanel
          requiredStage="ready_to_stage"
          heading="Ready to stage from Apollo run"
          subtitle="Qualified contacts from this Apollo sync run that are held for approval. Nothing is queued or sent until you stage them to a campaign."
        />

        {inboxCaps.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Inbox capacity (guard source of truth)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {inboxCaps.map((ix) => {
                  const drift = (ix.current_send_count ?? 0) !== ix.sent_today_utc;
                  return (
                    <div key={ix.id} className="p-4 grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
                      <div className="md:col-span-2">
                        <div className="font-medium">{ix.email_address}</div>
                        <div className="text-xs text-muted-foreground">
                          {ix.provider_type} · {ix.live_readiness}
                        </div>
                      </div>
                      <div><div className="text-xs text-muted-foreground">Sent today (UTC)</div><div className="font-medium">{ix.sent_today_utc}</div></div>
                      <div><div className="text-xs text-muted-foreground">Last 24h</div><div className="font-medium">{ix.sent_last_24h}</div></div>
                      <div>
                        <div className="text-xs text-muted-foreground">Stored counter</div>
                        <div className={`font-medium ${drift ? "text-destructive" : ""}`}>{ix.current_send_count}</div>
                      </div>
                      <div><div className="text-xs text-muted-foreground">Daily limit / ramp</div><div className="font-medium">{ix.daily_send_limit} / {ix.warmup_max}</div></div>
                      <div><div className="text-xs text-muted-foreground">Remaining</div><div className="font-medium text-primary">{ix.remaining}</div></div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 text-xs text-muted-foreground border-t">
                The ramp guard reads the stored counter. Drift highlighted in red means the trigger missed an update — the calculated "Sent today" is the source of truth.
              </div>
            </CardContent>
          </Card>
        )}

        {lastResult && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Last worker run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-foreground">{lastResult.note}</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div><div className="text-xs text-muted-foreground">Invoked</div><div className="font-medium">{lastResult.invoked ? "Yes" : "No"}</div></div>
                <div><div className="text-xs text-muted-foreground">Processed</div><div className="font-medium">{lastResult.processed}</div></div>
                <div><div className="text-xs text-muted-foreground">Sent</div><div className="font-medium text-primary">{lastResult.sent}</div></div>
                <div><div className="text-xs text-muted-foreground">Blocked</div><div className="font-medium">{lastResult.blocked}</div></div>
                <div><div className="text-xs text-muted-foreground">Delayed</div><div className="font-medium">{lastResult.delayed}</div></div>
                <div><div className="text-xs text-muted-foreground">Daily remaining</div><div className="font-medium">{lastResult.dailyRemaining ?? "—"}</div></div>
              </div>
              {lastResult.blockReasons.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Top block / delay reasons</div>
                  <div className="flex flex-wrap gap-2">
                    {lastResult.blockReasons.map((b) => (
                      <Badge key={b.reason} variant="secondary">{b.reason} · {b.count}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {lastResult.nextSendAt && (
                <p className="text-xs text-muted-foreground">Next scheduled send: {new Date(lastResult.nextSendAt).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Queue Items ({items.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nothing here yet.</p> :
                items.map((i) => {
                  const c = contacts[i.contact_id];
                  const name = c?.name || "—";
                  const email = c?.email || "—";
                  return (
                    <div key={i.id} className="p-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{name} <span className="text-muted-foreground font-normal">· {email}</span></p>
                        <p className="font-mono text-xs truncate text-muted-foreground">Step {i.sequence_step} · {i.business_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Scheduled {new Date(i.scheduled_at).toLocaleString()}
                          {i.sent_at && ` · Sent ${new Date(i.sent_at).toLocaleString()}`}
                        </p>
                        {i.block_reason && <p className="text-[11px] text-destructive mt-0.5">{i.block_reason}</p>}
                      </div>
                      <Badge variant={variant(i.status)}>{i.status}</Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default OutreachQueue;
