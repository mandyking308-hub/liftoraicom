import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

const BUSINESS = "Neon Candy";
const CAMPAIGN_NAME = "Early Access Collaboration Test";
const SENDER = "hello@neoncandy.online";
const FORBIDDEN_SENDER = "music@neoncandy.net";
const TARGET_POOL = 100;
const BATCH_SIZE = 25;

type Stat = { label: string; value: number | string; tone?: "ok" | "warn" | "bad" | "info" };

function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-md border p-3 text-sm ${
            s.tone === "bad"
              ? "border-destructive/40 bg-destructive/5"
              : s.tone === "warn"
              ? "border-amber-500/40 bg-amber-500/5"
              : s.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : ""
          }`}
        >
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="mt-1 text-xl font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

type BatchRow = {
  id: string;
  started_at: string;
  status: string;
  people_found: number;
  people_with_email_flag: number;
  contacts_new: number;
  contacts_updated: number;
  qualified_count: number;
  ready_to_stage_count: number;
  apollo_credits_used: number | null;
};

export function WeekendPool({ onOpenRuns }: { onOpenRuns?: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [pool, setPool] = useState<Stat[]>([]);
  const [coverage, setCoverage] = useState<{ daysCoverage: string; covered: boolean; detail: string } | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [cumulative, setCumulative] = useState({
    runs: 0,
    credits: 0,
    qualified: 0,
    new: 0,
    updated: 0,
    found: 0,
    emails: 0,
  });
  const [poolReady, setPoolReady] = useState(0);
  const [poolStaged, setPoolStaged] = useState(0);
  const [senderOk, setSenderOk] = useState(false);
  const [forbiddenOk, setForbiddenOk] = useState(false);
  const [queueBlock, setQueueBlock] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const todayIso = new Date(); todayIso.setUTCHours(0, 0, 0, 0);
    const todayStart = todayIso.toISOString();
    const todayDate = new Date().toISOString().slice(0, 10);

    const [{ data: segment }, { data: campaign }, { data: inbox }, { data: forbidden }] = await Promise.all([
      supabase.from("apollo_sync_segments").select("id,segment_name,max_contacts_per_run").eq("business_name", BUSINESS).maybeSingle(),
      supabase.from("outreach_campaigns").select("id,status").eq("business_name", BUSINESS).eq("campaign_name", CAMPAIGN_NAME).maybeSingle(),
      supabase.from("inboxes").select("id,active,daily_send_limit,emails_sent_today,paused_reason,live_readiness").eq("business_name", BUSINESS).eq("email_address", SENDER).maybeSingle(),
      supabase.from("inboxes").select("id,active").eq("business_name", BUSINESS).eq("email_address", FORBIDDEN_SENDER).maybeSingle(),
    ]);

    const segId = (segment as any)?.id ?? null;
    setSegmentId(segId);
    const campaignId = (campaign as any)?.id ?? null;
    const inb = inbox as any;
    setSenderOk(!!inb?.active && inb?.live_readiness === "live_ready" && !inb?.paused_reason);
    setForbiddenOk(!forbidden || (forbidden as any).active === false);

    // ---- Queue sanity (block staging-more if simulated rows or zero Step 1 vs follow-ups) ----
    const blocks: string[] = [];
    if (campaignId) {
      const { data: qrows } = await supabase
        .from("email_queue")
        .select("contact_id,status,sequence_step,delivery_kind,block_reason,smtp_accepted_at,provider_message_id")
        .eq("campaign_id", campaignId);
      const q = (qrows ?? []) as any[];
      const activeStatuses = new Set(["pending", "delayed", "throttled"]);
      const activeSim = q.filter((r) => r.delivery_kind === "simulated" && activeStatuses.has(r.status)).length;
      const byStep = new Map(q.map((r) => [`${r.contact_id}:${r.sequence_step}`, r]));
      const pStep1 = q.filter((r) => activeStatuses.has(r.status) && r.sequence_step === 1).length;
      const pFollow = q.filter((r) => activeStatuses.has(r.status) && r.sequence_step > 1).length;
      const parentIntegrity = q.filter((r) => {
        if (!activeStatuses.has(r.status) || r.sequence_step <= 1) return false;
        const parent = byStep.get(`${r.contact_id}:${r.sequence_step - 1}`);
        return !(parent && parent.status === "sent" && parent.delivery_kind === "smtp_real" && parent.smtp_accepted_at && parent.provider_message_id);
      }).length;
      const unresolvedBlocked = q.filter((r) => r.status === "blocked" && ![
        "SIMULATED_NOT_TRANSMITTED",
        "SIMULATED_LEGACY_QUARANTINED",
        "SIMULATED_PARENT_NOT_SENT",
        "RECENT_COMMUNICATION_24H",
        "REPLY_RECEIVED",
        "BOUNCED",
      ].includes(r.block_reason ?? "")).length;
      if (activeSim > 0) blocks.push(`${activeSim} active simulated row(s) in queue — clean up before staging more.`);
      if (parentIntegrity > 0) blocks.push(`${parentIntegrity} active follow-up row(s) do not have a real SMTP parent send.`);
      if (pStep1 === 0 && pFollow > 0) blocks.push(`${pFollow} active follow-ups queued but 0 active Step 1 sends — verify Step 1 actually sent first.`);
      if (unresolvedBlocked > 0) blocks.push(`${unresolvedBlocked} blocked row(s) still need correction before adding more contacts.`);
    }
    setQueueBlock(blocks);

    const dailyLimit = Number(inb?.daily_send_limit ?? 0);
    const sentToday = Number(inb?.emails_sent_today ?? 0);
    const remainingCapacity = Math.max(dailyLimit - sentToday, 0);

    const [
      { count: readyToStage },
      { count: stagedTotal },
      { count: queuePending },
      { count: queueSentToday },
      { count: queuePendingStep1 },
      { count: queuePendingFollowups },
    ] = await Promise.all([
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).eq("current_stage", "ready_to_stage"),
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).eq("current_stage", "staged"),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending")
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent").gte("sent_at", todayStart)
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending").eq("sequence_step", 1)
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending").gt("sequence_step", 1)
        : Promise.resolve({ count: 0 } as any),
    ] as const);

    const ready = Number(readyToStage ?? 0);
    const staged = Number(stagedTotal ?? 0);
    const pendingStep1 = Number(queuePendingStep1 ?? 0);
    const pendingFollowups = Number(queuePendingFollowups ?? 0);
    setPoolReady(ready);
    setPoolStaged(staged);

    const totalPendingSends = pendingStep1 + pendingFollowups;
    const daysCoverage = dailyLimit > 0 ? Math.floor(totalPendingSends / dailyLimit) : 0;
    // We need coverage through Tuesday. Today is Friday → ~4 days (Sat, Sun, Mon, Tue).
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 Sun .. 6 Sat
    // Days until end of Tuesday inclusive
    const tuesdayIndex = 2;
    let daysToTuesday = (tuesdayIndex - dayOfWeek + 7) % 7;
    if (daysToTuesday === 0) daysToTuesday = 0; // already Tuesday → today only
    const coverageDaysNeeded = Math.max(daysToTuesday, 1);
    const covered = dailyLimit > 0 && daysCoverage >= coverageDaysNeeded;

    setCoverage({
      daysCoverage: dailyLimit > 0 ? `${daysCoverage} day${daysCoverage === 1 ? "" : "s"}` : "n/a",
      covered,
      detail: dailyLimit > 0
        ? `${totalPendingSends} pending sends ÷ ${dailyLimit}/day cap = ~${daysCoverage} day(s). Need ${coverageDaysNeeded} day(s) to cover through Tuesday.`
        : "Sender daily cap unknown — cannot estimate coverage.",
    });

    setPool([
      { label: "Ready to stage", value: ready, tone: ready > 0 ? "info" : undefined },
      { label: "Already staged", value: staged },
      { label: "In email queue (pending)", value: queuePending ?? 0 },
      { label: "Sent today (real SMTP)", value: queueSentToday ?? 0, tone: "ok" },
      { label: "Pending Step 1 sends", value: pendingStep1 },
      { label: "Follow-ups scheduled", value: pendingFollowups },
      { label: "Sender daily cap", value: dailyLimit || "n/a" },
      { label: "Sender capacity left today", value: dailyLimit ? remainingCapacity : "n/a", tone: dailyLimit && remainingCapacity > 0 ? "ok" : "warn" },
      { label: "Est. queue coverage", value: dailyLimit ? `${daysCoverage}d` : "n/a", tone: covered ? "ok" : "warn" },
      { label: "Pool target (today)", value: TARGET_POOL },
      { label: "Pool progress", value: `${ready + staged} / ${TARGET_POOL}` },
    ]);

    // ---- Today's batches (Apollo sync runs created today for this segment) ----
    if (segId) {
      const { data: runs } = await supabase
        .from("apollo_sync_runs")
        .select("id,started_at,status,people_found,people_with_email_flag,contacts_new,contacts_updated,qualified_count,ready_to_stage_count,apollo_credits_used")
        .eq("segment_id", segId)
        .gte("started_at", todayStart)
        .order("started_at", { ascending: false });
      const list = (runs ?? []) as BatchRow[];
      setBatches(list);
      const cum = list.reduce(
        (acc, r) => ({
          runs: acc.runs + 1,
          credits: acc.credits + Number(r.apollo_credits_used ?? 0),
          qualified: acc.qualified + Number(r.qualified_count ?? 0),
          new: acc.new + Number(r.contacts_new ?? 0),
          updated: acc.updated + Number(r.contacts_updated ?? 0),
          found: acc.found + Number(r.people_found ?? 0),
          emails: acc.emails + Number(r.people_with_email_flag ?? 0),
        }),
        { runs: 0, credits: 0, qualified: 0, new: 0, updated: 0, found: 0, emails: 0 },
      );
      setCumulative(cum);
    }

    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runNextBatch() {
    if (!segmentId) {
      toast({ title: "Segment not found", description: "No NeonCandy Apollo segment exists.", variant: "destructive" });
      return;
    }
    if (queueBlock.length) {
      toast({ title: "Queue not clean", description: queueBlock[0], variant: "destructive" });
      return;
    }
    if (!senderOk) {
      toast({ title: "Sender not live-ready", description: `${SENDER} is not active/live-ready. Fix before pulling more leads.`, variant: "destructive" });
      return;
    }
    if (!forbiddenOk) {
      toast({ title: "Forbidden sender active", description: `${FORBIDDEN_SENDER} must be inactive.`, variant: "destructive" });
      return;
    }
    if (!confirm(
      `Run next Apollo batch (max ${BATCH_SIZE} contacts) for NeonCandy Month 1?\n\n` +
      `• Preview will be required before any credits are spent\n` +
      `• Existing CRM contacts and possible duplicates will be skipped\n` +
      `• Suppressed contacts will be skipped\n` +
      `• Only New / good-fit / has_email candidates will be enrichable\n\n` +
      `After search completes, open the Sync Runs tab to approve enrichment.`,
    )) return;
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("apollo-sync-search", { body: { segment_id: segmentId } });
    setRunning(false);
    if (error) {
      toast({ title: "Batch failed", description: error.message, variant: "destructive" });
      return;
    }
    const r = (data as any) ?? {};
    toast({
      title: "Batch search complete",
      description: `Found ${r.people_found ?? 0} candidates · ${r.people_with_email_flag ?? 0} with email. Open Sync Runs to preview & approve enrichment.`,
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Build weekend pool</h2>
          <p className="text-sm text-muted-foreground">
            Build ~{TARGET_POOL} approved NeonCandy contacts in 25-at-a-time Apollo batches so Liftor can work the pool through Tuesday.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Current pool status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <StatGrid stats={pool} />
          {coverage && (
            <div className={`rounded-md border p-3 text-sm ${coverage.covered ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              <div className="flex items-center gap-2 font-medium">
                {coverage.covered ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                Tuesday coverage estimate: {coverage.daysCoverage}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{coverage.detail}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={queueBlock.length === 0 ? "border-emerald-500/40" : "border-destructive/40"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {queueBlock.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            Weekend pool progress
            <Badge
              variant={queueBlock.length === 0 ? "default" : "destructive"}
              className="ml-2"
            >
              Queue integrity: {queueBlock.length === 0 ? "Clean" : "Needs cleanup"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatGrid
            stats={[
              { label: "Existing staged contacts", value: poolStaged, tone: poolStaged > 0 ? "info" : undefined },
              { label: "Ready to stage", value: poolReady, tone: poolReady > 0 ? "info" : undefined },
              { label: "New batch contacts found (today)", value: cumulative.found },
              { label: "New batch enriched (new+updated)", value: cumulative.new + cumulative.updated },
              { label: "New batch emails returned", value: cumulative.emails },
              { label: "New batch qualified", value: cumulative.qualified, tone: "ok" },
              { label: "Total pool built today", value: poolReady + poolStaged, tone: "info" },
              { label: "Apollo credits spent today", value: cumulative.credits },
              { label: "Coverage until Tuesday", value: coverage?.daysCoverage ?? "n/a", tone: coverage?.covered ? "ok" : "warn" },
              {
                label: "Active Step 1 pending",
                value: pool.find((p) => p.label === "Pending Step 1 sends")?.value ?? 0,
              },
              {
                label: "Follow-ups scheduled",
                value: pool.find((p) => p.label === "Follow-ups scheduled")?.value ?? 0,
              },
              {
                label: "Queue integrity",
                value: queueBlock.length === 0 ? "Clean" : `${queueBlock.length} issue(s)`,
                tone: queueBlock.length === 0 ? "ok" : "bad",
              },
            ]}
          />
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-medium">
              Pool progress: <strong>{poolReady + poolStaged}</strong> / {TARGET_POOL} approved contacts
              {poolReady + poolStaged >= TARGET_POOL ? " ✅ target reached" : ""}
            </div>
            <div className="mt-1 text-muted-foreground">
              The "Run next 25-contact Apollo batch" button is disabled whenever Queue integrity ≠ Clean.
              Resolve the items in the warning panel below before continuing.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Next batch (capped at {BATCH_SIZE})</span>
            <Badge variant="outline">NeonCandy Month 1</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queueBlock.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Hold staging until queue is clean
              </div>
              <ul className="ml-5 list-disc text-xs">
                {queueBlock.map((b) => <li key={b}>{b}</li>)}
              </ul>
              <div className="mt-2 text-xs text-muted-foreground">
                Open the Daily Monitor → Email queue breakdown for the full per-row view.
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runNextBatch} disabled={running || !segmentId || queueBlock.length > 0}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Run next 25-contact Apollo batch
            </Button>
            {onOpenRuns && (
              <Button variant="outline" onClick={onOpenRuns}>
                Open Sync Runs to approve <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          <ul className="ml-5 list-disc text-xs text-muted-foreground">
            <li>Each run still shows candidate preview, CRM duplicate status, segment fit, estimated credits, and selected-for-enrichment count.</li>
            <li>Skips existing contacts with known email; possible duplicates held for manual selection; suppressed contacts skipped.</li>
            <li>Enriches only New / good-fit / has_email candidates within the daily enrichment cap.</li>
            <li>Single Apollo run capped at {BATCH_SIZE} contacts — preview / dedupe / credit safety stays intact.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Today's batches</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Runs today", value: cumulative.runs },
              { label: "Found", value: cumulative.found },
              { label: "Emails returned", value: cumulative.emails },
              { label: "New contacts", value: cumulative.new },
              { label: "Updated", value: cumulative.updated },
              { label: "Qualified pool today", value: cumulative.qualified },
              { label: "Credits spent today", value: cumulative.credits },
            ].map((s) => (
              <div key={s.label} className="rounded-md border p-3 text-sm">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-xl font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Apollo batches today yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Started</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Found</th>
                    <th className="p-2 text-right">Emails</th>
                    <th className="p-2 text-right">New</th>
                    <th className="p-2 text-right">Updated</th>
                    <th className="p-2 text-right">Qualified</th>
                    <th className="p-2 text-right">Ready</th>
                    <th className="p-2 text-right">Credits</th>
                    <th className="p-2 text-left">Imports</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{new Date(b.started_at).toLocaleTimeString()}</td>
                      <td className="p-2"><Badge variant="outline">{b.status}</Badge></td>
                      <td className="p-2 text-right">{b.people_found}</td>
                      <td className="p-2 text-right">{b.people_with_email_flag}</td>
                      <td className="p-2 text-right">{b.contacts_new}</td>
                      <td className="p-2 text-right">{b.contacts_updated}</td>
                      <td className="p-2 text-right">{b.qualified_count}</td>
                      <td className="p-2 text-right">{b.ready_to_stage_count}</td>
                      <td className="p-2 text-right">{b.apollo_credits_used ?? 0}</td>
                      <td className="p-2">
                        <Link to={`/founder/outreach/imports?run_id=${b.id}`} className="text-primary underline-offset-2 hover:underline">View imports</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage qualified contacts into campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>{poolReady}</strong> qualified contact{poolReady === 1 ? "" : "s"} currently <strong>Ready to stage</strong>.
            Use the staging confirmation to push them into <strong>{CAMPAIGN_NAME}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/founder/outreach/queue?stage=ready_to_stage&business=${encodeURIComponent(BUSINESS)}`}>
                Open Ready to stage queue <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="font-medium">Before staging, the confirmation will show:</div>
            <ul className="mt-1 ml-5 list-disc text-xs text-muted-foreground">
              <li>Contacts selected · Campaign: {CAMPAIGN_NAME}</li>
              <li>Sender: {SENDER} · Real SMTP only · {FORBIDDEN_SENDER} inactive</li>
              <li>Sequence: Day 0 / Day 3 / Day 7 / Day 14</li>
              <li>Sending obeys ramp / daily cap / send-window / sanity layer / suppression checks</li>
              <li>Contacts may queue across multiple days — not all sent immediately</li>
              <li>Replies stop follow-ups · Bounces & unsubscribes suppress contacts</li>
              <li>AI replies require Founder approval — no simulated sends</li>
            </ul>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <strong>Sequence verification:</strong> Each staged contact will enter the 4-step campaign sequence: <em>Day 0, Day 3, Day 7, Day 14</em>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WeekendPool;