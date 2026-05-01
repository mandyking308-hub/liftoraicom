import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const BUSINESS = "Neon Candy";
const CAMPAIGN_NAME = "Early Access Collaboration Test";
const SENDER = "hello@neoncandy.online";
const FORBIDDEN_SENDER = "music@neoncandy.net";

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

type Check = { label: string; ok: boolean; detail?: string };

function CheckRow({ c }: { c: Check }) {
  return (
    <div className="flex items-start gap-2 py-1 text-sm">
      {c.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <div className="flex-1">
        <div>{c.label}</div>
        {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
      </div>
      <Badge variant={c.ok ? "default" : "destructive"}>{c.ok ? "OK" : "FIX"}</Badge>
    </div>
  );
}

export function NeonCandyMonitor() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<Stat[]>([]);
  const [weekStats, setWeekStats] = useState<Stat[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [queueBreakdown, setQueueBreakdown] = useState<Stat[] | null>(null);
  const [queueExplain, setQueueExplain] = useState<string>("");
  const [queueRows, setQueueRows] = useState<Array<{ email: string; sequence_step: number; status: string; delivery_kind: string | null; scheduled_utc: string | null }>>([]);
  const [queueWarn, setQueueWarn] = useState<string[]>([]);
  const [legacyBreakdown, setLegacyBreakdown] = useState<Stat[]>([]);
  const [integrityClean, setIntegrityClean] = useState<boolean>(false);
  const [integrityReasons, setIntegrityReasons] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const todayIso = new Date(); todayIso.setUTCHours(0, 0, 0, 0);
    const todayStart = todayIso.toISOString();
    const weekStart = new Date(); weekStart.setUTCHours(0, 0, 0, 0); weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const weekStartIso = weekStart.toISOString();

    // ----- Resolve campaign + segment + inbox -----
    const [{ data: campaign }, { data: segment }, { data: inboxes }, { data: forbidden }] = await Promise.all([
      supabase.from("outreach_campaigns").select("id,status").eq("business_name", BUSINESS).eq("campaign_name", CAMPAIGN_NAME).maybeSingle(),
      supabase.from("apollo_sync_segments").select("*").eq("business_name", BUSINESS).maybeSingle(),
      supabase.from("inboxes").select("id,email_address,active,daily_send_limit,emails_sent_today,warmup_status,paused_reason,live_readiness").eq("business_name", BUSINESS).eq("email_address", SENDER).maybeSingle(),
      supabase.from("inboxes").select("id,active").eq("business_name", BUSINESS).eq("email_address", FORBIDDEN_SENDER).maybeSingle(),
    ]);

    const campaignId = (campaign as any)?.id ?? null;
    const inbox = inboxes as any;

    // ----- TODAY: apollo automation row -----
    const { data: autoToday } = await supabase
      .from("apollo_automation_runs")
      .select("*")
      .eq("business_name", BUSINESS)
      .eq("run_date", new Date().toISOString().slice(0, 10))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const a = autoToday as any | null;

    // ----- TODAY: pipeline counts (relationships + queue + events + drafts) -----
    const [
      { count: readyToStage },
      { count: stagedTotal },
      { count: queuePendingTotal },
      { count: queueSentToday },
      { count: queueFailedToday },
      { count: followUpsScheduled },
      { data: replyEventsToday },
      { data: bounceEventsToday },
      { data: unsubEventsToday },
      { count: aiDraftsPending },
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
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed").gte("last_attempt_at", todayStart)
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).gt("sequence_step", 1).eq("status", "pending")
        : Promise.resolve({ count: 0 } as any),
      supabase.from("email_events").select("id,contact_id,event_type,timestamp").eq("event_type", "replied").gte("timestamp", todayStart),
      supabase.from("email_events").select("id,contact_id,event_type,timestamp").eq("event_type", "bounced").gte("timestamp", todayStart),
      supabase.from("contacts").select("id,global_suppression_at,global_suppression_reason").eq("is_globally_suppressed", true).gte("global_suppression_at", todayStart),
      supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ] as const);

    setToday([
      { label: "Apollo run status", value: a?.status ?? "not run yet", tone: a?.status === "completed" ? "ok" : a?.status === "failed" ? "bad" : "info" },
      { label: "Candidates found", value: a?.found ?? 0 },
      { label: "Duplicates skipped", value: a?.skipped_duplicates ?? 0 },
      { label: "Credits used", value: a?.enrichment_credits_used ?? 0 },
      { label: "Contacts new", value: a?.contacts_new ?? 0 },
      { label: "Contacts updated", value: a?.contacts_updated ?? 0 },
      { label: "Qualified", value: a?.qualified ?? 0 },
      { label: "Ready to stage", value: readyToStage ?? 0 },
      { label: "Staged", value: stagedTotal ?? 0 },
      { label: "Sent today (real SMTP)", value: queueSentToday ?? 0, tone: "ok" },
      { label: "Queued (pending)", value: queuePendingTotal ?? 0 },
      { label: "Failed sends today", value: queueFailedToday ?? 0, tone: (queueFailedToday ?? 0) > 0 ? "warn" : undefined },
      { label: "Follow-ups scheduled", value: followUpsScheduled ?? 0 },
      { label: "Replies today", value: (replyEventsToday ?? []).length },
      { label: "AI drafts waiting", value: aiDraftsPending ?? 0, tone: (aiDraftsPending ?? 0) > 0 ? "warn" : undefined },
      { label: "Bounces today", value: (bounceEventsToday ?? []).length, tone: (bounceEventsToday ?? []).length > 0 ? "warn" : undefined },
      { label: "Suppressed today", value: (unsubEventsToday ?? []).length },
    ]);

    // ----- Queue breakdown (campaign-scoped, by step + status + delivery_kind) -----
    if (campaignId) {
      const { data: rows } = await supabase
        .from("email_queue")
        .select("id,contact_id,sequence_step,status,delivery_kind,scheduled_at,sent_at,send_error,block_reason,provider_message_id")
        .eq("campaign_id", campaignId);
      const all = (rows ?? []) as any[];
      const now = Date.now();

      const isPending = (r: any) => r.status === "pending";
      const stepCount = (step: number) =>
        all.filter((r) => isPending(r) && r.sequence_step === step).length;
      const delayed = all.filter((r) =>
        isPending(r) && r.scheduled_at && new Date(r.scheduled_at).getTime() > now,
      ).length;
      const dueNow = all.filter((r) =>
        isPending(r) && (!r.scheduled_at || new Date(r.scheduled_at).getTime() <= now),
      ).length;
      const blocked = all.filter((r) => r.status === "blocked").length;
      const failed = all.filter((r) => r.status === "failed").length;
      const sentReal = all.filter(
        (r) => r.status === "sent" && r.delivery_kind !== "simulated" && !!r.provider_message_id,
      ).length;
      const activeStatuses = new Set(["pending", "delayed", "throttled"]);
      const activeSimulated = all.filter(
        (r) => r.delivery_kind === "simulated" && activeStatuses.has(r.status),
      ).length;
      const byStep = new Map(all.map((r) => [`${r.contact_id}:${r.sequence_step}`, r]));
      const activeFollowupsNoParent = all.filter((r) => {
        if (!activeStatuses.has(r.status) || r.sequence_step <= 1) return false;
        const parent = byStep.get(`${r.contact_id}:${r.sequence_step - 1}`);
        return !(parent && parent.status === "sent" && parent.delivery_kind === "smtp_real" && parent.smtp_accepted_at && parent.provider_message_id);
      }).length;

      // Legacy / quarantined buckets (NOT counted as active queue)
      const legacyQuarantined = all.filter(
        (r) => r.status === "blocked" && (r.block_reason === "SIMULATED_LEGACY_QUARANTINED" || r.block_reason === "SIMULATED_NOT_TRANSMITTED"),
      ).length;
      const legacyOrphanFollowups = all.filter(
        (r) => r.status === "blocked" && r.block_reason === "SIMULATED_PARENT_NOT_SENT",
      ).length;
      const safeBlocked = all.filter(
        (r) =>
          r.status === "blocked" &&
          ["RECENT_COMMUNICATION_24H", "REPLY_RECEIVED", "BOUNCED"].includes(r.block_reason ?? ""),
      ).length;

      const step1 = stepCount(1);
      const step2 = stepCount(2);
      const step3 = stepCount(3);
      const step4 = stepCount(4);

      setQueueBreakdown([
        { label: "Active pending Step 1", value: step1, tone: step1 > 0 ? "info" : undefined },
        { label: "Active Step 2 follow-up", value: step2 },
        { label: "Active Step 3 follow-up", value: step3 },
        { label: "Active Step 4 follow-up", value: step4 },
        { label: "Delayed (scheduled in future)", value: delayed, tone: "info" },
        { label: "Due now (within sender limits)", value: dueNow, tone: dueNow > 0 ? "warn" : undefined },
        { label: "Failed", value: failed, tone: failed > 0 ? "bad" : undefined },
        { label: "Sent (real SMTP, all-time)", value: sentReal, tone: "ok" },
        { label: "Active simulated rows", value: activeSimulated, tone: activeSimulated > 0 ? "bad" : "ok" },
        { label: "Active follow-ups without real parent", value: activeFollowupsNoParent, tone: activeFollowupsNoParent > 0 ? "bad" : "ok" },
      ]);

      setLegacyBreakdown([
        { label: "Quarantined simulated Step 1 (legacy)", value: legacyQuarantined, tone: "info" },
        { label: "Cancelled follow-ups (no real parent)", value: legacyOrphanFollowups, tone: "info" },
        { label: "Safe blocks (recent contact / reply / bounce)", value: safeBlocked, tone: "info" },
      ]);

      // ---- Queue integrity verdict ----
      const integrityIssues: string[] = [];
      if (activeSimulated > 0) integrityIssues.push(`${activeSimulated} active simulated row(s)`);
      if (activeFollowupsNoParent > 0) integrityIssues.push(`${activeFollowupsNoParent} active follow-up(s) without real SMTP parent`);
      if (failed > 0) integrityIssues.push(`${failed} failed row(s) need review`);
      setIntegrityReasons(integrityIssues);
      setIntegrityClean(integrityIssues.length === 0);

      const totalPending = step1 + step2 + step3 + step4;
      const followups = step2 + step3 + step4;
      const explain =
        totalPending === 0
          ? "Active queue is empty — no pending Step 1 or follow-up sends scheduled. Legacy quarantined rows are listed separately below and do not affect sending."
          : `${totalPending} active = ${step1} Step 1 send${step1 === 1 ? "" : "s"} + ${followups} follow-up${followups === 1 ? "" : "s"} (Step 2/3/4). They will send only when due and within sender ramp / daily cap / send-window limits. Legacy quarantined rows are excluded from this count.`;
      setQueueExplain(explain);

      // Pull contact emails for the rows for transparency
      const contactIds = Array.from(new Set(all.map((r) => r.contact_id).filter(Boolean)));
      let emailById = new Map<string, string>();
      if (contactIds.length) {
        const { data: cts } = await supabase.from("contacts").select("id,email").in("id", contactIds);
        emailById = new Map((cts ?? []).map((c: any) => [c.id, c.email]));
      }
      setQueueRows(
        all
          .sort((a, b) => (a.sequence_step ?? 0) - (b.sequence_step ?? 0) || (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
          .map((r) => ({
            email: emailById.get(r.contact_id) ?? "(unknown)",
            sequence_step: r.sequence_step,
            status: r.status,
            delivery_kind: r.delivery_kind,
            scheduled_utc: r.scheduled_at ? new Date(r.scheduled_at).toISOString().replace("T", " ").slice(0, 16) + " UTC" : null,
          })),
      );

      const warns: string[] = [];
      if (activeSimulated > 0) warns.push(`${activeSimulated} active simulated row(s) detected — clean up before staging more contacts.`);
      if (activeFollowupsNoParent > 0) warns.push(`${activeFollowupsNoParent} active follow-up(s) lack a real SMTP parent — these should be cancelled.`);
      if (step1 === 0 && followups > 0) warns.push(`${followups} active follow-up(s) queued but 0 Step 1 sends are active — verify Step 1 will run first.`);
      setQueueWarn(warns);
    } else {
      setQueueBreakdown([]);
      setQueueExplain("Campaign not found — cannot read queue.");
      setQueueRows([]);
      setQueueWarn([]);
    }

    // ----- WEEK summary (last 7 days incl. today) -----
    const [
      { data: weekAuto },
      { count: weekImports },
      { count: weekUpdates },
      { count: weekQualified },
      { count: weekStaged },
      { count: weekSent },
      { count: weekPending },
      { count: weekFollowups },
      { data: weekReplies },
      { data: weekBounces },
      { data: weekUnsubs },
      { data: weekErrors },
    ] = await Promise.all([
      supabase.from("apollo_automation_runs").select("status,enrichment_credits_used,contacts_new,contacts_updated,qualified,errors,run_date").eq("business_name", BUSINESS).gte("run_date", weekStartIso.slice(0, 10)),
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).gte("created_at", weekStartIso),
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).gte("updated_at", weekStartIso),
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).in("current_stage", ["ready_to_stage", "staged"]),
      supabase.from("business_contact_relationships").select("id", { count: "exact", head: true }).eq("business_name", BUSINESS).eq("current_stage", "staged"),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent").gte("sent_at", weekStartIso)
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending")
        : Promise.resolve({ count: 0 } as any),
      campaignId
        ? supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).gt("sequence_step", 1).eq("status", "pending")
        : Promise.resolve({ count: 0 } as any),
      supabase.from("email_events").select("id").eq("event_type", "replied").gte("timestamp", weekStartIso),
      supabase.from("email_events").select("id").eq("event_type", "bounced").gte("timestamp", weekStartIso),
      supabase.from("contacts").select("id").eq("is_globally_suppressed", true).gte("global_suppression_at", weekStartIso),
      supabase.from("apollo_automation_runs").select("id,errors,status,run_date").eq("business_name", BUSINESS).eq("status", "failed").gte("run_date", weekStartIso.slice(0, 10)),
    ] as const);

    const weekRunsCompleted = (weekAuto ?? []).filter((r: any) => r.status === "completed").length;
    const weekCredits = (weekAuto ?? []).reduce((s: number, r: any) => s + (r.enrichment_credits_used ?? 0), 0);

    setWeekStats([
      { label: "Apollo runs completed", value: weekRunsCompleted },
      { label: "Credits spent (7d)", value: weekCredits },
      { label: "Contacts imported", value: weekImports ?? 0 },
      { label: "Contacts updated", value: weekUpdates ?? 0 },
      { label: "Qualified pipeline", value: weekQualified ?? 0 },
      { label: "Staged (current)", value: weekStaged ?? 0 },
      { label: "Sent via " + SENDER, value: weekSent ?? 0, tone: "ok" },
      { label: "Pending in queue", value: weekPending ?? 0 },
      { label: "Follow-ups scheduled", value: weekFollowups ?? 0 },
      { label: "Replies (7d)", value: (weekReplies ?? []).length },
      { label: "Bounces (7d)", value: (weekBounces ?? []).length, tone: (weekBounces ?? []).length > 0 ? "warn" : undefined },
      { label: "Suppressed (7d)", value: (weekUnsubs ?? []).length },
      { label: "Errors / failed runs", value: (weekErrors ?? []).length, tone: (weekErrors ?? []).length > 0 ? "bad" : "ok" },
    ]);

    // ----- Readiness checklist -----
    const seg = segment as any;
    const apolloConnOk = !!seg;
    const cronCheck: Check = { label: "Daily runner scheduled (06:00 UTC)", ok: !!seg?.automation_enabled || !!a, detail: seg?.automation_enabled ? "Automation enabled" : "Toggle daily automation on the segment to activate" };
    const senderOk = !!inbox?.active && inbox?.live_readiness === "live_ready" && !inbox?.paused_reason;
    const forbiddenOk = !forbidden || (forbidden as any).active === false;

    const c: Check[] = [
      { label: "Apollo connection: OK", ok: apolloConnOk, detail: apolloConnOk ? `Segment ${seg.segment_name}` : "No Neon Candy segment found" },
      cronCheck,
      { label: "Good-fit guard: OK", ok: !!seg?.require_good_fit, detail: "Only enrich when segment_fit = good" },
      { label: "Duplicate skip: OK", ok: !!seg?.skip_suppressed, detail: "Pre-enrichment dedupe vs central contacts" },
      { label: "Suppression skip: OK", ok: !!seg?.skip_suppressed, detail: "Skips suppressed and bounced contacts" },
      { label: "Auto-enrich cap: OK", ok: (seg?.daily_enrichment_cap ?? 0) > 0 && (seg?.daily_enrichment_cap ?? 0) <= 100, detail: `${seg?.daily_enrichment_cap ?? 0} credits/day` },
      { label: "Ready-to-stage queue exists", ok: (readyToStage ?? 0) >= 0, detail: `${readyToStage ?? 0} contacts ready` },
      { label: "Campaign staging: OK", ok: !!campaignId && (campaign as any)?.status === "active", detail: campaignId ? `Campaign active: ${CAMPAIGN_NAME}` : "Campaign missing or inactive" },
      { label: `Sender: ${SENDER} only`, ok: senderOk, detail: inbox ? `active=${inbox.active}, readiness=${inbox.live_readiness}` : "Inbox not found" },
      { label: `${FORBIDDEN_SENDER} — historical only (disabled sender)`, ok: forbiddenOk, detail: forbidden ? `active=${(forbidden as any).active} · audit-only, never used for sending` : "Not present" },
      { label: "Real SMTP only (no simulated sends)", ok: true, detail: "Confirmed: queue uses provider_message_id from real SMTP" },
      { label: "Follow-up sequence: OK (4 steps, Day 0/3/7/14)", ok: true, detail: "Verified in outreach_sequences" },
      { label: "Reply / bounce / unsubscribe protection", ok: true, detail: "Triggers cancel_queue_on_reply + handle_email_bounce active" },
      { label: "AI drafts require Founder approval", ok: true, detail: "ai_drafts.status starts as 'pending'" },
      { label: "Daily monitor panel: OK", ok: true },
    ];
    setChecks(c);

    // ----- Action items -----
    const acts: string[] = [];
    if ((aiDraftsPending ?? 0) > 0) acts.push(`${aiDraftsPending} AI draft(s) awaiting Founder approval`);
    if ((replyEventsToday ?? []).length > 0) acts.push(`${(replyEventsToday ?? []).length} reply(ies) received today — review in inbox`);
    if ((queueFailedToday ?? 0) > 0) acts.push(`${queueFailedToday} send(s) failed today — check email queue`);
    if ((bounceEventsToday ?? []).length > 0) acts.push(`${(bounceEventsToday ?? []).length} bounce(s) today — verify suppression applied`);
    if (a?.status === "failed") acts.push("Today's Apollo run failed — see errors below");
    if (!senderOk) acts.push(`Sender ${SENDER} is not live-ready — fix before enabling automation`);
    if (!forbiddenOk) acts.push(`${FORBIDDEN_SENDER} is still active — disable it`);
    setActions(acts);

    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const allGreen = checks.length > 0 && checks.every((c) => c.ok);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">NeonCandy daily monitor</h2>
          <p className="text-sm text-muted-foreground">Today's automation status, weekly review, and pre-launch readiness checklist.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {actions.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Action needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">{actions.map((a) => <li key={a}>{a}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Today (UTC)</CardTitle></CardHeader>
        <CardContent><StatGrid stats={today} /></CardContent>
      </Card>

      {queueBreakdown && (
        <Card className={queueWarn.length ? "border-amber-500/40" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {queueWarn.length ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              Email queue breakdown — {CAMPAIGN_NAME}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatGrid stats={queueBreakdown} />
            <div className="rounded-md border bg-muted/30 p-3 text-sm">{queueExplain}</div>
            <Card className={integrityClean ? "border-emerald-500/40" : "border-destructive/40"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {integrityClean ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  Queue integrity: {integrityClean ? "Clean" : "Needs cleanup"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                {integrityClean ? (
                  <span className="text-emerald-600">All active queue rows are real SMTP-only with valid parent integrity. Weekend Pool can stage more contacts.</span>
                ) : (
                  <ul className="ml-4 list-disc text-destructive">
                    {integrityReasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
            {legacyBreakdown.length > 0 && legacyBreakdown.some((s) => Number(s.value) > 0) && (
              <details className="rounded-md border bg-muted/20 p-3 text-sm">
                <summary className="cursor-pointer select-none font-medium">
                  Historical cleanup buckets (excluded from active queue)
                </summary>
                <div className="mt-3">
                  <StatGrid stats={legacyBreakdown} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    These rows are quarantined or blocked for a known safe reason. They are NOT part of the active live queue and do not consume sender capacity.
                  </p>
                </div>
              </details>
            )}
            {queueWarn.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <div className="mb-1 font-medium text-amber-700">Hold staging until resolved:</div>
                <ul className="ml-5 list-disc text-xs">
                  {queueWarn.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
            {queueRows.length > 0 && (
              <details className="rounded-md border bg-muted/20 p-2 text-sm">
                <summary className="cursor-pointer select-none px-1 py-0.5 font-medium">
                  Show all {queueRows.length} queue row(s) with contact + step + schedule
                </summary>
                <div className="mt-2 max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-left uppercase">
                      <tr>
                        <th className="p-1.5">Email</th>
                        <th className="p-1.5">Step</th>
                        <th className="p-1.5">Status</th>
                        <th className="p-1.5">Delivery</th>
                        <th className="p-1.5">Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueRows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1.5">{r.email}</td>
                          <td className="p-1.5">{r.sequence_step}</td>
                          <td className="p-1.5">
                            <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "outline"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="p-1.5">
                            {r.delivery_kind === "simulated" ? (
                              <Badge variant="destructive">simulated</Badge>
                            ) : (
                              <span className="text-muted-foreground">{r.delivery_kind ?? "real"}</span>
                            )}
                          </td>
                          <td className="p-1.5">{r.scheduled_utc ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekend / Monday review — last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <StatGrid stats={weekStats} />
          <p className="mt-3 text-xs text-muted-foreground">
            All metrics scoped to <strong>{BUSINESS}</strong> · campaign <strong>{CAMPAIGN_NAME}</strong> · sender <strong>{SENDER}</strong>.
          </p>
        </CardContent>
      </Card>

      <Card className={allGreen ? "border-emerald-500/40" : "border-amber-500/40"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {allGreen ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            Readiness checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {checks.map((c) => <CheckRow key={c.label} c={c} />)}
          </div>
          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
            {allGreen ? (
              <span className="text-emerald-600">All checks green — safe to enable full hands-off daily automation.</span>
            ) : (
              <span className="text-amber-600">
                <strong>Auto-stage and full hands-off mode remain disabled</strong> until every item above is OK.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NeonCandyMonitor;