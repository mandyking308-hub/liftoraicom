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
  Rocket,
  StopCircle,
} from "lucide-react";

const BUSINESS = "Neon Candy";
const CAMPAIGN_NAME = "Early Access Collaboration Test";
const SENDER = "hello@neoncandy.online";
const FORBIDDEN_SENDER = "music@neoncandy.net";
const TARGET_POOL = 100;
const BATCH_SIZE = 25;
const ENRICH_CHUNK = 25;            // per apollo-sync-enrich invocation
const DAILY_CREDIT_CAP = 200;       // hard ceiling for the auto-builder per UTC day

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
  enrichment_attempted: number;
  emails_returned: number;
  contacts_imported: number;
  contacts_new: number;
  contacts_updated: number;
  qualified_count: number;
  ready_to_stage_count: number;
  apollo_credits_used: number | null;
  page_fetched?: number | null;
  unseen_in_batch?: number | null;
  skipped_already_seen?: number | null;
};

export function WeekendPool({ onOpenRuns }: { onOpenRuns?: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [pool, setPool] = useState<Stat[]>([]);
  const [coverage, setCoverage] = useState<{ daysCoverage: string; covered: boolean; detail: string } | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  // Counted runs = completed/partial/enriching only. Audit-only runs do NOT inflate pool totals.
  const [counted, setCounted] = useState({
    runs: 0,
    searchFound: 0,
    hasEmailFlag: 0,
    selectedForEnrichment: 0,
    creditsSpent: 0,
    usableEmails: 0,
    importedTotal: 0,
    newCreated: 0,
    existingUpdated: 0,
    qualified: 0,
    readyToStage: 0,
  });
  const [auditOnly, setAuditOnly] = useState({
    runs: 0,
    searchFound: 0,
    hasEmailFlag: 0,
  });
  const [staleAwaiting, setStaleAwaiting] = useState<BatchRow[]>([]);
  const [discarding, setDiscarding] = useState(false);
  const [poolReady, setPoolReady] = useState(0);
  const [poolStaged, setPoolStaged] = useState(0);
  const [senderOk, setSenderOk] = useState(false);
  const [forbiddenOk, setForbiddenOk] = useState(false);
  const [queueBlock, setQueueBlock] = useState<string[]>([]);
  // ---- Auto-builder state (Build pool to 100) ----
  const [building, setBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [buildAbort, setBuildAbort] = useState(false);
  // ---- Pagination state mirrored from the segment ----
  const [pagination, setPagination] = useState<{
    currentPage: number;
    nextPage: number;
    lastPageProcessed: number | null;
    seenCount: number;
  }>({ currentPage: 1, nextPage: 1, lastPageProcessed: null, seenCount: 0 });
  const [lastBatchPage, setLastBatchPage] = useState<{ page: number; unseen: number; skippedSeen: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const todayIso = new Date(); todayIso.setUTCHours(0, 0, 0, 0);
    const todayStart = todayIso.toISOString();
    const todayDate = new Date().toISOString().slice(0, 10);

    const [{ data: segment }, { data: campaign }, { data: inbox }, { data: forbidden }] = await Promise.all([
      supabase.from("apollo_sync_segments").select("id,segment_name,max_contacts_per_run,current_page,next_page,last_page_processed,apollo_person_ids_seen").eq("business_name", BUSINESS).maybeSingle(),
      supabase.from("outreach_campaigns").select("id,status").eq("business_name", BUSINESS).eq("campaign_name", CAMPAIGN_NAME).maybeSingle(),
      supabase.from("inboxes").select("id,active,daily_send_limit,emails_sent_today,paused_reason,live_readiness").eq("business_name", BUSINESS).eq("email_address", SENDER).maybeSingle(),
      supabase.from("inboxes").select("id,active").eq("business_name", BUSINESS).eq("email_address", FORBIDDEN_SENDER).maybeSingle(),
    ]);

    const segId = (segment as any)?.id ?? null;
    setSegmentId(segId);
    const segRow = segment as any;
    setPagination({
      currentPage: Number(segRow?.current_page ?? 1),
      nextPage: Number(segRow?.next_page ?? 1),
      lastPageProcessed: segRow?.last_page_processed ?? null,
      seenCount: Array.isArray(segRow?.apollo_person_ids_seen) ? segRow.apollo_person_ids_seen.length : 0,
    });
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
        .select("id,started_at,status,people_found,people_with_email_flag,enrichment_attempted,emails_returned,contacts_imported,contacts_new,contacts_updated,qualified_count,ready_to_stage_count,apollo_credits_used,page_fetched,unseen_in_batch,skipped_already_seen")
        .eq("segment_id", segId)
        .gte("started_at", todayStart)
        .order("started_at", { ascending: false });
      const list = (runs ?? []) as BatchRow[];
      setBatches(list);

      const latest = list.find((r: any) => r.page_fetched != null) as any;
      if (latest) {
        setLastBatchPage({
          page: Number(latest.page_fetched ?? 0),
          unseen: Number(latest.unseen_in_batch ?? 0),
          skippedSeen: Number(latest.skipped_already_seen ?? 0),
        });
      }

      const COUNTED_STATUSES = new Set(["completed", "partial", "enriching"]);
      const AUDIT_STATUSES = new Set(["awaiting_enrichment_approval", "search_running", "cancelled", "failed", "search_failed", "enrichment_failed"]);

      const countedRuns = list.filter((r) => COUNTED_STATUSES.has(r.status));
      const auditRuns = list.filter((r) => AUDIT_STATUSES.has(r.status));
      const stale = list.filter((r) => r.status === "awaiting_enrichment_approval");
      setStaleAwaiting(stale);

      setCounted(countedRuns.reduce(
        (acc, r) => ({
          runs: acc.runs + 1,
          searchFound: acc.searchFound + Number(r.people_found ?? 0),
          hasEmailFlag: acc.hasEmailFlag + Number(r.people_with_email_flag ?? 0),
          selectedForEnrichment: acc.selectedForEnrichment + Number(r.enrichment_attempted ?? 0),
          creditsSpent: acc.creditsSpent + Number(r.apollo_credits_used ?? r.enrichment_attempted ?? 0),
          usableEmails: acc.usableEmails + Number(r.emails_returned ?? 0),
          importedTotal: acc.importedTotal + Number(r.contacts_imported ?? 0),
          newCreated: acc.newCreated + Number(r.contacts_new ?? 0),
          existingUpdated: acc.existingUpdated + Number(r.contacts_updated ?? 0),
          qualified: acc.qualified + Number(r.qualified_count ?? 0),
          readyToStage: acc.readyToStage + Number(r.ready_to_stage_count ?? 0),
        }),
        { runs: 0, searchFound: 0, hasEmailFlag: 0, selectedForEnrichment: 0, creditsSpent: 0, usableEmails: 0, importedTotal: 0, newCreated: 0, existingUpdated: 0, qualified: 0, readyToStage: 0 },
      ));
      setAuditOnly(auditRuns.reduce(
        (acc, r) => ({
          runs: acc.runs + 1,
          searchFound: acc.searchFound + Number(r.people_found ?? 0),
          hasEmailFlag: acc.hasEmailFlag + Number(r.people_with_email_flag ?? 0),
        }),
        { runs: 0, searchFound: 0, hasEmailFlag: 0 },
      ));
    }

    setLoading(false);
  }, []);

  async function discardStaleAwaiting() {
    if (staleAwaiting.length === 0) return;
    if (!confirm(`Discard ${staleAwaiting.length} unapproved awaiting search run(s)? They will be marked cancelled and removed from pool totals. No Apollo credits are spent.`)) return;
    setDiscarding(true);
    const { error } = await supabase
      .from("apollo_sync_runs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .in("id", staleAwaiting.map((r) => r.id));
    setDiscarding(false);
    if (error) {
      toast({ title: "Discard failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Stale awaiting runs discarded", description: `${staleAwaiting.length} unapproved search run(s) marked cancelled.` });
    void load();
  }

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

  // -------- Auto-builder: build pool to TARGET_POOL --------
  function appendLog(line: string) {
    setBuildLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  }

  /**
   * Read currently-available unenriched, good-fit candidates today.
   * Returns [{ run_id, apollo_person_ids[] }, ...] in oldest-first order so
   * existing awaiting-approval runs are consumed before new searches.
   */
  async function gatherAvailableCandidates(): Promise<{ runId: string; ids: string[] }[]> {
    if (!segmentId) return [];
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { data: runs } = await supabase
      .from("apollo_sync_runs")
      .select("id,status,errors,created_at")
      .eq("segment_id", segmentId)
      .gte("started_at", todayStart.toISOString())
      .in("status", ["awaiting_enrichment_approval", "enriching", "completed"])
      .order("created_at", { ascending: true });
    const out: { runId: string; ids: string[] }[] = [];
    for (const r of (runs ?? []) as any[]) {
      // Confirm good fit from diagnostics blob
      let good = false;
      try {
        const errs = (r.errors ?? []) as any[];
        for (const e of errs) {
          const parsed = typeof e === "string" ? JSON.parse(e) : e;
          if (parsed?.segment_fit === "good") { good = true; break; }
        }
      } catch (_) { /* ignore */ }
      if (!good) continue;
      const { data: leads } = await supabase
        .from("apollo_leads")
        .select("apollo_person_id,status,has_email_flag")
        .eq("run_id", r.id)
        .eq("has_email_flag", true)
        .eq("status", "has_email");      // unenriched only
      const ids = ((leads ?? []) as any[]).map((l) => l.apollo_person_id).filter(Boolean);
      if (ids.length) out.push({ runId: r.id as string, ids });
    }
    return out;
  }

  async function buildPoolToTarget() {
    if (!segmentId) {
      toast({ title: "Segment not found", variant: "destructive" });
      return;
    }
    if (queueBlock.length) {
      toast({ title: "Queue not clean", description: queueBlock[0], variant: "destructive" });
      return;
    }
    if (!senderOk) {
      toast({ title: "Sender not live-ready", variant: "destructive" });
      return;
    }
    if (!forbiddenOk) {
      toast({ title: "Forbidden sender active", variant: "destructive" });
      return;
    }

    const currentPool = poolReady + poolStaged;
    const need = TARGET_POOL - currentPool;
    if (need <= 0) {
      toast({ title: "Target reached", description: `Pool already at ${currentPool}/${TARGET_POOL}.` });
      return;
    }

    setBuildLog([]);
    setBuildAbort(false);
    setBuilding(true);
    appendLog(`Need ${need} more Ready-to-stage contacts to reach ${TARGET_POOL}.`);

    try {
      // Step 1: gather already-found, good-fit, unenriched candidates
      const buckets = await gatherAvailableCandidates();
      const availableCount = buckets.reduce((n, b) => n + b.ids.length, 0);
      appendLog(`Found ${availableCount} unenriched good-fit candidate(s) across ${buckets.length} existing run(s).`);

      // Step 2: estimate credits
      const creditsAvailable = Math.max(DAILY_CREDIT_CAP - counted.creditsSpent, 0);
      // Heuristic: ~85% conversion candidate→ready-to-stage based on today's runs
      const conversion = counted.selectedForEnrichment > 0
        ? Math.max(counted.readyToStage / counted.selectedForEnrichment, 0.5)
        : 0.85;
      const estCandidatesNeeded = Math.ceil(need / conversion);
      const willEnrich = Math.min(estCandidatesNeeded, availableCount, creditsAvailable);
      const extraSearchesNeeded = Math.max(0, estCandidatesNeeded - availableCount);
      const additionalSearchPages = Math.ceil(extraSearchesNeeded / BATCH_SIZE);
      const totalEstCredits = Math.min(estCandidatesNeeded, creditsAvailable);

      const ok = confirm(
        `Build pool to ${TARGET_POOL}\n\n` +
        `Current pool: ${currentPool}\nNeed: ${need} more Ready-to-stage contacts\n\n` +
        `Plan:\n` +
        `• Use ${Math.min(availableCount, willEnrich)} already-found candidate(s) first (no new search credits)\n` +
        (additionalSearchPages > 0
          ? `• Then run up to ${additionalSearchPages} additional search page(s) of ${BATCH_SIZE}\n`
          : `• No additional search needed\n`) +
        `• Estimated Apollo enrichment credits: ~${totalEstCredits}\n` +
        `• Daily cap remaining: ${creditsAvailable} credit(s) (cap ${DAILY_CREDIT_CAP})\n\n` +
        `Filters still applied: segment_fit=good · skip existing CRM · skip suppressed · email-only · no phone · no AI Research · weak/poor fit blocked.\n\n` +
        `Continue?`
      );
      if (!ok) {
        appendLog("Cancelled by user.");
        setBuilding(false);
        return;
      }

      // Step 3: process loop
      let safety = 20; // max iterations
      while (safety-- > 0) {
        if (buildAbort) { appendLog("Aborted."); break; }

        // Refresh current pool & credits each iteration
        const [{ count: rNow }, { count: sNow }] = await Promise.all([
          supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).eq("current_stage", "ready_to_stage"),
          supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).eq("current_stage", "staged"),
        ]);
        const poolNow = Number(rNow ?? 0) + Number(sNow ?? 0);
        if (poolNow >= TARGET_POOL) { appendLog(`✅ Target reached (${poolNow}/${TARGET_POOL}).`); break; }

        // Recompute credits spent today
        const todayStartIso = (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d.toISOString(); })();
        const { data: runsToday } = await supabase
          .from("apollo_sync_runs")
          .select("apollo_credits_used")
          .eq("segment_id", segmentId)
          .gte("started_at", todayStartIso);
        const creditsToday = (runsToday ?? []).reduce((n, r: any) => n + Number(r.apollo_credits_used ?? 0), 0);
        const creditsLeft = Math.max(DAILY_CREDIT_CAP - creditsToday, 0);
        if (creditsLeft <= 0) {
          appendLog(`Stopped: daily Apollo credit cap reached (${creditsToday}/${DAILY_CREDIT_CAP}).`);
          break;
        }

        // Re-check queue integrity
        const { data: campaign } = await supabase.from("outreach_campaigns").select("id").eq("business_name", BUSINESS).eq("campaign_name", CAMPAIGN_NAME).maybeSingle();
        const cId = (campaign as any)?.id;
        if (cId) {
          const { count: simCount } = await supabase
            .from("email_queue").select("id", { count: "exact", head: true })
            .eq("campaign_id", cId).eq("delivery_kind", "simulated").in("status", ["pending","delayed","throttled"]);
          if (Number(simCount ?? 0) > 0) {
            appendLog(`Stopped: queue integrity unsafe (${simCount} simulated row(s) active).`);
            break;
          }
        }

        // Find next bucket
        const fresh = await gatherAvailableCandidates();
        let nextBucket = fresh.find((b) => b.ids.length > 0);

        if (!nextBucket) {
          // Need to run a new search page
          appendLog(`No unenriched candidates left. Running new search page (cap ${BATCH_SIZE})...`);
          const { data: sData, error: sErr } = await supabase.functions.invoke("apollo-sync-search", { body: { segment_id: segmentId } });
          if (sErr) { appendLog(`Search failed: ${sErr.message}. Stopping.`); break; }
          const sr = (sData as any) ?? {};
          const fit = sr?.diagnostics?.segment_fit ?? "unknown";
          appendLog(`Search returned ${sr.people_found ?? 0} (with-email ${sr.people_with_email_flag ?? 0}, fit=${fit}).`);
          if (fit !== "good") { appendLog(`Stopped: latest search fit=${fit}, not good. No enrichment performed.`); break; }
          if ((sr.people_with_email_flag ?? 0) === 0) { appendLog("Stopped: no candidates with email flag returned."); break; }
          // loop will pick this run on next iter
          continue;
        }

        const chunk = nextBucket.ids.slice(0, Math.min(ENRICH_CHUNK, creditsLeft));
        appendLog(`Enriching ${chunk.length} candidate(s) from run ${nextBucket.runId.slice(0,8)}…`);
        const { data: eData, error: eErr } = await supabase.functions.invoke("apollo-sync-enrich", {
          body: { run_id: nextBucket.runId, selected_apollo_person_ids: chunk },
        });
        if (eErr) {
          appendLog(`Enrichment error: ${eErr.message}. Stopping (no duplicate credits will be spent — safe to resume).`);
          break;
        }
        const er = (eData as any) ?? {};
        appendLog(`Chunk done · enriched=${er.enriched ?? "?"} · usable_emails=${er.emails_returned ?? "?"} · ready=${er.ready_to_stage ?? "?"} · credits=${er.credits_used ?? chunk.length}.`);

        // brief pause so DB counters update before next iteration
        await new Promise((r) => setTimeout(r, 800));
      }

      await load();
      toast({ title: "Build pool finished", description: "Open the log card below for details." });
    } catch (err) {
      appendLog(`Fatal: ${(err as Error).message}`);
      toast({ title: "Build pool failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Build weekend pool</h2>
          <p className="text-sm text-muted-foreground">
            One-click build to {TARGET_POOL} approved NeonCandy contacts. Liftor reuses already-found candidates first, then fetches more pages only if needed.
          </p>
        </div>
        <div className="flex gap-2">
          {building ? (
            <Button size="sm" variant="destructive" onClick={() => setBuildAbort(true)}>
              <StopCircle className="mr-1 h-3 w-3" /> Stop after current chunk
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={buildPoolToTarget}
              disabled={loading || !segmentId || queueBlock.length > 0 || (poolReady + poolStaged) >= TARGET_POOL}
            >
              <Rocket className="mr-1 h-3 w-3" /> Build pool to {TARGET_POOL} now
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading || building}>
            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="font-medium">
            {(() => {
              const cur = poolReady + poolStaged;
              const need = Math.max(TARGET_POOL - cur, 0);
              return need === 0
                ? `✅ Target reached: ${cur}/${TARGET_POOL} approved contacts.`
                : `Need ${need} more Ready-to-stage contact${need === 1 ? "" : "s"} to reach ${TARGET_POOL}. (Current pool: ${cur})`;
            })()}
          </div>
          <div className="text-xs text-muted-foreground">
            "Build pool to {TARGET_POOL} now" will: (1) use already-found good-fit candidates first,
            (2) only fetch additional Apollo pages if needed, (3) stop on credit cap / queue issue / no good-fit candidates,
            (4) require credit-spend confirmation before any enrichment.
          </div>
          {building && buildLog.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto rounded border bg-background/60 p-2 text-xs font-mono">
              {buildLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          {!building && buildLog.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">Show last build log ({buildLog.length} lines)</summary>
              <div className="mt-1 max-h-48 overflow-auto rounded border bg-background/60 p-2 text-xs font-mono">
                {buildLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

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
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="mb-2 text-sm font-semibold text-foreground">
              A. Counted toward pool — completed / enriched runs ({counted.runs})
            </div>
            <StatGrid
              stats={[
                { label: "Already staged (CRM)", value: poolStaged, tone: poolStaged > 0 ? "info" : undefined },
                { label: "Ready to stage (CRM, all-time)", value: poolReady, tone: poolReady > 0 ? "info" : undefined },
                { label: "1. Search candidates found", value: counted.searchFound },
                { label: "2. Has-email flag candidates", value: counted.hasEmailFlag },
                { label: "3. Selected for enrichment", value: counted.selectedForEnrichment },
                { label: "4. Apollo credits spent today", value: counted.creditsSpent, tone: counted.creditsSpent > 0 ? "info" : undefined },
                { label: "5. Usable emails returned", value: counted.usableEmails, tone: "ok" },
                { label: "6. Contacts saved to CRM", value: counted.importedTotal },
                { label: "7. New contacts created", value: counted.newCreated },
                { label: "8. Existing contacts updated", value: counted.existingUpdated },
                { label: "9. Qualified from today's runs", value: counted.qualified, tone: "ok" },
                { label: "10. Ready to stage (today's runs)", value: counted.readyToStage },
                { label: "Not stageable today", value: Math.max(counted.qualified - counted.readyToStage, 0), tone: counted.qualified > counted.readyToStage ? "warn" : undefined },
                { label: "Total pool (ready + staged)", value: poolReady + poolStaged, tone: "info" },
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
            <div className="mt-2 rounded border bg-background/60 p-2 text-xs text-muted-foreground">
              <strong>Why "Qualified" can be higher than "Ready to stage":</strong> a contact is counted as
              <em> qualified</em> when its enrichment passes scoring, but only becomes
              <em> ready to stage</em> after CRM dedupe, suppression checks, and the per-business stage transition.
              The difference (<strong>{Math.max(counted.qualified - counted.readyToStage, 0)}</strong> today) is held back as duplicates, suppressed, or pending review.
            </div>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">
                B. Audit only — awaiting / cancelled / failed search previews ({auditOnly.runs})
              </div>
              {staleAwaiting.length > 0 && (
                <Button size="sm" variant="outline" onClick={discardStaleAwaiting} disabled={discarding}>
                  {discarding ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Discard {staleAwaiting.length} stale awaiting run{staleAwaiting.length === 1 ? "" : "s"}
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              These search-preview runs were never approved for enrichment. They do not count toward the weekend pool or credit spend.
              Found across audit runs: {auditOnly.searchFound} candidates · {auditOnly.hasEmailFlag} with email flag.
            </div>
          </div>

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
              { label: "Counted runs", value: counted.runs },
              { label: "Search candidates found", value: counted.searchFound },
              { label: "Selected for enrichment", value: counted.selectedForEnrichment },
              { label: "Usable emails returned", value: counted.usableEmails },
              { label: "New contacts", value: counted.newCreated },
              { label: "Updated contacts", value: counted.existingUpdated },
              { label: "Qualified", value: counted.qualified },
              { label: "Credits spent today", value: counted.creditsSpent },
              { label: "Audit-only runs", value: auditOnly.runs },
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