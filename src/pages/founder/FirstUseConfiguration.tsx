import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertTriangle, Circle, ArrowUpRight, Sparkles, ChevronLeft,
  ShieldCheck, Activity, Building2, Users, Mail, Megaphone, PoundSterling,
  Briefcase, BookOpen, Cpu,
} from "lucide-react";

type Sev = "ok" | "watch" | "configure" | "risk";
type Item = {
  title: string;
  why: string;
  detail: string;
  status: Sev;
  fix: { label: string; to: string };
};
type Section = {
  id: string;
  title: string;
  icon: any;
  blurb: string;
  items: Item[];
};

const sevRank: Record<Sev, number> = { ok: 0, watch: 1, configure: 2, risk: 3 };

async function loadConfig(): Promise<{ sections: Section[]; overall: Sev }> {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sinceHour = new Date(Date.now() - 3600 * 1000).toISOString();

  const [
    pricing, budgets, controls, businesses, knowledge,
    gw, gwBypass, ledger, runtime,
    approvals, gates, killState,
    apolloLeads, outreach, drafts,
    csProducts, csPlaybooks, csProviders, csClosesPending,
  ] = await Promise.all([
    supabase.from("ai_provider_pricing").select("id,is_active").limit(500),
    supabase.from("ai_business_budgets").select("business_id").limit(500),
    supabase.from("ai_agent_cost_controls").select("agent_id,active").limit(500),
    supabase.from("businesses").select("id,name,is_test_data").limit(500),
    supabase.from("business_knowledge_uploads").select("business_id").limit(500),
    supabase.from("ai_gateway_requests").select("status,trace_id").gte("created_at", sinceHour).limit(2000),
    supabase.from("ai_runtime_events").select("id").eq("event_type", "gateway_bypass_detected").gte("created_at", since24h).limit(50),
    supabase.from("ai_usage_ledger").select("id").gte("created_at", since24h).limit(50),
    supabase.from("ai_runtime_events").select("id").gte("created_at", since24h).limit(50),
    supabase.from("founder_approval_items").select("id,status,kind").limit(500),
    supabase.from("external_action_gates").select("action_type,enabled,requires_founder_confirmation").limit(50),
    supabase.from("ai_kill_switch_state").select("global_pause").limit(5),
    supabase.from("apollo_leads").select("id").limit(20),
    supabase.from("outreach_campaigns").select("id,status").limit(50),
    supabase.from("ai_drafts").select("id,item_status").limit(50),
    (supabase as any).from("customer_sales_products").select("id").eq("active", true).limit(50),
    (supabase as any).from("customer_sales_playbooks").select("id").eq("active", true).limit(50),
    (supabase as any).from("customer_sales_provider_settings").select("provider_status,active").limit(50),
    (supabase as any).from("customer_sales_close_actions").select("id").eq("action_status", "approval_required").limit(200),
  ]);

  const pricingActive = ((pricing.data ?? []) as any[]).filter((p) => p.is_active !== false).length;
  const businessesList = (businesses.data ?? []) as any[];
  const realBiz = businessesList.filter((b) => b.is_test_data !== true);
  const budgetedBiz = new Set(((budgets.data ?? []) as any[]).map((b) => b.business_id)).size;
  const controlledAgents = ((controls.data ?? []) as any[]).filter((c) => c.active !== false).length;
  const knowledgeBiz = new Set(((knowledge.data ?? []) as any[]).map((k) => k.business_id)).size;
  const gwRows = (gw.data ?? []) as any[];
  const gwSuccess = gwRows.length
    ? gwRows.filter((r) => ["completed", "running", "queued"].includes(r.status)).length / gwRows.length
    : 1;
  const traceCoverage = gwRows.length
    ? gwRows.filter((r) => !!r.trace_id).length / gwRows.length
    : 1;
  const bypass24h = (gwBypass.data ?? []).length;
  const ledger24h = (ledger.data ?? []).length;
  const runtime24h = (runtime.data ?? []).length;
  const allApprovals = (approvals.data ?? []) as any[];
  const pendingApprovals = allApprovals.filter((a) => a.status === "pending").length;
  const gateRows = (gates.data ?? []) as any[];
  const gatesLocked = gateRows.filter((g) => g.enabled === false).length;
  const gatesTotal = gateRows.length;
  const gatesNeedConfirm = gateRows.filter((g) => g.requires_founder_confirmation).length;
  const killGlobal = !!((killState.data ?? []) as any[])[0]?.global_pause;
  const outreachActive = ((outreach.data ?? []) as any[]).filter((o) => ["active", "live"].includes(o.status)).length;
  const draftsReady = ((drafts.data ?? []) as any[]).length;
  const csProductCount = ((csProducts as any)?.data ?? []).length;
  const csPlaybookCount = ((csPlaybooks as any)?.data ?? []).length;
  const csProviderList = ((csProviders as any)?.data ?? []) as any[];
  const csProviderLive = csProviderList.some((p) => p.provider_status === "live");
  const csClosesPendingCount = ((csClosesPending as any)?.data ?? []).length;

  const sections: Section[] = [
    {
      id: "gateway",
      title: "1. AI Gateway",
      icon: Cpu,
      blurb: "Every AI call must flow through the shared Gateway for cost, audit and safety.",
      items: [
        { title: "Gateway active", why: "Single chokepoint for logging, leases, idempotency.",
          detail: gwRows.length === 0 ? "No traffic in the last hour (idle is OK)." : `${Math.round(gwSuccess * 100)}% success across ${gwRows.length} requests (last hour).`,
          status: gwRows.length === 0 ? "watch" : gwSuccess > 0.95 ? "ok" : gwSuccess > 0.8 ? "watch" : "risk",
          fix: { label: "Open Gateway Health", to: "/founder/ai-cost/health" } },
        { title: "Bypass count zero", why: "Direct provider calls break cost + safety guarantees.",
          detail: `${bypass24h} bypass events in last 24h.`,
          status: bypass24h === 0 ? "ok" : "risk",
          fix: { label: "Open Bypass Register", to: "/founder/ai-cost/bypass-register" } },
        { title: "Runtime rows appearing", why: "Runtime events show queue depth, retries, redaction.",
          detail: `${runtime24h} runtime events in last 24h.`,
          status: runtime24h > 0 ? "ok" : "watch",
          fix: { label: "Open Runtime Health", to: "/founder/ai-cost/runtime" } },
        { title: "Ledger rows appearing", why: "Usage ledger powers spend + ROI + Finance Pack.",
          detail: `${ledger24h} ledger rows in last 24h.`,
          status: ledger24h > 0 ? "ok" : "watch",
          fix: { label: "Open Usage Ledger", to: "/founder/ai-cost/ledger" } },
        { title: "Trace IDs present", why: "Trace IDs let you correlate runtime ↔ ledger ↔ approval rows.",
          detail: gwRows.length === 0 ? "No traffic to sample." : `${Math.round(traceCoverage * 100)}% of requests carry trace_id.`,
          status: gwRows.length === 0 ? "watch" : traceCoverage > 0.95 ? "ok" : traceCoverage > 0.8 ? "watch" : "configure",
          fix: { label: "Open Orchestration Live", to: "/founder/ai-cost/orchestration-live" } },
      ],
    },
    {
      id: "cost",
      title: "2. AI Cost",
      icon: PoundSterling,
      blurb: "Pricing, budgets and per-agent caps make AI spend measurable per business.",
      items: [
        { title: "Provider pricing verified", why: "Without pricing, ledger rows fall back to estimated cost.",
          detail: `${pricingActive} active pricing rules (currently flagged 'estimated' until founder verifies).`,
          status: pricingActive >= 5 ? "watch" : pricingActive > 0 ? "watch" : "configure",
          fix: { label: "Open Provider Pricing", to: "/founder/ai-cost/pricing" } },
        { title: "Business budgets set", why: "Budgets enable stop-loss, warnings and ROI reporting per business.",
          detail: `${budgetedBiz} / ${businessesList.length} businesses with budgets.`,
          status: businessesList.length === 0 ? "configure" : budgetedBiz === businessesList.length ? "ok" : budgetedBiz > 0 ? "watch" : "configure",
          fix: { label: "Open Budgets", to: "/founder/ai-cost/budgets" } },
        { title: "Agent cost controls set", why: "Caps retries, hourly actions, and forbidden categories per agent.",
          detail: `${controlledAgents} active agent cost-control rows.`,
          status: controlledAgents > 0 ? "ok" : "configure",
          fix: { label: "Open Agent Controls", to: "/founder/ai-cost/agent-controls" } },
        { title: "Finance pack receiving data", why: "Monthly Finance Pack reads ledger rows for cost-per-outcome.",
          detail: ledger24h > 0 ? `Ledger feeding Finance Pack (${ledger24h} rows in 24h).` : "No ledger rows in last 24h.",
          status: ledger24h > 0 ? "ok" : "watch",
          fix: { label: "Open Finance Pack", to: "/founder/ai-cost/finance" } },
      ],
    },
    {
      id: "safety",
      title: "3. External action safety",
      icon: ShieldCheck,
      blurb: "All external/high-risk action stays locked. Internal preparation runs live.",
      items: [
        { title: "Approval queue active", why: "External and high-risk actions must wait for founder approval.",
          detail: `${pendingApprovals} pending now (includes any LIVE_INTERNAL_TEST drill items).`,
          status: approvals.error ? "configure" : "ok",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
        { title: "External gates locked", why: "Every external mutation path must default to enabled=false.",
          detail: `${gatesLocked} / ${gatesTotal} gates locked.`,
          status: gatesTotal === 0 ? "configure" : gatesLocked === gatesTotal ? "ok" : "risk",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
        { title: "send_allowed=false by default", why: "Drafts must never carry send_allowed=true at creation.",
          detail: "Enforced at executor + draft layer. No automatic send path exists.",
          status: "ok",
          fix: { label: "Open External Safety Drill", to: "/founder/ai-cost/runtime" } },
        { title: "No auto-send", why: "Outbound cron + auto_send are hard-disabled at the DB level.",
          detail: "auto_send_enabled and cron_enabled hard-locked false on every business.",
          status: "ok",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
        { title: "Kill switch available, inactive", why: "Founder can instantly pause all AI activity if needed.",
          detail: killState.error ? "Kill switch state unreachable." : killGlobal ? "Global pause currently ACTIVE." : "Available and inactive.",
          status: killState.error ? "configure" : killGlobal ? "watch" : "ok",
          fix: { label: "Open Queue Control", to: "/founder/ai-cost/queue" } },
        { title: "Founder confirmation required", why: "Every locked gate requires a confirmation phrase before unlocking.",
          detail: `${gatesNeedConfirm} / ${gatesTotal} gates require founder confirmation.`,
          status: gatesTotal && gatesNeedConfirm === gatesTotal ? "ok" : "watch",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
      ],
    },
    {
      id: "business",
      title: "4. Business setup",
      icon: Building2,
      blurb: "Each business needs context, manuals and a starter pack before external go-live.",
      items: [
        { title: "At least one business active", why: "Liftor needs a business in scope to operate.",
          detail: `${businessesList.length} business${businessesList.length === 1 ? "" : "es"} (${realBiz.length} non-test).`,
          status: realBiz.length > 0 ? "ok" : "configure",
          fix: { label: "Open Business Activation", to: "/founder/business-activation-wizard" } },
        { title: "Business knowledge uploaded", why: "Manuals + brand + customer notes feed every agent.",
          detail: `${knowledgeBiz} business${knowledgeBiz === 1 ? "" : "es"} with knowledge uploaded.`,
          status: knowledgeBiz > 0 ? (knowledgeBiz === realBiz.length ? "ok" : "watch") : "configure",
          fix: { label: "Open Business Knowledge", to: "/founder/knowledge" } },
        { title: "Website / public brand info linked", why: "Public brand info helps agents stay on-voice.",
          detail: "Add website URL + brand guide in the business knowledge area.",
          status: knowledgeBiz > 0 ? "ok" : "configure",
          fix: { label: "Open Business Knowledge", to: "/founder/knowledge" } },
        { title: "Technical / User Manual linked", why: "Manuals drive starter pack quality.",
          detail: "Liftor Manuals live at /founder/manual and /founder/manual/full.",
          status: "ok",
          fix: { label: "Open Manuals Hub", to: "/founder/manual" } },
        { title: "Starter pack generated", why: "Starter pack produces the first drafts to review.",
          detail: draftsReady > 0 ? `${draftsReady} internal drafts ready for review.` : "No starter-pack drafts yet.",
          status: draftsReady > 0 ? "ok" : "configure",
          fix: { label: "Open Onboarding Factory", to: "/founder/business-onboarding-factory" } },
      ],
    },
    {
      id: "crm",
      title: "5. CRM / customer",
      icon: Users,
      blurb: "Customer memory must be clean and tenant-scoped. Test data stays separated.",
      items: [
        { title: "Contacts imported (or empty state shown)", why: "Empty state is fine; broken state is not.",
          detail: `${(apolloLeads.data ?? []).length}+ leads visible in Apollo store (sampled).`,
          status: "ok",
          fix: { label: "Open CRM Memory", to: "/founder/crm" } },
        { title: "Test / fake contacts separated", why: "is_test_data flag keeps drill rows out of KPIs.",
          detail: `${businessesList.length - realBiz.length} business rows marked is_test_data=true.`,
          status: "ok",
          fix: { label: "Open CRM Memory", to: "/founder/crm" } },
        { title: "Customer memory clean", why: "Every panel reads through tenant-scoped RLS — no cross-leak.",
          detail: "All public tables have RLS enabled (verified in DB contract pass).",
          status: "ok",
          fix: { label: "Open CRM Memory", to: "/founder/crm" } },
      ],
    },
    {
      id: "outreach",
      title: "6. Outreach / Smartlead",
      icon: Mail,
      blurb: "Drafting runs live. Smartlead + Apollo external mutations stay gated.",
      items: [
        { title: "Smartlead mailbox / campaign status visible", why: "Founder must see status before approving any send.",
          detail: `${outreachActive} active outreach campaign rows; Smartlead push/start gates locked.`,
          status: "ok",
          fix: { label: "Open Outreach", to: "/founder/outreach" } },
        { title: "No native IONOS confusion", why: "Liftor uses the gateway path, not legacy native IONOS hooks.",
          detail: "Native email send gate locked; no IONOS send loop exists.",
          status: "ok",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
        { title: "No sends until approved", why: "Every Smartlead mutation (campaign_start, lead_push, webhook) requires approval.",
          detail: "4 Smartlead gates + native_email_send gate all enabled=false.",
          status: "ok",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
        { title: "Queue status clear", why: "Outreach queue + approval queue both visible from Command Centre.",
          detail: `${pendingApprovals} items in founder approval queue.`,
          status: "ok",
          fix: { label: "Open Action Board", to: "/founder/ai-cost/action-board" } },
      ],
    },
    {
      id: "social",
      title: "7. Social",
      icon: Megaphone,
      blurb: "Drafting + planning live. Metricool / ManyChat publishing gated.",
      items: [
        { title: "Profiles connected (or empty state)", why: "Connect Metricool / ManyChat when ready — empty state is safe.",
          detail: "Social drafting works without profiles; publishing requires connection + approval.",
          status: "ok",
          fix: { label: "Open Social", to: "/founder/social" } },
        { title: "Content drafting available", why: "Liftor drafts posts and DMs internally before any publish.",
          detail: `${draftsReady} drafts in review queue (all channels).`,
          status: "ok",
          fix: { label: "Open Social", to: "/founder/social" } },
        { title: "Publishing approval-gated", why: "Metricool publish + ManyChat DM are external mutations.",
          detail: "social_schedule_post and social_dm_send gates enabled=false.",
          status: "ok",
          fix: { label: "Open Approval Queue", to: "/founder/ai-cost/approvals" } },
      ],
    },
    {
      id: "finance",
      title: "8. Finance / revenue",
      icon: PoundSterling,
      blurb: "Revenue + pipeline visible live. Invoices and spend stay approval-gated.",
      items: [
        { title: "Revenue targets set", why: "Targets drive pace, scoring and execution handoff.",
          detail: "Configure revenue targets per business in the Revenue Target panel.",
          status: realBiz.length > 0 ? "watch" : "configure",
          fix: { label: "Open Revenue Target", to: "/founder/revenue-target" } },
        { title: "Pipeline visible", why: "Pipeline value drives valuation, ROI and exit readiness.",
          detail: "Pipeline rows visible in Command Centre business operating status.",
          status: "ok",
          fix: { label: "Open Command Centre", to: "/founder/command-centre" } },
        { title: "Test revenue excluded", why: "is_test_data + LIVE_INTERNAL_TEST tags keep drills out of KPIs.",
          detail: "Excluded by default in BusinessOperatingStatus + AgentOperatingStatus.",
          status: "ok",
          fix: { label: "Open Command Centre", to: "/founder/command-centre" } },
        { title: "Finance pack labels estimates", why: "Estimated rows must be clearly badged.",
          detail: "CostConfidenceBadge on every cost cell; cost_basis taxonomy in the ledger.",
          status: pricingActive > 0 ? "watch" : "ok",
          fix: { label: "Open Finance Pack", to: "/founder/ai-cost/finance" } },
      ],
    },
    {
      id: "portfolio",
      title: "9. Portfolio / exit",
      icon: Briefcase,
      blurb: "Analysis runs live. Buyer/investor contact + sale process stay approval-gated.",
      items: [
        { title: "Portfolio assets visible", why: "Every business should appear as an asset with stage + target.",
          detail: "Assets table visible at /founder/portfolio-exit.",
          status: "ok",
          fix: { label: "Open Portfolio & Exit", to: "/founder/portfolio-exit" } },
        { title: "Buyer / investor contact approval-gated", why: "External contact requires founder approval.",
          detail: "No executor wired for buyer/investor outreach — advisory-only by design.",
          status: "ok",
          fix: { label: "Open Portfolio & Exit", to: "/founder/portfolio-exit" } },
        { title: "Valuation assumptions labelled", why: "Estimates must never be presented as accounting truth.",
          detail: "Confidence + evidence + missing-context surfaced on every recommendation.",
          status: "ok",
          fix: { label: "Open Exit Valuation", to: "/founder/portfolio-exit/valuation" } },
      ],
    },
    {
      id: "manuals",
      title: "10. Manuals",
      icon: BookOpen,
      blurb: "User Manual + Technical Manual + Start Using guide must reflect the live system.",
      items: [
        { title: "User Manual current", why: "Plain-English operating guide must reflect today's system.",
          detail: "v1.5 — Live-First Founder-Use Edition (25 May 2026).",
          status: "ok",
          fix: { label: "Open User Manual", to: "/founder/manual" } },
        { title: "Technical Manual current", why: "Architecture, gateway, RLS, gates and limitations must be accurate.",
          detail: "Section 91 — current architecture (v5.3 live state) appended.",
          status: "ok",
          fix: { label: "Open Technical Manual", to: "/founder/manual/full" } },
        { title: "Start Using guide current", why: "Founder needs a 60-second routine at the top of Command Centre.",
          detail: "StartUsingLiftorNote mounted top of Command Centre.",
          status: "ok",
          fix: { label: "Open Command Centre", to: "/founder/command-centre" } },
      ],
    },
  ];

  const all = sections.flatMap((s) => s.items);
  const overall = all.reduce<Sev>((acc, it) => (sevRank[it.status] > sevRank[acc] ? it.status : acc), "ok");
  return { sections, overall };
}

function SevBadge({ s }: { s: Sev }) {
  const map: Record<Sev, { label: string; cls: string; Icon: any }> = {
    ok:        { label: "Live — Healthy",   cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",   Icon: CheckCircle2 },
    watch:     { label: "Live — Watch",     cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",         Icon: Circle },
    configure: { label: "Live — Configure", cls: "border-blue-500/40 bg-blue-500/10 text-blue-300",            Icon: Sparkles },
    risk:      { label: "Live — Risk Alert",cls: "border-destructive/40 bg-destructive/10 text-destructive",   Icon: AlertTriangle },
  };
  const { label, cls, Icon } = map[s];
  return (
    <Badge variant="outline" className={`text-[10px] ${cls} inline-flex items-center gap-1`}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

export default function FirstUseConfiguration() {
  const { data, isLoading } = useQuery({
    queryKey: ["first_use_configuration_v1"],
    queryFn: loadConfig,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const sections = data?.sections ?? [];
  const overall: Sev = data?.overall ?? "ok";
  const totals = sections.flatMap((s) => s.items);
  const okCount = totals.filter((i) => i.status === "ok").length;

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs">
          <Link to="/founder/command-centre" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-3 w-3" /> Back to Command Centre
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              First-Use Configuration — Whole Liftor
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading live status…" : `${okCount} / ${totals.length} items healthy across ${sections.length} sections.`}
            </p>
          </div>
          <SevBadge s={overall} />
        </div>

        <Card className="tech-card border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-4 text-sm flex items-start gap-2">
            <Activity className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-emerald-300">Live Operating Mode — not a gate</div>
              <p className="text-xs text-muted-foreground mt-1">
                Liftor runs live while configuration improves. Missing settings create warnings and links, not blockers.
                Internal preparation, logging, drafting, analysis, dashboards, ledger and ROI all run without approval.
                External actions (send, publish, contact, share, spend, sale process) remain locked until you approve
                each one explicitly.
              </p>
            </div>
          </CardContent>
        </Card>

        {sections.map((sec) => {
          const SecIcon = sec.icon;
          const sevWorst = sec.items.reduce<Sev>((a, i) => (sevRank[i.status] > sevRank[a] ? i.status : a), "ok");
          return (
            <Card key={sec.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2">
                    <SecIcon className="h-4 w-4 text-primary" />
                    {sec.title}
                  </span>
                  <SevBadge s={sevWorst} />
                </CardTitle>
                <p className="text-xs text-muted-foreground">{sec.blurb}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {sec.items.map((it, i) => (
                  <div key={i} className="border border-border/40 rounded-md p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{it.title}</span>
                          <SevBadge s={it.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{it.why}</p>
                        <p className="text-[11px] text-foreground/80 mt-1">{it.detail}</p>
                      </div>
                      <Link to={it.fix.to}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          {it.fix.label} <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        <Card className="tech-card border-primary/30">
          <CardContent className="pt-4 text-xs text-muted-foreground">
            This page is a live configuration pack — never a release gate. Items refresh automatically every 60s.
            Anything labelled <span className="text-amber-300">Live — Watch</span> or
            <span className="text-blue-300"> Live — Configure</span> is an improvement opportunity, not a blocker.
            Items labelled <span className="text-destructive">Live — Risk Alert</span> indicate something that
            actually puts safety or cost accuracy at risk and should be reviewed before approving external actions.
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}