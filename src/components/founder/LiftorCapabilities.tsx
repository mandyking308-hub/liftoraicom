import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, Inbox as InboxIcon, Users, FileSignature, Presentation, Banknote,
  Workflow as WorkflowIcon, Plug, Gauge, FlaskConical, Activity, Stethoscope,
  Scale, ShieldCheck, Shield, Eye, KeyRound, ToggleRight,
  Wallet, TrendingUp, FileText, Truck, ClipboardList, CreditCard,
  Brain, Compass, Sparkles, BookOpen, Bot, MessageSquare,
  Mail, Share2, Phone, UserCheck, Handshake, LifeBuoy, ArrowRight, Layers,
} from "lucide-react";

type CapStatus = "active" | "idle" | "dormant" | "needs_setup" | "needs_attention" | "hidden";

type Cap = {
  key: string;
  name: string;
  agent: string;
  icon: any;
  route: string;
  table: string;
  count?: number;
  status: CapStatus;
  recent?: string;
  blocker?: string;
  next: string;
};

const statusMeta: Record<CapStatus, { label: string; cls: string; help: string }> = {
  active:          { label: "Active",          cls: "bg-green-500/15 text-green-400",        help: "Working with live data." },
  idle:            { label: "Idle",            cls: "bg-blue-500/15 text-blue-300",          help: "Wired, waiting for activity." },
  dormant:         { label: "Dormant",         cls: "bg-zinc-500/15 text-zinc-300",          help: "Built but no live records yet." },
  needs_setup:     { label: "Needs setup",     cls: "bg-yellow-500/15 text-yellow-400",      help: "Exists but not configured." },
  needs_attention: { label: "Needs attention", cls: "bg-destructive/20 text-destructive",    help: "Wired but reporting an issue." },
  hidden:          { label: "Hidden",          cls: "bg-purple-500/15 text-purple-300",      help: "Built but not yet surfaced." },
};

