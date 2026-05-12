import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Layers, Users, Send, Mail, MessageSquare, FileSignature, Presentation,
  Banknote, FileText, Truck, CreditCard, ShieldCheck, ArrowRight, Eye,
  AlertTriangle, CheckCircle2, Clock, Activity,
} from "lucide-react";

type Status = "active" | "idle" | "needs_setup" | "blocked" | "dormant";

const statusMeta: Record<Status, { label: string; cls: string; dot: string }> = {
  active:      { label: "Active",      cls: "bg-green-500/15 text-green-400",   dot: "bg-green-400" },
  idle:        { label: "Idle",        cls: "bg-blue-500/15 text-blue-300",     dot: "bg-blue-300" },
  needs_setup: { label: "Needs setup", cls: "bg-yellow-500/15 text-yellow-400", dot: "bg-yellow-400" },
  blocked:     { label: "Blocked",     cls: "bg-destructive/20 text-destructive", dot: "bg-destructive" },
  dormant:     { label: "Dormant",     cls: "bg-zinc-500/15 text-zinc-300",     dot: "bg-zinc-400" },
};

const ago = (iso: string | null) => {
  if (!iso) return "no activity yet";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AgentOrchestration = () => {
  const { data } = useQuery({
    queryKey: ["agent-orchestration-v1"],
    refetchInterval: 60000,
    queryFn: async () => {
      const head = async (table: string, filter?: (q: any) => any) => {
        let q: any = (supabase as any).from(table).select("*", { count: "exact", head: true });
        if (filter) q = filter(q);
        const { count } = await q;
        return count ?? 0;
      };
      const last = async (table: string, col = "created_at", filter?: (q: any) => any) => {
        let q: any = (supabase as any).from(table).select(col).order(col, { ascending: false }).limit(1);
        if (filter) q = filter(q);
        const { data: rows } = await q;
        return rows?.[0]?.[col] ?? null;
      };

      const [
        importedLeads, apolloLeads, contacts, contactsActive,
        campaigns, campaignsActive, queue, queuePending, queueBlocked, queueSentReal,
        liveInboxes, inboundCount, conversationsCount,
        draftsPending, aiActions,
        proposalsTotal, proposalsDraft, demoAccessTotal, demoAccessActive,
        dealsTotal, dealsOpen, dealsWon,
        invoicesTotal, invoicesUnpaid, paymentsTotal,
        suppliersTotal, assignmentsTotal,
        complianceEvents, systemEvents, retryQueue,
      ] = await Promise.all([
        head("imported_leads"),
        head("apollo_leads"),
        head("contacts"),
        head("contacts", (q) => q.eq("status", "active")),
        head("outreach_campaigns"),
        head("outreach_campaigns", (q) => q.eq("status", "active")),
        head("email_queue"),
        head("email_queue", (q) => q.eq("status", "pending")),
        head("email_queue", (q) => q.eq("status", "blocked")),
        head("email_queue", (q) => q.eq("status", "sent").eq("delivery_kind", "smtp_real")),
        head("inboxes", (q) => q.eq("active", true)),
        head("inbound_messages"),
        head("conversations"),
        head("ai_drafts", (q) => q.eq("status", "pending")),
        head("ai_actions"),
        head("internal_proposals"),
        head("internal_proposals", (q) => q.eq("status", "draft")),
        head("demo_access"),
        head("demo_access", (q) => q.eq("status", "active")),
        head("deals"),
        head("deals", (q) => q.not("status", "in", "(won,lost)")),
        head("deals", (q) => q.eq("status", "won")),
        head("invoices"),
        head("invoices", (q) => q.not("status", "in", "(paid,void)")),
        head("payments"),
        head("suppliers"),
        head("assignments"),
        head("compliance_events"),
        head("system_events"),
        head("retry_queue"),
      ]);
      const [systemEventsOpen, retryPending, retryCompleted, aiDraftsTotal, demoNeon] = await Promise.all([
        head("system_events", (q: any) => q.eq("resolved", false)),
        head("retry_queue", (q: any) => q.eq("status", "pending")),
        head("retry_queue", (q: any) => q.eq("status", "completed")),
        head("ai_drafts"),
        head("demo_access", (q: any) => q.eq("business_name", "Neon Candy")),
      ]);

      const [
        lastImport, lastContact, lastCampaign, lastQueueSent, lastInbound,
        lastDraft, lastProposal, lastDemo, lastDeal, lastInvoice, lastPayment,
        lastAssignment, lastCompliance, lastSystem,
      ] = await Promise.all([
        last("imported_leads"),
        last("contacts"),
        last("outreach_campaigns", "updated_at"),
        last("email_queue", "sent_at", (q) => q.eq("status", "sent")),
        last("inbound_messages", "received_at"),
        last("ai_drafts"),
        last("internal_proposals"),
        last("demo_access"),
        last("deals"),
        last("invoices"),
        last("payments"),
        last("assignments"),
        last("compliance_events"),
        last("system_events"),
      ]);

      return {
        counts: {
          importedLeads, apolloLeads, contacts, contactsActive,
          campaigns, campaignsActive, queue, queuePending, queueBlocked, queueSentReal,
          liveInboxes, inboundCount, conversationsCount,
          draftsPending, aiActions, proposalsTotal, proposalsDraft,
          demoAccessTotal, demoAccessActive, dealsTotal, dealsOpen, dealsWon,
          invoicesTotal, invoicesUnpaid, paymentsTotal,
          suppliersTotal, assignmentsTotal,
          complianceEvents, systemEvents, retryQueue,
          systemEventsOpen, retryPending, retryCompleted, aiDraftsTotal, demoNeon,
        },
        last: {
          lastImport, lastContact, lastCampaign, lastQueueSent, lastInbound,
          lastDraft, lastProposal, lastDemo, lastDeal, lastInvoice, lastPayment,
          lastAssignment, lastCompliance, lastSystem,
        },
      };
    },
  });

  const c = data?.counts;
  const t = data?.last;

  // ---------- Lifecycle (chain) ----------
  type Stage = {
    key: string; name: string; agent: string; icon: any; route: string;
    count: number | string; status: Status; recent: string; blocker?: string; next: string;
  };

  const stages: Stage[] = [
    {
      key: "lead-source", name: "Lead Source", agent: "Lead Source Agent", icon: Layers,
      route: "/founder/outreach/imports",
      count: (c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0),
      status: (c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0) > 0 ? "active" : "needs_setup",
      recent: `Last import ${ago(t?.lastImport ?? null)}`,
      next: (c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0) > 0 ? "Run next import / Apollo sync" : "Import a CSV or connect Apollo",
    },
    {
      key: "crm", name: "CRM", agent: "CRM Agent", icon: Users,
      route: "/founder/crm/contacts",
      count: c?.contacts ?? 0,
      status: (c?.contacts ?? 0) > 0 ? "active" : "dormant",
      recent: `Last contact created ${ago(t?.lastContact ?? null)}`,
      next: (c?.contacts ?? 0) > 0 ? "Validate + dedupe + assign business" : "Waiting on Lead Source Agent",
    },
    {
      key: "outreach", name: "Outreach", agent: "Outreach Agent", icon: Send,
      route: "/founder/outreach/campaigns",
      count: c?.queuePending ?? 0,
      status: (c?.campaignsActive ?? 0) > 0 ? "active" : (c?.campaigns ?? 0) > 0 ? "idle" : "dormant",
      recent: `${c?.queueSentReal ?? 0} real sent · ${c?.queuePending ?? 0} pending`,
      blocker: (c?.queueBlocked ?? 0) > 0 ? `${c?.queueBlocked} blocked queue items` : undefined,
      next: (c?.queueBlocked ?? 0) > 0 ? "Review blocked queue" : "Monitor send pace",
    },
    {
      key: "email", name: "Email / Inbox", agent: "Email Agent", icon: Mail,
      route: "/founder/sending",
      count: c?.queueSentReal ?? 0,
      status: (c?.liveInboxes ?? 0) > 0 ? "active" : "needs_setup",
      recent: `Last send ${ago(t?.lastQueueSent ?? null)}`,
      blocker: (c?.liveInboxes ?? 0) === 0 ? "No live inbox configured" : undefined,
      next: (c?.liveInboxes ?? 0) > 0 ? "Watch sending health & cap" : "Configure an inbox",
    },
    {
      key: "inbox", name: "Inbox Replies", agent: "Inbox Agent", icon: MessageSquare,
      route: "/founder/conversations",
      count: c?.inboundCount ?? 0,
      status: (c?.inboundCount ?? 0) > 0 ? "active" : "idle",
      recent: `Last inbound ${ago(t?.lastInbound ?? null)}`,
      next: (c?.inboundCount ?? 0) > 0 ? "Read inbound + stop follow-ups on replies" : "Awaiting first reply",
    },
    {
      key: "conversation", name: "Conversation", agent: "Conversation Agent", icon: MessageSquare,
      route: "/founder/conversations",
      count: c?.draftsPending ?? 0,
      status: (c?.draftsPending ?? 0) > 0 ? "blocked" : (c?.conversationsCount ?? 0) > 0 ? "active" : "idle",
      recent: `Last AI draft ${ago(t?.lastDraft ?? null)}`,
      blocker: (c?.draftsPending ?? 0) > 0 ? `${c?.draftsPending} drafts awaiting approval` : undefined,
      next: (c?.draftsPending ?? 0) > 0 ? `Approve ${c?.draftsPending} AI draft${c?.draftsPending === 1 ? "" : "s"}` : "Monitor inbound",
    },
    {
      key: "proposal", name: "Proposal", agent: "Proposal Agent", icon: FileSignature,
      route: "/founder/internal-proposals",
      count: c?.proposalsTotal ?? 0,
      status: (c?.proposalsDraft ?? 0) > 0 ? "active" : (c?.proposalsTotal ?? 0) > 0 ? "idle" : "dormant",
      recent: `Last proposal ${ago(t?.lastProposal ?? null)}`,
      next: (c?.proposalsDraft ?? 0) > 0 ? "Review proposal drafts" : "No qualified proposal-ready lead yet",
    },
    {
      key: "demo", name: "Demo", agent: "Demo Agent", icon: Presentation,
      route: "/founder/demos",
      count: c?.demoAccessTotal ?? 0,
      status: (c?.demoAccessActive ?? 0) > 0 ? "active" : (c?.demoAccessTotal ?? 0) > 0 ? "idle" : "dormant",
      recent: `Last demo issued ${ago(t?.lastDemo ?? null)}`,
      next: (c?.demoAccessActive ?? 0) > 0 ? "Track demo engagement" : "Issue demo when proposal accepted",
    },
    {
      key: "deal", name: "Deal", agent: "Deal Agent", icon: Banknote,
      route: "/founder/finance/deals",
      count: c?.dealsOpen ?? 0,
      status: (c?.dealsOpen ?? 0) > 0 ? "active" : (c?.dealsTotal ?? 0) > 0 ? "idle" : "dormant",
      recent: `Last deal ${ago(t?.lastDeal ?? null)}`,
      next: (c?.dealsOpen ?? 0) > 0 ? "Move deals forward" : "Awaiting confirmed opportunity",
    },
    {
      key: "finance", name: "Finance / Invoice", agent: "Finance Agent", icon: FileText,
      route: "/founder/finance/invoices",
      count: c?.invoicesUnpaid ?? 0,
      status: (c?.invoicesUnpaid ?? 0) > 0 ? "active" : (c?.dealsWon ?? 0) > 0 ? "needs_setup" : "dormant",
      recent: `Last invoice ${ago(t?.lastInvoice ?? null)}`,
      next: (c?.dealsWon ?? 0) > 0 && (c?.invoicesTotal ?? 0) === 0 ? "Raise invoice for won deal" : (c?.invoicesUnpaid ?? 0) > 0 ? "Chase unpaid invoices" : "Idle until first won deal",
    },
    {
      key: "supplier", name: "Supplier / Assignment", agent: "Supplier Agent", icon: Truck,
      route: "/founder/assignments",
      count: c?.assignmentsTotal ?? 0,
      status: (c?.assignmentsTotal ?? 0) > 0 ? "active" : (c?.suppliersTotal ?? 0) > 0 ? "idle" : "dormant",
      recent: `Last assignment ${ago(t?.lastAssignment ?? null)}`,
      next: (c?.assignmentsTotal ?? 0) > 0 ? "Track delivery progress" : "Idle — no delivery assignment yet",
    },
    {
      key: "payment", name: "Payment", agent: "Payment Agent", icon: CreditCard,
      route: "/founder/finance/payments",
      count: c?.paymentsTotal ?? 0,
      status: (c?.paymentsTotal ?? 0) > 0 ? "active" : (c?.invoicesUnpaid ?? 0) > 0 ? "idle" : "dormant",
      recent: `Last payment ${ago(t?.lastPayment ?? null)}`,
      next: (c?.paymentsTotal ?? 0) > 0 ? "Reconcile payments" : "Awaiting first payment",
    },
    {
      key: "compliance", name: "Compliance / Oversight", agent: "Compliance Agent", icon: ShieldCheck,
      route: "/founder/compliance",
      count: c?.complianceEvents ?? 0,
      status: (c?.complianceEvents ?? 0) > 0 ? "active" : "idle",
      recent: `Last compliance event ${ago(t?.lastCompliance ?? null)}`,
      blocker: (c?.queueBlocked ?? 0) > 0 ? `${c?.queueBlocked} outreach gates active` : undefined,
      next: "Monitor send-safety + policy gates",
    },
  ];

  // ---------- Handoff rules ----------
  const handoffs = [
    ["Lead Source Agent",   "CRM Agent",          "Imports Apollo / CSV → contacts"],
    ["CRM Agent",           "Outreach Agent",     "Validates + assigns business / campaign"],
    ["Outreach Agent",      "Email Agent",        "Queues outbound emails into email_queue"],
    ["Email Agent",         "Inbox Agent",        "Sends via approved inbox; logs email_events"],
    ["Inbox Agent",         "Conversation Agent", "Detects replies; halts follow-ups on contact"],
    ["Conversation Agent",  "Proposal Agent",     "Drafts AI replies; flags qualified leads"],
    ["Proposal Agent",      "Demo Agent",         "Generates proposal for qualified lead"],
    ["Demo Agent",          "Deal Agent",         "Issues demo access; tracks engagement"],
    ["Deal Agent",          "Finance Agent",      "Creates deal when opportunity confirmed"],
    ["Finance Agent",       "Supplier Agent",     "Raises invoice when deal is won"],
    ["Supplier Agent",      "Payment Agent",      "Assigns delivery; signals readiness"],
    ["Payment Agent",       "Compliance Agent",   "Tracks payment receipt + reconciliation"],
    ["Compliance Agent",    "Oversight Agent",    "Checks rules across every stage"],
    ["Oversight Agent",     "Co-Pilot Agent",     "Detects failures + escalates to founder"],
  ];

  // ---------- Cross-agent next actions ----------
  const actions: { msg: string; to: string; tone: "primary" | "warn" | "info" }[] = [];
  if ((c?.draftsPending ?? 0) > 0) actions.push({ msg: `Approve ${c?.draftsPending} Inbox Agent reply draft${c?.draftsPending === 1 ? "" : "s"}`, to: "/founder/conversations", tone: "primary" });
  if ((c?.queueBlocked ?? 0) > 0) actions.push({ msg: `Repair ${c?.queueBlocked} Outreach/Compliance blocked queue items`, to: "/founder/outreach/queue", tone: "warn" });
  if ((c?.liveInboxes ?? 0) > 0 && (c?.queuePending ?? 0) > 0) actions.push({ msg: `${c?.queuePending} pending — wait for inbox cap to reset, do not force send`, to: "/founder/sending", tone: "info" });
  if ((c?.proposalsDraft ?? 0) === 0) actions.push({ msg: "No Proposal Agent action yet — no qualified proposal-ready lead exists", to: "/founder/internal-proposals", tone: "info" });
  if ((c?.dealsWon ?? 0) === 0) actions.push({ msg: "Finance Agent idle — no won deals exist yet", to: "/founder/finance", tone: "info" });
  if ((c?.assignmentsTotal ?? 0) === 0) actions.push({ msg: "Supplier Agent idle — no delivery assignment exists", to: "/founder/assignments", tone: "info" });
  if ((c?.queueBlocked ?? 0) > 0) actions.push({ msg: `Compliance Agent monitoring ${c?.queueBlocked} active outreach gates`, to: "/founder/compliance", tone: "info" });
  actions.push({ msg: "Ops Agent recommends confirming campaign execution before adding more businesses", to: "/founder/outreach/live-monitor", tone: "info" });

  // ---------- Process health ----------
  type Health = { name: string; status: "green" | "amber" | "red"; reason: string; next: string; to: string };
  const health: Health[] = [
    {
      name: "Lead intake",
      status: (c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0) > 0 ? "green" : "amber",
      reason: (c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0) > 0 ? `${(c?.importedLeads ?? 0) + (c?.apolloLeads ?? 0)} leads available` : "No leads imported yet",
      next: "Run next import or Apollo sync",
      to: "/founder/outreach/imports",
    },
    {
      name: "CRM hygiene",
      status: (c?.contacts ?? 0) > 0 ? "green" : "amber",
      reason: `${c?.contacts ?? 0} contacts (${c?.contactsActive ?? 0} active)`,
      next: "Spot-check duplicates + business assignment",
      to: "/founder/crm/contacts",
    },
    {
      name: "Outreach",
      status: (c?.queueBlocked ?? 0) > 5 ? "red" : (c?.queueBlocked ?? 0) > 0 ? "amber" : "green",
      reason: `${c?.queueSentReal ?? 0} sent · ${c?.queuePending ?? 0} pending · ${c?.queueBlocked ?? 0} blocked`,
      next: (c?.queueBlocked ?? 0) > 0 ? "Review blocked queue" : "Monitor pace",
      to: "/founder/outreach/queue",
    },
    {
      name: "Inbox / replies",
      status: (c?.draftsPending ?? 0) > 0 ? "amber" : "green",
      reason: `${c?.inboundCount ?? 0} inbound · ${c?.draftsPending ?? 0} drafts pending`,
      next: (c?.draftsPending ?? 0) > 0 ? "Approve AI drafts" : "Healthy",
      to: "/founder/conversations",
    },
    {
      name: "Proposal",
      status: (c?.proposalsTotal ?? 0) > 0 ? "green" : "amber",
      reason: (c?.proposalsTotal ?? 0) > 0 ? `${c?.proposalsTotal} proposal${c?.proposalsTotal === 1 ? "" : "s"}` : "No proposals generated",
      next: (c?.proposalsDraft ?? 0) > 0 ? "Review drafts" : "Awaiting qualified lead",
      to: "/founder/internal-proposals",
    },
    {
      name: "Demo / deal",
      status: (c?.dealsOpen ?? 0) > 0 ? "green" : "amber",
      reason: `${c?.demoAccessTotal ?? 0} demo accesses · ${c?.dealsOpen ?? 0} open deals · ${c?.dealsWon ?? 0} won`,
      next: (c?.dealsOpen ?? 0) > 0 ? "Move deals forward" : "Awaiting opportunity",
      to: "/founder/finance/deals",
    },
    {
      name: "Finance",
      status: (c?.invoicesUnpaid ?? 0) > 0 ? "amber" : (c?.dealsWon ?? 0) > 0 && (c?.invoicesTotal ?? 0) === 0 ? "red" : "green",
      reason: `${c?.invoicesTotal ?? 0} invoices · ${c?.invoicesUnpaid ?? 0} unpaid · ${c?.paymentsTotal ?? 0} payments`,
      next: (c?.invoicesUnpaid ?? 0) > 0 ? "Chase unpaid" : "Idle",
      to: "/founder/finance",
    },
    {
      name: "Delivery",
      status: (c?.assignmentsTotal ?? 0) > 0 ? "green" : "amber",
      reason: `${c?.suppliersTotal ?? 0} suppliers · ${c?.assignmentsTotal ?? 0} assignments`,
      next: (c?.assignmentsTotal ?? 0) > 0 ? "Track delivery" : "Idle — no assignment yet",
      to: "/founder/assignments",
    },
    {
      name: "Compliance",
      status: (c?.complianceEvents ?? 0) > 0 ? "green" : "amber",
      reason: `${c?.complianceEvents ?? 0} compliance events logged`,
      next: "Continuous monitoring",
      to: "/founder/compliance",
    },
    {
      name: "System",
      status: (c?.retryQueue ?? 0) > 0 ? "amber" : "green",
      reason: `${c?.systemEvents ?? 0} system events · ${c?.retryQueue ?? 0} retries pending`,
      next: (c?.retryQueue ?? 0) > 0 ? "Review retry queue" : "Healthy",
      to: "/founder/system",
    },
  ];

  const healthCls = (s: Health["status"]) =>
    s === "green" ? "bg-green-500/15 text-green-400 border-green-500/30" :
    s === "amber" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
    "bg-destructive/15 text-destructive border-destructive/40";

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Lifecycle chain */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity size={16} className="text-primary" /> Agent Lifecycle Map
            <span className="text-xs text-muted-foreground font-normal">— end-to-end business chain</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stages.map((s, idx) => {
              const meta = statusMeta[s.status];
              return (
                <div key={s.key} className="relative p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors flex flex-col gap-2">
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-background border border-border/60 flex items-center justify-center text-[10px] text-muted-foreground">{idx + 1}</div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <s.icon size={16} className="text-primary shrink-0" />
                      <p className="text-sm font-medium truncate">{s.name}</p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${meta.cls} shrink-0`}>{meta.label}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Owner: <span className="text-foreground/80">{s.agent}</span></p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{s.recent}</span>
                    <span className="text-foreground/80">{s.count}</span>
                  </div>
                  {s.blocker && <p className="text-[11px] text-yellow-400 line-clamp-2">⚠ {s.blocker}</p>}
                  <p className="text-[11px] line-clamp-2"><span className="text-muted-foreground">Next:</span> {s.next}</p>
                  <Link to={s.route}>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs">Open <ArrowRight size={10} className="ml-1" /></Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Handoff rules */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight size={16} className="text-primary" /> Agent Handoff Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {handoffs.map(([from, to, what], idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded bg-secondary/30 border border-border/40 text-xs">
                  <span className="text-foreground/90 font-medium shrink-0">{from}</span>
                  <ArrowRight size={12} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium shrink-0">{to}</span>
                  <span className="text-muted-foreground ml-2 line-clamp-2">{what}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cross-agent next actions */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" /> Cross-Agent Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actions.map((a, idx) => {
                const cls = a.tone === "primary" ? "bg-primary/10 border-primary/40" : a.tone === "warn" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-secondary/40 border-border/40";
                return (
                  <Link key={idx} to={a.to} className={`flex items-center justify-between p-2.5 rounded text-sm border ${cls} hover:bg-secondary transition-colors`}>
                    <span className="line-clamp-2">{a.msg}</span>
                    <ArrowRight size={14} className="text-muted-foreground shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-agent activity timeline */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={16} className="text-primary" /> Cross-Agent Activity Timeline
            <span className="text-xs text-muted-foreground font-normal">— joined-up across all businesses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-border/60 ml-3 space-y-3">
            {[
              { label: "Lead imported", at: t?.lastImport, count: c?.importedLeads, icon: Layers, route: "/founder/outreach/imports" },
              { label: "Contact created", at: t?.lastContact, count: c?.contacts, icon: Users, route: "/founder/crm/contacts" },
              { label: "Campaign assigned/updated", at: t?.lastCampaign, count: c?.campaignsActive, icon: Send, route: "/founder/outreach/campaigns" },
              { label: "Email sent", at: t?.lastQueueSent, count: c?.queueSentReal, icon: Mail, route: "/founder/sending" },
              { label: "Reply received", at: t?.lastInbound, count: c?.inboundCount, icon: MessageSquare, route: "/founder/conversations" },
              { label: "AI draft created", at: t?.lastDraft, count: c?.draftsPending, icon: MessageSquare, route: "/founder/conversations" },
              { label: "Founder approved", at: t?.lastDraft, count: c?.aiActions, icon: CheckCircle2, route: "/founder/conversations" },
              { label: "Proposal generated", at: t?.lastProposal, count: c?.proposalsTotal, icon: FileSignature, route: "/founder/internal-proposals" },
              { label: "Demo issued", at: t?.lastDemo, count: c?.demoAccessTotal, icon: Presentation, route: "/founder/demos" },
              { label: "Deal created", at: t?.lastDeal, count: c?.dealsTotal, icon: Banknote, route: "/founder/finance/deals" },
              { label: "Invoice raised", at: t?.lastInvoice, count: c?.invoicesTotal, icon: FileText, route: "/founder/finance/invoices" },
              { label: "Supplier assigned", at: t?.lastAssignment, count: c?.assignmentsTotal, icon: Truck, route: "/founder/assignments" },
              { label: "Payment received", at: t?.lastPayment, count: c?.paymentsTotal, icon: CreditCard, route: "/founder/finance/payments" },
              { label: "Compliance event", at: t?.lastCompliance, count: c?.complianceEvents, icon: ShieldCheck, route: "/founder/compliance" },
              { label: "System event", at: t?.lastSystem, count: c?.systemEvents, icon: AlertTriangle, route: "/founder/system" },
            ].map((step, i) => (
              <li key={i} className="ml-4">
                <span className={`absolute -left-[7px] w-3 h-3 rounded-full ${step.at ? "bg-primary" : "bg-zinc-600"}`} />
                <Link to={step.route} className="flex items-center justify-between text-sm hover:text-primary">
                  <span className="flex items-center gap-2">
                    <step.icon size={12} className="text-muted-foreground" />
                    {step.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step.at ? `${step.count ?? 0} · ${ago(step.at)}` : "not reached yet"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Process health */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye size={16} className="text-primary" /> Business Process Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {health.map((h) => (
              <Link key={h.name} to={h.to} className={`p-3 rounded-lg border ${healthCls(h.status)} hover:opacity-90 transition-opacity flex flex-col gap-1`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{h.name}</p>
                  <span className={`w-2 h-2 rounded-full ${h.status === "green" ? "bg-green-400" : h.status === "amber" ? "bg-yellow-400" : "bg-destructive"}`} />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{h.reason}</p>
                <p className="text-[11px] line-clamp-1"><span className="text-muted-foreground">Next:</span> {h.next}</p>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Source of truth: live row counts across <span className="text-foreground/80">imported_leads, contacts, email_queue, inbound_messages, ai_drafts, internal_proposals, demo_access, deals, invoices, payments, assignments, suppliers, compliance_events, system_events, retry_queue</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentOrchestration;