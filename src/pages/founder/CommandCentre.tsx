import { useMemo } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import LiftorCapabilities from "@/components/founder/LiftorCapabilities";
import AgentOrchestration from "@/components/founder/AgentOrchestration";
import SystemModeBanner from "@/components/founder/SystemModeBanner";
import ControlledProofSend from "@/components/founder/ControlledProofSend";
import ControlledLiveBatch from "@/components/founder/ControlledLiveBatch";
import ExecutionStatusPanel from "@/components/founder/ExecutionStatusPanel";
import LeadQualityPanel from "@/components/founder/LeadQualityPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2, Bot, Send, Mail, Inbox as InboxIcon, MessageSquare, FileSignature,
  Search, Banknote, ShieldCheck, Workflow as WorkflowIcon, Phone, AlertTriangle,
  CheckCircle2, Clock, ArrowRight, Sparkles, Activity, TrendingUp, Users, FlaskConical,
} from "lucide-react";

const StatTile = ({ label, value, icon: Icon, tone = "default", to }: any) => {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-yellow-400" :
    tone === "good" ? "text-green-400" : "text-primary";
  const inner = (
    <Card className="bg-card border-border/50 h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon size={16} className={toneCls} />
          {to && <ArrowRight size={12} className="text-muted-foreground" />}
        </div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const Section = ({ title, icon: Icon, action, children }: any) => (
  <Card className="bg-card border-border/50">
    <CardHeader className="flex flex-row items-center justify-between pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon size={16} className="text-primary" /> {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const CommandCentre = () => {
  // Businesses
  const { data: businesses = [] } = useQuery({
    queryKey: ["cc2-businesses"],
    queryFn: async () => (await supabase.from("businesses").select("*").order("name")).data ?? [],
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["cc2-contacts"],
    queryFn: async () => (await supabase.from("contacts").select("id,assigned_business,status,intent_score,last_replied_at,conversation_active").neq("status", "INTERNAL")).data ?? [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["cc2-campaigns"],
    queryFn: async () => (await supabase.from("outreach_campaigns").select("*").order("updated_at", { ascending: false })).data ?? [],
  });
  const { data: queue = [] } = useQuery({
    queryKey: ["cc2-queue"],
    queryFn: async () => (await supabase.from("email_queue").select("id,status,business_name,campaign_id,scheduled_at,block_reason,send_error,delivery_kind,sent_at,sequence_step").order("scheduled_at", { ascending: true }).limit(1000)).data ?? [],
    refetchInterval: 30000,
  });
  const { data: inboxes = [] } = useQuery({
    queryKey: ["cc2-inboxes"],
    queryFn: async () => (await supabase.from("inboxes").select("*")).data ?? [],
  });
  const { data: activeInboxes = [] } = useQuery({
    queryKey: ["cc2-active-inboxes-view"],
    queryFn: async () => (await (supabase as any).from("command_centre_active_inboxes").select("*")).data ?? [],
  });
  const { data: leadQualityCounts } = useQuery({
    queryKey: ["cc2-lead-quality-counts"],
    queryFn: async () => {
      const [needsVer, raw, promoted, shortlist] = await Promise.all([
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "needs_verification"),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "raw"),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).not("promoted_contact_id", "is", null),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "needs_verification").contains("risk_flags", ["needs_apollo_unlock"]),
      ]);
      return {
        needsVerification: needsVer.count ?? 0,
        raw: raw.count ?? 0,
        promoted: promoted.count ?? 0,
        unlockShortlist: shortlist.count ?? 0,
      };
    },
    refetchInterval: 60000,
  });
  const { data: drafts = [] } = useQuery({
    queryKey: ["cc2-drafts"],
    queryFn: async () => (await supabase.from("ai_drafts").select("id,status,classification,created_at,contact_id,inbox_id").eq("status", "pending").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const { data: proposals = [] } = useQuery({
    queryKey: ["cc2-internal-proposals"],
    queryFn: async () => (await supabase.from("internal_proposals").select("id,title,status,business_name,created_at").eq("status", "draft").order("created_at", { ascending: false }).limit(15)).data ?? [],
  });
  const { data: hotConvos = [] } = useQuery({
    queryKey: ["cc2-hot"],
    queryFn: async () => (await supabase.from("conversations").select("id,contact_id,business_name,status,last_message_at,escalation_pending,escalation_reason,intent_score").or("escalation_pending.eq.true,status.eq.escalated").order("last_message_at", { ascending: false }).limit(15)).data ?? [],
  });
  const { data: highIntent = [] } = useQuery({
    queryKey: ["cc2-high-intent"],
    queryFn: async () => (await supabase.from("high_intent_review_queue").select("*").limit(15)).data ?? [],
  });
  const { data: sysEvents = [] } = useQuery({
    queryKey: ["cc2-events"],
    queryFn: async () => (await supabase.from("system_events").select("*").eq("resolved", false).in("severity", ["critical", "high", "medium"]).order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: 60000,
  });
  const { data: sysCounts } = useQuery({
    queryKey: ["cc2-events-counts"],
    queryFn: async () => {
      const [open, total] = await Promise.all([
        supabase.from("system_events").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("system_events").select("id", { count: "exact", head: true }),
      ]);
      return { open: open.count ?? 0, total: total.count ?? 0 };
    },
    refetchInterval: 60000,
  });
  const { data: systemMode } = useQuery({
    queryKey: ["cc2-system-mode"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "system_mode").maybeSingle();
      return String((data as any)?.value ?? "live").toLowerCase();
    },
  });
  // TEST MODE removed as operational gate — anything other than explicit
  // admin-only "sandbox" is treated as LIVE OPERATING MODE.
  const isLiveMode = systemMode !== "sandbox";
  const { data: events = [] } = useQuery({
    queryKey: ["cc2-email-events"],
    queryFn: async () => (await supabase.from("email_events").select("event_type").gte("timestamp", new Date(Date.now() - 7 * 86400000).toISOString())).data ?? [],
  });
  const { data: deals = [] } = useQuery({
    queryKey: ["cc2-deals"],
    queryFn: async () => (await supabase.from("deals").select("id,business_name,status,estimated_value_max")).data ?? [],
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["cc2-invoices"],
    queryFn: async () => (await supabase.from("invoices").select("id,business_name,status,due_date")).data ?? [],
  });

  // ===== Aggregations =====
  // SOURCE OF TRUTH (Command Centre):
  //   sent total       = email_queue.status='sent' AND delivery_kind='smtp_real'
  //   sent today       = email_queue.sent_at >= today (smtp_real only)
  //   queued/pending   = email_queue.status='pending'
  //   blocked queue    = email_queue.status='blocked'    (NOT failed, NOT cancelled, NOT system warnings)
  //   failed sends     = email_queue.status='failed'     (real send attempts that errored)
  //   cancelled        = email_queue.status='cancelled'  (orphans/admin-archived; not active blockers)
  //   system warnings  = system_events where resolved=false (separate from queue)
  //   replies          = email_events.event_type='replied' (last 7 days)
  const businessStats = useMemo(() => {
    return businesses.map((b: any) => {
      const bn = b.name;
      const bContacts = contacts.filter((c: any) => c.assigned_business === bn);
      const warm = bContacts.filter((c: any) => (c.intent_score ?? 0) >= 60 || c.status === "ENGAGED" || c.status === "QUALIFIED").length;
      const activeCampaigns = campaigns.filter((c: any) => c.business_name === bn && c.status === "active").length;
      const pendingApprovals =
        drafts.filter((d: any) => bContacts.some((c: any) => c.id === d.contact_id)).length +
        proposals.filter((p: any) => p.business_name === bn).length +
        hotConvos.filter((h: any) => h.business_name === bn).length;
      const bQueue = queue.filter((q: any) => q.business_name === bn);
      const blockedQueue = bQueue.filter((q: any) => q.status === "blocked").length;
      const failedSends = bQueue.filter((q: any) => q.status === "failed").length;
      const systemWarnings = sysEvents.filter((e: any) => e.business_name === bn).length;
      const lastContactReply = bContacts.map((c: any) => c.last_replied_at).filter(Boolean).sort().reverse()[0];
      const lastSend = bQueue.filter((q: any) => q.sent_at).map((q: any) => q.sent_at).sort().reverse()[0];
      let status: "active" | "needs_setup" | "blocked" | "paused" = "needs_setup";
      if (failedSends > 0 || systemWarnings > 0) status = "blocked";
      else if (activeCampaigns > 0 || warm > 0) status = "active";
      else if (bContacts.length > 0) status = "paused";
      return { id: b.id, name: bn, status, contacts: bContacts.length, warm, activeCampaigns, pendingApprovals, blockedQueue, failedSends, systemWarnings, lastContactReply, lastSend };
    });
  }, [businesses, contacts, campaigns, drafts, proposals, hotConvos, sysEvents, queue]);

  const totals = useMemo(() => {
    const isSmtpReal = (q: any) => q.delivery_kind === "smtp_real" || q.delivery_kind == null;
    const sentTotal = queue.filter((q: any) => q.status === "sent" && isSmtpReal(q)).length;
    const sentToday = queue.filter((q: any) => q.status === "sent" && isSmtpReal(q) && q.sent_at && new Date(q.sent_at).toDateString() === new Date().toDateString()).length;
    const pendingQueue = queue.filter((q: any) => q.status === "pending").length;
    const blockedQueue = queue.filter((q: any) => q.status === "blocked").length;
    const failedSends = queue.filter((q: any) => q.status === "failed").length;
    const cancelledQueue = queue.filter((q: any) => q.status === "cancelled").length;
    const orphanArchived = queue.filter((q: any) => q.status === "cancelled" && q.block_reason === "CANCELLED_ORPHAN_SIMULATED_PARENT").length;
    const repliesAll = events.filter((e: any) => e.event_type === "replied").length;
    const opensAll = events.filter((e: any) => e.event_type === "opened").length;
    const clicksAll = events.filter((e: any) => e.event_type === "clicked").length;
    const bouncesAll = events.filter((e: any) => e.event_type === "bounced").length;
    const warmLeads = contacts.filter((c: any) => (c.intent_score ?? 0) >= 60 || c.status === "ENGAGED" || c.status === "QUALIFIED").length;
    const urgentReplies = hotConvos.length;
    const approvalsTotal = drafts.length + proposals.length + hotConvos.length + highIntent.length;
    const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
    const systemWarnings = sysEvents.length;
    // Provider truth: an inbox is ONLY "Capped" while a provider block window
    // is currently in the future. Stale `provider_blocked_reason` values and
    // expired `provider_blocked_until` timestamps must not flip the badge.
    // Internal hourly/daily caps are informational only (handled by the worker).
    const inboxCapped = inboxes.filter((i: any) => {
      if (!i.active) return false;
      const until = i.provider_blocked_until ? new Date(i.provider_blocked_until) : null;
      return !!(until && until > new Date());
    }).length;
    const businessesNeedingAttention = businessStats.filter((b) => b.failedSends > 0 || b.systemWarnings > 0 || b.pendingApprovals > 0).length;
    const systemWarningsOpen = sysCounts?.open ?? sysEvents.length;
    const systemWarningsTotal = sysCounts?.total ?? sysEvents.length;
    return {
      sentTotal, sentToday, pendingQueue, blockedQueue, failedSends, cancelledQueue, orphanArchived,
      repliesAll, opensAll, clicksAll, bouncesAll,
      warmLeads, urgentReplies, approvalsTotal, activeCampaigns,
      systemWarnings, systemWarningsOpen, systemWarningsTotal, inboxCapped, businessesNeedingAttention,
    };
  }, [queue, events, contacts, hotConvos, drafts, proposals, highIntent, campaigns, sysEvents, inboxes, businessStats, sysCounts]);

  // AI workers — mapped to existing data sources, with status derived from real signals
  const workers = useMemo(() => {
    const activeInbox = inboxes.some((i: any) => i.active);
    const inboundOk = inboxes.some((i: any) => i.inbound_polling_enabled || i.inbound_status === "active");
    const orphan = totals.orphanArchived;
    const outreachNext =
      totals.failedSends > 0 ? `Investigate ${totals.failedSends} failed send${totals.failedSends === 1 ? "" : "s"}` :
      (totals.inboxCapped > 0) ? "Wait for inbox provider cap to reset" :
      totals.blockedQueue > 0 ? `Wait for ${totals.blockedQueue} safety-gated contact${totals.blockedQueue === 1 ? "" : "s"} to cool down` :
      totals.pendingQueue > 0 ? "Continue scheduled sends" : "Launch a new campaign";
    return [
      { key: "outreach", name: "Outreach Agent", icon: Send, status: totals.activeCampaigns > 0 ? "active" : activeInbox ? "idle" : "needs_setup",
        recent: `${totals.pendingQueue} queued · ${totals.blockedQueue} blocked · ${totals.failedSends} failed`, pending: totals.pendingQueue, blocked: totals.blockedQueue,
        next: outreachNext, to: "/founder/outreach" },
      { key: "inbox", name: "Inbox Agent", icon: InboxIcon, status: inboundOk ? "active" : "needs_setup",
        recent: `${drafts.length} AI draft${drafts.length === 1 ? "" : "s"} pending · ${totals.repliesAll} replies (7d)`, pending: drafts.length, blocked: 0,
        next: drafts.length ? `Approve ${drafts.length} AI reply draft${drafts.length === 1 ? "" : "s"}` : "Monitor inbound mailboxes", to: "/founder/conversations" },
      { key: "social", name: "Social Agent", icon: MessageSquare, status: "needs_setup", recent: "Not yet configured", pending: 0, blocked: 0,
        next: "Connect a social channel", to: "/founder/integrations" },
      { key: "research", name: "Research Agent", icon: Search, status: highIntent.length ? "active" : "idle",
        recent: `${highIntent.length} high-intent leads flagged`, pending: highIntent.length, blocked: 0,
        next: highIntent.length ? "Review high-intent leads" : "Run lead enrichment", to: "/founder/priority" },
      { key: "proposal", name: "Proposal Agent", icon: FileSignature, status: proposals.length ? "active" : "idle",
        recent: `${proposals.length} proposal drafts`, pending: proposals.length, blocked: 0,
        next: proposals.length ? "Review and send proposals" : "Generate proposal from a deal", to: "/founder/internal-proposals" },
      { key: "crm", name: "CRM Agent", icon: Users, status: contacts.length ? "active" : "needs_setup",
        recent: `${totals.warmLeads} warm leads`, pending: hotConvos.length, blocked: 0,
        next: hotConvos.length ? "Reply to warm conversations" : "Import more leads", to: "/founder/crm" },
      { key: "finance", name: "Finance Agent", icon: Banknote, status: deals.length ? "active" : "idle",
        recent: `${deals.length} deals · ${invoices.length} invoices`, pending: invoices.filter((i: any) => i.status === "overdue").length, blocked: 0,
        next: "Review pipeline & invoices", to: "/founder/finance" },
      { key: "compliance", name: "Compliance Agent", icon: ShieldCheck, status: "idle", recent: "Passive monitoring only", pending: 0, blocked: 0,
        next: "Review compliance events", to: "/founder/compliance" },
      { key: "ops", name: "Ops Agent", icon: WorkflowIcon, status: totals.systemWarningsOpen ? "needs_attention" : "active",
        recent: `System warnings: ${totals.systemWarningsOpen} open / ${totals.systemWarningsTotal} logged total`, pending: 0, blocked: sysEvents.filter((e: any) => e.severity === "critical").length,
        next: totals.systemWarningsOpen ? `Triage ${totals.systemWarningsOpen} open warning${totals.systemWarningsOpen === 1 ? "" : "s"}` : "Run platform diagnostics", to: "/founder/system" },
      { key: "voice", name: "Voice Agent", icon: Phone, status: "needs_setup", recent: "Not yet configured", pending: 0, blocked: 0,
        next: "Connect voice provider", to: "/founder/integrations" },
    ];
  }, [inboxes, totals, drafts, proposals, hotConvos, highIntent, contacts, deals, invoices, sysEvents, isLiveMode]);

  // Blockers in plain English — grouped into 4 buckets
  type BlockerItem = { msg: string; severity: string; to?: string };
  const blockerSections = useMemo(() => {
    const current: BlockerItem[] = [];
    const safetyGates: BlockerItem[] = [];
    const completed: BlockerItem[] = [];
    const observations: BlockerItem[] = [];

    const blockedRows = (queue ?? []).filter((q: any) => q.status === "blocked");
    const cancelledRows = (queue ?? []).filter((q: any) => q.status === "cancelled");
    const orphanArchived = cancelledRows.filter((q: any) => q.block_reason === "CANCELLED_ORPHAN_SIMULATED_PARENT").length;
    if (orphanArchived > 0) {
      completed.push({ msg: `${orphanArchived} orphan follow-up rows archived — no action needed.`, severity: "good", to: "/founder/outreach/queue" });
    }
    // TEST MODE removed as operational gate — no informational TEST blocker emitted.
    const reasonMap: Record<string, { label: string; severity: string; bucket: "current" | "safety" }> = {
      SIMULATED_PARENT_NOT_SENT: { label: "waiting on an earlier sequence step that never sent (legacy/test sim)", severity: "warn", recoverable: true },
      RECENTLY_CONTACTED: { label: "cooling down under the recent-contact rule", severity: "warn", recoverable: true },
      RECENT_COMMUNICATION_24H: { label: "blocked by the 24h re-contact rule", severity: "warn", recoverable: true },
      BLOCKED: { label: "generic block — needs human review", severity: "warn", recoverable: false },
      INBOX_DAILY_LIMIT: { label: "inbox daily limit reached — resumes tomorrow", severity: "warn", recoverable: true },
      NO_ACTIVE_INBOX: { label: "no active inbox available for this business", severity: "danger", recoverable: false },
      CONTACT_SUPPRESSED: { label: "contact is suppressed (bounce / unsubscribe)", severity: "warn", recoverable: false },
      CONTACT_REPLIED: { label: "contact already replied", severity: "warn", recoverable: false },
      CONTACT_BOUNCED: { label: "contact previously bounced", severity: "warn", recoverable: false },
      DO_NOT_CONTACT: { label: "contact marked do-not-contact", severity: "warn", recoverable: false },
    } as any;
    const safetyReasons = new Set(["RECENTLY_CONTACTED", "RECENT_COMMUNICATION_24H", "INBOX_DAILY_LIMIT", "SIMULATED_PARENT_NOT_SENT"]);
    const grouped = blockedRows.reduce((acc: Record<string, number>, r: any) => {
      const k = r.block_reason || "UNKNOWN";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    Object.entries(grouped)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .forEach(([reason, count]) => {
        const meta = (reasonMap as any)[reason] ?? { label: `unmapped reason: ${reason}`, severity: "warn" };
        const bucket = safetyReasons.has(reason) ? safetyGates : current;
        bucket.push({ msg: `${count} contact${count === 1 ? "" : "s"} blocked — ${meta.label}`, severity: meta.severity, to: "/founder/outreach/queue" });
      });
    inboxes.forEach((i: any) => {
      if (!i.active) return;
      if (i.provider_blocked_until && new Date(i.provider_blocked_until) > new Date()) {
        current.push({ msg: `${i.email_address}: provider daily limit reached (${i.paused_reason ?? i.provider_blocked_reason ?? "throttled"}) — resumes ${format(new Date(i.provider_blocked_until), "dd MMM HH:mm")}`, severity: "warn", to: "/founder/sending" });
      }
      // Internal hourly/daily caps are informational only (cap blocking removed for activation).
      if (i.provider_blocked_reason && !i.provider_blocked_until) {
        current.push({ msg: `${i.email_address}: capped by email provider (${i.provider_blocked_reason}). Pending sends will resume on the next provider window.`, severity: "warn", to: "/founder/sending" });
      }
      if ((i.reputation_score ?? 100) < 40) current.push({ msg: `${i.email_address}: low inbox reputation (${i.reputation_score})`, severity: "warn", to: "/founder/sending" });
      if (i.last_test_send_status === "failed") current.push({ msg: `${i.email_address}: last test send failed — ${i.last_error_message ?? "see logs"}`, severity: "danger", to: `/founder/crm/inboxes/${i.id}/configure` });
      if (i.warmup_status === "not_started") current.push({ msg: `${i.email_address}: warmup not started`, severity: "warn", to: "/founder/crm/inboxes" });
      if (!i.inbound_polling_enabled && i.inbound_status !== "active") current.push({ msg: `${i.email_address}: inbound polling not configured — replies may be missed`, severity: "warn", to: `/founder/crm/inboxes/${i.id}/configure` });
    });
    campaigns.filter((c: any) => c.status === "active").forEach((c: any) => {
      const hasInbox = inboxes.some((i: any) => i.business_name === c.business_name && i.active);
      if (!hasInbox) current.push({ msg: `Campaign "${c.campaign_name}" (${c.business_name}) has no active sender inbox`, severity: "danger", to: "/founder/outreach/campaigns" });
    });
    // Group system events: campaign-performance observations vs other warnings
    const campaignPerfRe = /Campaign\s+"([^"]+)"\s+has\s+(\d+)\s+sends?\s+and\s+(\d+)\s+repl/i;
    const campaignPerf: Record<string, { campaign: string; sends: number; replies: number; events: number; business_name?: string }> = {};
    const otherGrouped: Record<string, { count: number; severity: string; business_name?: string }> = {};
    sysEvents.forEach((e: any) => {
      const m = (e.message ?? "").match(campaignPerfRe);
      if (m) {
        const [, name, sends, replies] = m;
        const key = `${e.business_name ?? ""}|${name}`;
        const existing = campaignPerf[key];
        const sendsN = Number(sends);
        const repliesN = Number(replies);
        if (!existing) campaignPerf[key] = { campaign: name, sends: sendsN, replies: repliesN, events: 1, business_name: e.business_name };
        else { existing.events += 1; if (sendsN > existing.sends) { existing.sends = sendsN; existing.replies = repliesN; } }
      } else {
        const key = `${e.business_name ?? ""}|${e.message ?? ""}`;
        if (!otherGrouped[key]) otherGrouped[key] = { count: 0, severity: e.severity, business_name: e.business_name };
        otherGrouped[key].count += 1;
        if (e.severity === "critical") otherGrouped[key].severity = "critical";
      }
    });
    Object.values(campaignPerf).forEach((p) => {
      observations.push({
        msg: `Campaign performance observation: ${p.campaign}${p.business_name ? ` (${p.business_name})` : ""} has ${p.sends} real send${p.sends === 1 ? "" : "s"} and ${p.replies} repl${p.replies === 1 ? "y" : "ies"} in current reporting window. Repeated ${p.events} system event${p.events === 1 ? "" : "s"}.`,
        severity: "warn",
        to: "/founder/outreach/campaigns",
      });
    });
    Object.entries(otherGrouped).slice(0, 8).forEach(([key, meta]) => {
      const [, message] = key.split("|");
      const repeated = meta.count > 1 ? ` — repeated ${meta.count} times` : "";
      current.push({
        msg: `${meta.business_name ? `[${meta.business_name}] ` : ""}${message}${repeated}`,
        severity: meta.severity === "critical" ? "danger" : "warn",
        to: "/founder/system",
      });
    });
    return { current, safetyGates, completed, observations };
  }, [inboxes, campaigns, sysEvents, queue, isLiveMode]);

  const allDangerBlockers = useMemo(
    () => [...blockerSections.current, ...blockerSections.observations].filter((b) => b.severity === "danger"),
    [blockerSections]
  );

  // Recommended actions — only LIVE actions; completed repairs live in blockers panel
  const recommendations = useMemo(() => {
    const recs: { msg: string; to: string; tone: string }[] = [];
    if (totals.urgentReplies) recs.push({ msg: `Review ${totals.urgentReplies} warm reply${totals.urgentReplies === 1 ? "" : "s"}`, to: "/founder/conversations", tone: "primary" });
    if (drafts.length) recs.push({ msg: `Approve ${drafts.length} AI reply draft${drafts.length === 1 ? "" : "s"}`, to: "/founder/conversations", tone: "primary" });
    if (proposals.length) recs.push({ msg: `Send ${proposals.length} ready proposal${proposals.length === 1 ? "" : "s"}`, to: "/founder/internal-proposals", tone: "primary" });
    if (highIntent.length) recs.push({ msg: `Action ${highIntent.length} high-intent lead${highIntent.length === 1 ? "" : "s"}`, to: "/founder/priority", tone: "primary" });
    const genericBlocked = (queue ?? []).filter((q: any) => q.status === "blocked" && q.block_reason === "BLOCKED").length;
    if (genericBlocked > 0) recs.push({ msg: `Review ${genericBlocked} generic blocked contact${genericBlocked === 1 ? "" : "s"}`, to: "/founder/outreach/queue", tone: "warn" });
    const safetyGated = (queue ?? []).filter((q: any) => q.status === "blocked" && (q.block_reason === "RECENTLY_CONTACTED" || q.block_reason === "RECENT_COMMUNICATION_24H")).length;
    if (safetyGated > 0) recs.push({ msg: `Wait for ${safetyGated} safety-gated contact${safetyGated === 1 ? "" : "s"} to cool down`, to: "/founder/outreach/queue", tone: "default" });
    if (totals.failedSends > 0) recs.push({ msg: `Investigate ${totals.failedSends} failed send${totals.failedSends === 1 ? "" : "s"}`, to: "/founder/outreach/queue", tone: "danger" });
    if (totals.inboxCapped > 0) recs.push({ msg: `Wait for inbox provider cap to reset before sending queued emails`, to: "/founder/sending", tone: "warn" });
    if (totals.activeCampaigns > 0 && totals.repliesAll === 0 && totals.sentTotal > 0) recs.push({ msg: "Review campaign performance — reply rate is zero across the reporting window", to: "/founder/outreach/campaigns", tone: "warn" });
    allDangerBlockers.slice(0, 2).forEach((b) => recs.push({ msg: `Fix: ${b.msg}`, to: b.to ?? "/founder/system", tone: "danger" }));
    businessStats.filter((b) => b.contacts === 0).slice(0, 2).forEach((b) => recs.push({ msg: `Import leads for ${b.name}`, to: "/founder/outreach/imports", tone: "default" }));
    if (recs.length === 0) recs.push({ msg: "Nothing urgent — review weekly results pack", to: "/founder/analytics", tone: "good" });
    return recs.slice(0, 8);
  }, [totals, drafts, proposals, highIntent, allDangerBlockers, businessStats, queue, isLiveMode]);

  const businessStatusColor = (s: string) =>
    s === "active" ? "bg-green-500/20 text-green-400" :
    s === "blocked" ? "bg-destructive/20 text-destructive" :
    s === "paused" ? "bg-yellow-500/20 text-yellow-400" :
    "bg-muted text-muted-foreground";

  const workerStatusColor = (s: string) =>
    s === "active" ? "bg-green-500/20 text-green-400" :
    s === "needs_setup" ? "bg-muted text-muted-foreground" :
    s === "needs_attention" ? "bg-destructive/20 text-destructive" :
    "bg-yellow-500/20 text-yellow-400";

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Founder Command Centre</h1>
            <p className="text-muted-foreground text-sm mt-1">One cockpit for every Liftor business — what's happening, what needs you, what's blocked.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/founder/copilot"><Button size="sm" variant="outline"><Sparkles size={14} /> Co-Pilot</Button></Link>
            <Link to="/founder/testing"><Button size="sm" variant="outline"><FlaskConical size={14} /> Diagnostics</Button></Link>
          </div>
        </div>

        <SystemModeBanner />

        <ExecutionStatusPanel />

        <ControlledProofSend />

        <ControlledLiveBatch />

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Cadence integrity:</span>{" "}
          Cadence paused when prior step is blocked. Downstream steps will not be
          created until the prior step is successfully sent (real SMTP, accepted,
          with a provider message ID).
        </div>

        {activeInboxes.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Active sender identity</p>
            <div className="flex flex-wrap gap-2">
              {activeInboxes.map((i: any) => (
                <Badge key={i.id} variant="secondary" className={`text-xs ${i.status_label === "ok" ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                  {i.from_name ? `${i.from_name} · ` : ""}{i.email_address} <span className="text-muted-foreground ml-1">({i.business_name})</span>
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Outbound sends use these inboxes only. Founder/internal addresses (e.g. mandyking308@gmail.com) are suppressed from prospect flows.</p>
          </div>
        )}

        <LeadQualityPanel />

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="orchestration">Agent Orchestration</TabsTrigger>
            <TabsTrigger value="capabilities">Liftor Capabilities</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="space-y-6 mt-0">
        {/* 1. Today across all businesses */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatTile label="Active businesses" value={businesses.length} icon={Building2} to="/founder/organisations" />
          <StatTile label="Need attention" value={totals.businessesNeedingAttention} icon={AlertTriangle} tone={totals.businessesNeedingAttention ? "warn" : "good"} />
          <StatTile label="Urgent replies" value={totals.urgentReplies} icon={MessageSquare} tone={totals.urgentReplies ? "warn" : "good"} to="/founder/conversations" />
          <StatTile label="Approvals waiting" value={totals.approvalsTotal} icon={CheckCircle2} tone={totals.approvalsTotal ? "warn" : "good"} />
          <StatTile label="Active campaigns" value={totals.activeCampaigns} icon={Send} to="/founder/outreach/campaigns" />
          <StatTile label="Warm leads (intent ≥60 / engaged)" value={totals.warmLeads} icon={TrendingUp} to="/founder/priority" />
          <StatTile label="Sent today" value={totals.sentToday} icon={Mail} tone="good" to="/founder/sending" />
          <StatTile label="Sent (total)" value={totals.sentTotal} icon={CheckCircle2} tone="good" to="/founder/sending" />
          <StatTile label="Queued" value={totals.pendingQueue} icon={Clock} to="/founder/outreach/queue" />
          <StatTile label="Blocked queue" value={totals.blockedQueue} icon={Clock} tone={totals.blockedQueue ? "warn" : "good"} to="/founder/outreach/queue" />
          <StatTile label="Failed sends" value={totals.failedSends} icon={AlertTriangle} tone={totals.failedSends ? "danger" : "good"} to="/founder/outreach/queue" />
          <StatTile label={`System warnings (open / logged)`} value={`${totals.systemWarningsOpen} / ${totals.systemWarningsTotal}`} icon={AlertTriangle} tone={totals.systemWarningsOpen ? "danger" : "good"} to="/founder/system" />
          <StatTile label="Open deals" value={deals.filter((d: any) => d.status !== "won" && d.status !== "lost").length} icon={Banknote} to="/founder/finance" />
          <StatTile label="Raw leads needing verification" value={leadQualityCounts?.needsVerification ?? 0} icon={Search} tone={(leadQualityCounts?.needsVerification ?? 0) > 0 ? "warn" : "good"} />
          <StatTile label="Apollo unlock shortlist" value={leadQualityCounts?.unlockShortlist ?? 0} icon={Sparkles} tone={(leadQualityCounts?.unlockShortlist ?? 0) > 0 ? "warn" : "default"} />
          <StatTile label="Leads promoted to contacts" value={leadQualityCounts?.promoted ?? 0} icon={CheckCircle2} tone="good" />
        </div>

        {/* 8. Recommended Actions */}
        <Section title="What should you do today?" icon={Sparkles}>
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {recommendations.map((r, idx) => (
                <Link key={idx} to={r.to} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <span className="text-sm">{r.msg}</span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* 2. Business overview */}
        <Section title="Businesses" icon={Building2} action={<Link to="/founder/organisations"><Button size="sm" variant="ghost">Manage <ArrowRight size={12} /></Button></Link>}>
          {businessStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses yet. <Link to="/founder/organisations" className="text-primary">Create one →</Link></p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {businessStats.map((b) => (
                <div key={b.id} className="p-4 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.lastSend ? `Last send ${formatDistanceToNow(new Date(b.lastSend), { addSuffix: true })}` :
                         b.lastContactReply ? `Last reply ${formatDistanceToNow(new Date(b.lastContactReply), { addSuffix: true })}` :
                         "No send activity yet"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${businessStatusColor(b.status)}`}>{b.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-[11px] mb-3">
                    <div><p className="font-semibold text-base">{b.activeCampaigns}</p><p className="text-muted-foreground">Camp.</p></div>
                    <div><p className="font-semibold text-base">{b.warm}</p><p className="text-muted-foreground">Warm</p></div>
                    <div><p className={`font-semibold text-base ${b.pendingApprovals ? "text-yellow-400" : ""}`}>{b.pendingApprovals}</p><p className="text-muted-foreground">Approve</p></div>
                    <div><p className={`font-semibold text-base ${b.blockedQueue ? "text-yellow-400" : ""}`}>{b.blockedQueue}</p><p className="text-muted-foreground">Blocked</p></div>
                    <div><p className={`font-semibold text-base ${(b.failedSends + b.systemWarnings) ? "text-destructive" : ""}`}>{b.failedSends + b.systemWarnings}</p><p className="text-muted-foreground">Issues</p></div>
                  </div>
                  <Link to={`/founder/organisations`}><Button size="sm" variant="outline" className="w-full">Open workspace</Button></Link>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 3. AI Worker Activity */}
        <Section title="AI Workers" icon={Bot}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {workers.map((w) => (
              <Link key={w.key} to={w.to} className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors block">
                <div className="flex items-center justify-between mb-2">
                  <w.icon size={16} className="text-primary" />
                  <Badge variant="secondary" className={`text-[10px] ${workerStatusColor(w.status)}`}>{w.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.recent}</p>
                <p className="text-xs mt-2 text-foreground/80 line-clamp-2"><span className="text-muted-foreground">Next:</span> {w.next}</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* 4. Approvals + 5. Campaign snapshot */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Approvals snapshot" icon={CheckCircle2} action={<Link to="/founder/conversations"><Button size="sm" variant="ghost">All <ArrowRight size={12} /></Button></Link>}>
            {totals.approvalsTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No items waiting for approval.</p>
            ) : (
              <div className="space-y-2">
                {drafts.slice(0, 4).map((d: any) => (
                  <Link key={d.id} to="/founder/conversations" className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                    <div><span className="text-muted-foreground text-xs">AI draft · </span>{d.classification ?? "reply"}</div>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                  </Link>
                ))}
                {proposals.slice(0, 3).map((p: any) => (
                  <Link key={p.id} to={`/founder/internal-proposals`} className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                    <div><span className="text-muted-foreground text-xs">Proposal · </span>{p.title} <span className="text-xs text-muted-foreground">({p.business_name})</span></div>
                    <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                  </Link>
                ))}
                {hotConvos.slice(0, 3).map((h: any) => (
                  <Link key={h.id} to={`/founder/conversations/${h.id}`} className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                    <div><span className="text-muted-foreground text-xs">Escalation · </span>{h.escalation_reason ?? "needs review"}</div>
                    <span className="text-xs text-muted-foreground">{h.business_name}</span>
                  </Link>
                ))}
                {highIntent.slice(0, 3).map((h: any) => (
                  <Link key={h.contact_id} to={`/founder/crm/contacts/${h.contact_id}`} className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                    <div><span className="text-muted-foreground text-xs">High-intent · </span>{h.name ?? h.email}</div>
                    <Badge variant="secondary" className="text-[10px]">score {h.intent_score ?? "—"}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Campaign snapshot" icon={Send} action={<Link to="/founder/outreach/live-monitor"><Button size="sm" variant="ghost">Live <ArrowRight size={12} /></Button></Link>}>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.activeCampaigns}</p><p className="text-muted-foreground">Active campaigns</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.sentTotal}</p><p className="text-muted-foreground">Sent total</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.sentToday}</p><p className="text-muted-foreground">Sent today</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.pendingQueue}</p><p className="text-muted-foreground">Queued</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.blockedQueue ? "text-yellow-400" : ""}`}>{totals.blockedQueue}</p><p className="text-muted-foreground">Blocked</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.failedSends ? "text-destructive" : ""}`}>{totals.failedSends}</p><p className="text-muted-foreground">Failed</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.repliesAll}</p><p className="text-muted-foreground">Replies (7d)</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{drafts.length}</p><p className="text-muted-foreground">AI drafts</p></div>
              <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.inboxCapped ? "text-yellow-400" : "text-green-400"}`}>{totals.inboxCapped ? "Capped" : "OK"}</p><p className="text-muted-foreground">Inbox cap</p></div>
            </div>
            <div className="space-y-2">
              {campaigns.filter((c: any) => c.status === "active").slice(0, 4).map((c: any) => (
                <Link key={c.id} to="/founder/outreach/campaigns" className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                  <div>{c.campaign_name} <span className="text-xs text-muted-foreground">· {c.business_name}</span></div>
                  <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-400">{c.status}</Badge>
                </Link>
              ))}
              {campaigns.filter((c: any) => c.status === "active").length === 0 && (
                <p className="text-xs text-muted-foreground">No active campaigns.</p>
              )}
            </div>
          </Section>
        </div>

        {/* 7. Blockers + 6. Results */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Blockers & truth panel" icon={AlertTriangle} action={<Link to="/founder/system"><Button size="sm" variant="ghost">System <ArrowRight size={12} /></Button></Link>}>
            {(blockerSections.current.length + blockerSections.safetyGates.length + blockerSections.completed.length + blockerSections.observations.length) === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-400"><CheckCircle2 size={14} /> No active blockers.</div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "current", title: "Current blockers", items: blockerSections.current, empty: "No current blockers." },
                  { key: "safety", title: "Safety gates", items: blockerSections.safetyGates, empty: "No safety gates active." },
                  { key: "completed", title: "Completed repairs", items: blockerSections.completed, empty: null },
                  { key: "observations", title: "Campaign observations", items: blockerSections.observations, empty: null },
                ].map((g) => (
                  (g.items.length === 0 && !g.empty) ? null : (
                    <div key={g.key}>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{g.title}</p>
                      {g.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{g.empty}</p>
                      ) : (
                        <div className="space-y-2">
                          {g.items.map((b, idx) => (
                            <Link key={idx} to={b.to ?? "/founder/system"} className={`block p-2.5 rounded text-sm ${b.severity === "danger" ? "bg-destructive/10 border border-destructive/30" : b.severity === "good" ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-yellow-500/5 border border-yellow-500/20"}`}>
                              {b.msg}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </Section>

          <Section title="Results snapshot (7-day)" icon={Activity} action={<Link to="/founder/analytics"><Button size="sm" variant="ghost">Analytics <ArrowRight size={12} /></Button></Link>}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Leads in CRM</p><p className="text-xl font-semibold">{contacts.length}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Sent today</p><p className="text-xl font-semibold">{totals.sentToday}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Sent (total)</p><p className="text-xl font-semibold">{totals.sentTotal}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Queued</p><p className="text-xl font-semibold">{totals.pendingQueue}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Blocked queue</p><p className={`text-xl font-semibold ${totals.blockedQueue ? "text-yellow-400" : ""}`}>{totals.blockedQueue}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Failed sends</p><p className={`text-xl font-semibold ${totals.failedSends ? "text-destructive" : ""}`}>{totals.failedSends}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Replies (7d)</p><p className="text-xl font-semibold">{totals.repliesAll}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">AI drafts pending</p><p className="text-xl font-semibold">{drafts.length}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Proposals in flight</p><p className="text-xl font-semibold">{proposals.length}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Open deals</p><p className="text-xl font-semibold">{deals.filter((d: any) => d.status !== "won" && d.status !== "lost").length}</p></div>
              <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Invoices outstanding</p><p className="text-xl font-semibold">{invoices.filter((i: any) => i.status !== "paid" && i.status !== "void").length}</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Source of truth: <span className="text-foreground/80">email_queue</span> (sent/blocked/failed). Replies from <span className="text-foreground/80">email_events</span>.</p>
          </Section>
        </div>
          </TabsContent>
          <TabsContent value="capabilities" className="mt-0">
            <LiftorCapabilities />
          </TabsContent>
          <TabsContent value="orchestration" className="mt-0">
            <AgentOrchestration />
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default CommandCentre;