// Helper: return a Promise that resolves to the row count (head:true) for a table.
async function tcount(table: string): Promise<number> {
  const { count } = await (supabase as any).from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

const LiftorCapabilities = () => {
  const { data } = useQuery({
    queryKey: ["liftor-capabilities-v1"],
    queryFn: async () => {
      const tables = [
        "outreach_campaigns", "email_queue", "imported_leads", "apollo_leads",
        "inboxes", "inbound_messages", "communications", "conversations",
        "contacts", "ai_drafts", "ai_actions", "ai_agents", "agent_alerts",
        "internal_proposals", "proposals", "demo_access", "demo_events",
        "deals", "partner_deals",
        "automation_workflows", "execution_logs", "integrations", "integration_alerts",
        "priority_scores", "high_priority_contacts", "platform_test_runs", "platform_diagnostic_runs",
        "system_events", "system_alerts", "system_health_score",
        "compliance_items", "compliance_events", "compliance_rules",
        "security_alerts", "security_events", "access_anomalies",
        "legal_document_versions", "system_execution_modes", "user_roles", "platform_roles",
        "invoices", "payments", "subscriptions", "revenue_records", "revenue_targets",
        "suppliers", "supplier_pipeline", "assignments",
        "brain_insights", "brain_recommendations", "brain_learning_records",
        "decision_recommendations", "strategy_insights",
        "knowledge_documents", "knowledge_entries",
        "sending_domains", "send_windows", "domain_usage_summary",
        "organisations", "organisation_members", "businesses",
        "feature_requests", "support_requests", "monitored_systems",
        "partner_applications", "partner_opportunities",
      ];
      const counts: Record<string, number> = {};
      await Promise.all(tables.map(async (t) => { counts[t] = await tcount(t).catch(() => 0); }));

      // last activity timestamps (best effort)
      const lastSend = (await supabase.from("email_queue").select("sent_at").eq("status", "sent").order("sent_at", { ascending: false }).limit(1)).data?.[0]?.sent_at ?? null;
      const lastInbound = (await supabase.from("inbound_messages").select("received_at").order("received_at", { ascending: false }).limit(1)).data?.[0]?.received_at ?? null;
      const lastSysEvent = (await supabase.from("system_events").select("created_at").order("created_at", { ascending: false }).limit(1)).data?.[0]?.created_at ?? null;
      const lastDemo = (await supabase.from("demo_events").select("created_at").order("created_at", { ascending: false }).limit(1)).data?.[0]?.created_at ?? null;
      const realSent = (await supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent").eq("delivery_kind", "smtp_real")).count ?? 0;
      const blocked = (await supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "blocked")).count ?? 0;
      const liveInbox = (await supabase.from("inboxes").select("id", { count: "exact", head: true }).eq("active", true)).count ?? 0;

      return { counts, lastSend, lastInbound, lastSysEvent, lastDemo, realSent, blocked, liveInbox };
    },
    refetchInterval: 60000,
  });

  const c = data?.counts ?? {};
  const ago = (iso: string | null) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // Status helpers
  const dormantIfZero = (n: number, opts?: { setupIfZero?: boolean }): CapStatus =>
    n > 0 ? "active" : (opts?.setupIfZero ? "needs_setup" : "dormant");

  // Capability groups
  const groups: { title: string; icon: any; caps: Cap[] }[] = [
    {
      title: "Growth & Sales",
      icon: TrendingUp,
      caps: [
        { key: "outreach", name: "Outreach", agent: "Outreach Agent", icon: Send, route: "/founder/outreach/campaigns",
          table: "outreach_campaigns", count: c.outreach_campaigns,
          status: c.outreach_campaigns > 0 ? "active" : "dormant",
          recent: data?.lastSend ? `Last send ${ago(data.lastSend)}` : "No sends yet",
          blocker: data?.blocked ? `${data.blocked} active blocked` : undefined,
          next: data?.blocked ? "Review blocked queue" : "Review campaign performance" },
        { key: "queue", name: "Send Queue", agent: "Outreach Agent", icon: ClipboardList, route: "/founder/outreach/queue",
          table: "email_queue", count: c.email_queue,
          status: c.email_queue > 0 ? "active" : "dormant",
          recent: `${data?.realSent ?? 0} real sent · ${data?.blocked ?? 0} blocked`,
          next: "Open queue" },
        { key: "imports", name: "Lead Imports", agent: "Outreach Agent", icon: Layers, route: "/founder/outreach/imports",
          table: "imported_leads", count: c.imported_leads,
          status: c.imported_leads > 0 ? "active" : "dormant",
          next: c.imported_leads ? "Review imported leads" : "Import a CSV" },
        { key: "apollo", name: "Apollo Leads", agent: "Outreach Agent", icon: Layers, route: "/founder/outreach/apollo",
          table: "apollo_leads", count: c.apollo_leads,
          status: c.apollo_leads > 0 ? "active" : "needs_setup",
          next: c.apollo_leads ? "Run next Apollo sync" : "Connect Apollo" },
        { key: "inbox", name: "Inbox", agent: "Inbox Agent", icon: InboxIcon, route: "/founder/crm/inboxes",
          table: "inboxes", count: c.inboxes,
          status: (data?.liveInbox ?? 0) > 0 ? "active" : "needs_setup",
          recent: data?.lastInbound ? `Last inbound ${ago(data.lastInbound)}` : "No inbound yet",
          next: (data?.liveInbox ?? 0) > 0 ? "Monitor inbox health" : "Configure an inbox" },
        { key: "convos", name: "Conversations", agent: "Inbox Agent", icon: MessageSquare, route: "/founder/conversations",
          table: "conversations", count: c.conversations,
          status: c.conversations > 0 ? "active" : "dormant",
          next: c.ai_drafts ? `Approve ${c.ai_drafts} AI draft${c.ai_drafts === 1 ? "" : "s"}` : "Open conversations" },
        { key: "crm", name: "CRM Contacts", agent: "CRM Agent", icon: Users, route: "/founder/crm/contacts",
          table: "contacts", count: c.contacts,
          status: c.contacts > 0 ? "active" : "dormant",
          next: "Review CRM" },
        { key: "proposals", name: "Internal Proposals", agent: "Proposal Agent", icon: FileSignature, route: "/founder/internal-proposals",
          table: "internal_proposals", count: c.internal_proposals,
          status: c.internal_proposals > 0 ? "active" : "dormant",
          next: c.internal_proposals ? "Review drafts" : "Generate first internal proposal" },
        { key: "public-proposals", name: "Public Proposals", agent: "Proposal Agent", icon: FileSignature, route: "/founder/proposals",
          table: "proposals", count: c.proposals,
          status: c.proposals > 0 ? "active" : "dormant",
          next: "Open proposals" },
        { key: "demos", name: "Demos", agent: "Demo Agent", icon: Presentation, route: "/founder/demos",
          table: "demo_access", count: c.demo_access,
          status: (c.demo_events ?? 0) > 0 ? "active" : (c.demo_access > 0 ? "idle" : "dormant"),
          recent: data?.lastDemo ? `Last view ${ago(data.lastDemo)}` : undefined,
          next: "Open demos dashboard" },
        { key: "deals", name: "Deals", agent: "Deal Agent", icon: Banknote, route: "/founder/finance/deals",
          table: "deals", count: c.deals,
          status: c.deals > 0 ? "active" : "dormant",
          next: c.deals ? "Review pipeline" : "Create first deal" },
      ],
    },
    {
      title: "Business Operations",
      icon: WorkflowIcon,
      caps: [
        { key: "ops", name: "Operations", agent: "Ops Agent", icon: Activity, route: "/founder/operations",
          table: "system_events", count: c.system_events,
          status: c.system_events > 0 ? "active" : "dormant",
          recent: data?.lastSysEvent ? `Last event ${ago(data.lastSysEvent)}` : undefined,
          next: "Open operations" },
        { key: "workflows", name: "Workflows", agent: "Workflow Agent", icon: WorkflowIcon, route: "/founder/workflows",
          table: "automation_workflows", count: c.automation_workflows,
          status: dormantIfZero(c.automation_workflows),
          next: c.automation_workflows ? "Review workflows" : "Create first workflow" },
        { key: "executions", name: "Executions", agent: "Workflow Agent", icon: Activity, route: "/founder/executions",
          table: "execution_logs", count: c.execution_logs,
          status: dormantIfZero(c.execution_logs),
          next: "Open execution log" },
        { key: "integrations", name: "Integrations", agent: "Integration Agent", icon: Plug, route: "/founder/integrations",
          table: "integrations", count: c.integrations,
          status: dormantIfZero(c.integrations, { setupIfZero: true }),
          blocker: c.integration_alerts ? `${c.integration_alerts} alerts` : undefined,
          next: c.integrations ? "Review integrations" : "Connect first integration" },
        { key: "priority", name: "Priority Engine", agent: "Priority Agent", icon: Gauge, route: "/founder/priority",
          table: "priority_scores", count: c.priority_scores,
          status: (c.priority_scores ?? 0) > 0 || (c.high_priority_contacts ?? 0) > 0 ? "active" : "dormant",
          next: "Open priority queue" },
        { key: "testing", name: "Platform Testing", agent: "Testing Agent", icon: FlaskConical, route: "/founder/testing",
          table: "platform_test_runs", count: c.platform_test_runs,
          status: c.platform_test_runs > 0 ? "active" : "dormant",
          next: c.platform_test_runs ? "View latest test run" : "Run first test suite" },
        { key: "diagnostics", name: "Diagnostics", agent: "Diagnostics Agent", icon: Stethoscope, route: "/founder/system/health",
          table: "platform_diagnostic_runs", count: c.platform_diagnostic_runs,
          status: c.platform_diagnostic_runs > 0 ? "active" : "dormant",
          next: "Run diagnostics" },
        { key: "monitoring", name: "Monitored Systems", agent: "Ops Agent", icon: Eye, route: "/founder/monitoring",
          table: "monitored_systems", count: c.monitored_systems,
          status: dormantIfZero(c.monitored_systems, { setupIfZero: true }),
          next: "Add system to monitor" },
      ],
    },
    {
      title: "Governance",
      icon: ShieldCheck,
      caps: [
        { key: "legal", name: "Legal Console", agent: "Legal Agent", icon: Scale, route: "/founder/legal",
          table: "legal_document_versions", count: c.legal_document_versions,
          status: c.legal_document_versions > 0 ? "active" : "needs_setup",
          next: "Review policy versions" },
        { key: "compliance", name: "Compliance", agent: "Compliance Agent", icon: ShieldCheck, route: "/founder/compliance",
          table: "compliance_items", count: c.compliance_items,
          status: (c.compliance_items ?? 0) > 0 || (c.compliance_events ?? 0) > 0 ? "active" : "dormant",
          recent: c.compliance_events ? `${c.compliance_events} events logged` : undefined,
          next: "Open compliance" },
        { key: "compliance-rules", name: "Compliance Rules", agent: "Compliance Agent", icon: ShieldCheck, route: "/founder/compliance/rules",
          table: "compliance_rules", count: c.compliance_rules,
          status: dormantIfZero(c.compliance_rules, { setupIfZero: true }),
          next: "Define rules" },
        { key: "security", name: "Security", agent: "Security Agent", icon: Shield, route: "/founder/security",
          table: "security_alerts", count: c.security_alerts,
          status: (c.security_alerts ?? 0) > 0 ? "needs_attention" : "idle",
          next: c.security_alerts ? "Triage alerts" : "Open security dashboard" },
        { key: "oversight", name: "System Oversight", agent: "Oversight Agent", icon: Eye, route: "/founder/system",
          table: "system_alerts", count: c.system_alerts,
          status: (c.system_alerts ?? 0) > 0 ? "needs_attention" : "active",
          next: "Open oversight" },
        { key: "system-health", name: "System Health", agent: "Oversight Agent", icon: Activity, route: "/founder/system/health",
          table: "system_health_score", count: c.system_health_score,
          status: c.system_health_score > 0 ? "active" : "dormant",
          next: "View health score" },
        { key: "modes", name: "System Modes (Test/Live)", agent: "System Mode Agent", icon: ToggleRight, route: "/founder/system/modes",
          table: "system_execution_modes", count: c.system_execution_modes,
          status: c.system_execution_modes > 0 ? "active" : "needs_setup",
          next: "Verify Test/Live mode" },
        { key: "access", name: "Access Control", agent: "Access Control Agent", icon: KeyRound, route: "/founder/access-control",
          table: "platform_roles", count: c.platform_roles,
          status: c.platform_roles > 0 ? "active" : "needs_setup",
          next: "Manage roles" },
      ],
    },
    {
      title: "Finance & Delivery",
      icon: Wallet,
      caps: [
        { key: "finance", name: "Finance Dashboard", agent: "Finance Agent", icon: Wallet, route: "/founder/finance",
          table: "deals", count: c.deals,
          status: (c.deals ?? 0) + (c.invoices ?? 0) + (c.payments ?? 0) > 0 ? "active" : "dormant",
          next: "Open finance" },
        { key: "revenue", name: "Revenue", agent: "Revenue Agent", icon: TrendingUp, route: "/founder/revenue",
          table: "revenue_records", count: c.revenue_records,
          status: dormantIfZero(c.revenue_records),
          next: c.revenue_targets ? "Review revenue" : "Set revenue targets" },
        { key: "invoices", name: "Invoices", agent: "Invoice Agent", icon: FileText, route: "/founder/finance/invoices",
          table: "invoices", count: c.invoices,
          status: dormantIfZero(c.invoices),
          next: c.invoices ? "Review invoices" : "Create first invoice" },
        { key: "payments", name: "Payments", agent: "Payment Agent", icon: CreditCard, route: "/founder/finance/payments",
          table: "payments", count: c.payments,
          status: dormantIfZero(c.payments),
          next: "Review payments" },
        { key: "subs", name: "Subscriptions", agent: "Payment Agent", icon: CreditCard, route: "/founder/finance",
          table: "subscriptions", count: c.subscriptions,
          status: dormantIfZero(c.subscriptions),
          next: "Open subscriptions" },
        { key: "suppliers", name: "Suppliers", agent: "Supplier Agent", icon: Truck, route: "/founder/suppliers",
          table: "suppliers", count: c.suppliers,
          status: dormantIfZero(c.suppliers, { setupIfZero: true }),
          next: c.suppliers ? "Manage suppliers" : "Add first supplier" },
        { key: "supplier-pipeline", name: "Supplier Pipeline", agent: "Supplier Agent", icon: Truck, route: "/founder/suppliers",
          table: "supplier_pipeline", count: c.supplier_pipeline,
          status: dormantIfZero(c.supplier_pipeline),
          next: "Open pipeline" },
        { key: "assignments", name: "Assignments", agent: "Assignment Agent", icon: ClipboardList, route: "/founder/assignments",
          table: "assignments", count: c.assignments,
          status: dormantIfZero(c.assignments),
          next: c.assignments ? "Review assignments" : "Create first assignment" },
      ],
    },
    {
      title: "Intelligence",
      icon: Brain,
      caps: [
        { key: "brain", name: "Brain Core", agent: "Brain Agent", icon: Brain, route: "/founder/brain",
          table: "brain_insights", count: c.brain_insights,
          status: (c.brain_insights ?? 0) + (c.brain_recommendations ?? 0) + (c.brain_learning_records ?? 0) > 0 ? "active" : "dormant",
          next: "Open Brain" },
        { key: "strategy", name: "Strategy Engine", agent: "Strategy Agent", icon: Compass, route: "/founder/strategy",
          table: "strategy_insights", count: c.strategy_insights,
          status: dormantIfZero(c.strategy_insights),
          next: "Open Strategy" },
        { key: "decisions", name: "Decision Engine", agent: "Decision Agent", icon: Sparkles, route: "/founder/decisions",
          table: "decision_recommendations", count: c.decision_recommendations,
          status: dormantIfZero(c.decision_recommendations),
          next: "Review decisions" },
        { key: "research", name: "Research / AI Actions", agent: "Research Agent", icon: Sparkles, route: "/founder/agents",
          table: "ai_actions", count: c.ai_actions,
          status: c.ai_actions > 0 ? "active" : "dormant",
          next: "Review AI actions" },
        { key: "knowledge", name: "Knowledge Base", agent: "Knowledge Agent", icon: BookOpen, route: "/founder/knowledge",
          table: "knowledge_documents", count: c.knowledge_documents,
          status: (c.knowledge_documents ?? 0) + (c.knowledge_entries ?? 0) > 0 ? "active" : "dormant",
          next: c.knowledge_documents ? "Browse knowledge" : "Add first document" },
        { key: "copilot", name: "Founder Co-Pilot", agent: "Co-Pilot Agent", icon: Bot, route: "/founder/copilot",
          table: "ai_drafts", count: c.ai_drafts,
          status: c.ai_drafts > 0 ? "active" : "idle",
          next: c.ai_drafts ? `Approve ${c.ai_drafts} draft${c.ai_drafts === 1 ? "" : "s"}` : "Open Co-Pilot" },
      ],
    },
    {
      title: "Channels & Portals",
      icon: Share2,
      caps: [
        { key: "email", name: "Email Channel", agent: "Email Agent", icon: Mail, route: "/founder/sending",
          table: "sending_domains", count: c.sending_domains,
          status: (data?.liveInbox ?? 0) > 0 ? "active" : "needs_setup",
          recent: data?.lastSend ? `Last send ${ago(data.lastSend)}` : undefined,
          next: "Open sending health" },
        { key: "social", name: "Social Channel", agent: "Social Agent", icon: Share2, route: "/founder/integrations",
          table: "integrations", status: "hidden",
          next: "Plan social channel" },
        { key: "voice", name: "Voice Channel", agent: "Voice Agent", icon: Phone, route: "/founder/integrations",
          table: "integrations", status: "hidden",
          next: "Plan voice channel" },
        { key: "client-portal", name: "Client Portal", agent: "Client Portal Agent", icon: UserCheck, route: "/portal/dashboard",
          table: "organisation_members", count: c.organisation_members,
          status: c.organisation_members > 0 ? "active" : "dormant",
          next: c.organisation_members ? "Open portal" : "Invite first client" },
        { key: "partner-portal", name: "Partner Portal", agent: "Partner Portal Agent", icon: Handshake, route: "/partner",
          table: "partner_applications", count: c.partner_applications,
          status: (c.partner_applications ?? 0) + (c.partner_opportunities ?? 0) > 0 ? "active" : "dormant",
          next: "Open partner portal" },
        { key: "support", name: "Support", agent: "Support Agent", icon: LifeBuoy, route: "/portal/support",
          table: "support_requests", count: c.support_requests,
          status: dormantIfZero(c.support_requests),
          blocker: c.support_requests ? `${c.support_requests} open` : undefined,
          next: c.support_requests ? "Triage support" : "No open tickets" },
      ],
    },
  ];

  // Summary
  const all = groups.flatMap((g) => g.caps);
  const summary = {
    total: all.length,
    active: all.filter((x) => x.status === "active").length,
    idle: all.filter((x) => x.status === "idle").length,
    dormant: all.filter((x) => x.status === "dormant").length,
    needs_setup: all.filter((x) => x.status === "needs_setup").length,
    needs_attention: all.filter((x) => x.status === "needs_attention").length,
    hidden: all.filter((x) => x.status === "hidden").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {[
          { label: "Total", value: summary.total, cls: "text-foreground" },
          { label: "Active", value: summary.active, cls: "text-green-400" },
          { label: "Idle", value: summary.idle, cls: "text-blue-300" },
          { label: "Dormant", value: summary.dormant, cls: "text-zinc-300" },
          { label: "Needs setup", value: summary.needs_setup, cls: "text-yellow-400" },
          { label: "Needs attention", value: summary.needs_attention, cls: "text-destructive" },
          { label: "Hidden", value: summary.hidden, cls: "text-purple-300" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border/50">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.map((g) => (
        <Card key={g.title} className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <g.icon size={16} className="text-primary" /> {g.title}
              <span className="text-xs text-muted-foreground font-normal">({g.caps.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {g.caps.map((cap) => {
                const meta = statusMeta[cap.status];
                return (
                  <div key={cap.key} className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <cap.icon size={16} className="text-primary shrink-0" />
                        <p className="text-sm font-medium truncate">{cap.name}</p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] ${meta.cls} shrink-0`} title={meta.help}>{meta.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Owner: <span className="text-foreground/80">{cap.agent}</span></p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{cap.table}</span>
                      <span className="text-foreground/80">{cap.count ?? 0} rows</span>
                    </div>
                    {cap.recent && <p className="text-[11px] text-muted-foreground line-clamp-1">{cap.recent}</p>}
                    {cap.blocker && <p className="text-[11px] text-yellow-400 line-clamp-1">⚠ {cap.blocker}</p>}
                    <p className="text-[11px] line-clamp-2"><span className="text-muted-foreground">Next:</span> {cap.next}</p>
                    <Link to={cap.route} className="mt-1">
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                        Open <ArrowRight size={10} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <p className="text-[11px] text-muted-foreground">
        Status logic: a capability is <span className="text-green-400">Active</span> when its primary table has live rows;
        <span className="text-zinc-300"> Dormant</span> when built but empty;
        <span className="text-yellow-400"> Needs setup</span> when configuration is required;
        <span className="text-destructive"> Needs attention</span> when alerts are open;
        <span className="text-purple-300"> Hidden</span> when planned but not yet wired.
      </p>
    </div>
  );
};

export default LiftorCapabilities;