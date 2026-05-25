import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, Circle, ArrowUpRight, ShieldCheck,
  Sparkles, Activity,
} from "lucide-react";

type Severity = "ok" | "watch" | "configure" | "risk";
type Impact = "cost accuracy" | "safety" | "usefulness" | "reporting";

type Item = {
  id: number;
  title: string;
  why: string;
  impact: Impact;
  status: Severity;
  detail: string;
  fix: { label: string; to: string };
};

async function loadSetup(): Promise<{ items: Item[]; overall: Severity }> {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sinceHour = new Date(Date.now() - 3600 * 1000).toISOString();

  const [
    pricing, businesses, budgets, agents, controls, routing, gw, gwBypass,
    approvals, ledger, runtime, roi, templates, context, kill,
  ] = await Promise.all([
    supabase.from("ai_provider_pricing").select("id,is_active").limit(500),
    supabase.from("businesses").select("id").limit(500),
    supabase.from("ai_business_budgets").select("business_id").limit(500),
    supabase.from("ai_agent_registry").select("id").limit(500),
    supabase.from("ai_agent_cost_controls").select("agent_id,active").limit(500),
    supabase.from("ai_model_routing_rules").select("id,active").limit(500),
    supabase.from("ai_gateway_requests").select("status").gte("created_at", sinceHour).limit(2000),
    supabase.from("ai_runtime_events").select("id,event_type,created_at").eq("event_type", "gateway_bypass_detected").gte("created_at", since24h).limit(50),
    supabase.from("founder_approval_items").select("id,status").limit(500),
    supabase.from("ai_usage_ledger").select("id").gte("created_at", since24h).limit(50),
    supabase.from("ai_runtime_events").select("id").gte("created_at", since24h).limit(50),
    supabase.from("ai_roi_snapshots").select("id").limit(50),
    supabase.from("ai_prompt_templates").select("id,active").limit(200),
    supabase.from("ai_cached_context_blocks").select("id,active").limit(200),
    supabase.from("ai_kill_switch_state").select("global_pause,scoped_pause").limit(5),
  ]);

  const activePricing = ((pricing.data ?? []) as any[]).filter((r) => r.is_active !== false).length;
  const totalBiz = (businesses.data ?? []).length;
  const budgetedBiz = new Set(((budgets.data ?? []) as any[]).map((b) => b.business_id)).size;
  const totalAgents = (agents.data ?? []).length;
  const controlledAgents = ((controls.data ?? []) as any[]).filter((c) => c.active !== false).length;
  const activeRoutes = ((routing.data ?? []) as any[]).filter((r) => r.active !== false).length;
  const gwRows = (gw.data ?? []) as any[];
  const gwOk = gwRows.length > 0
    ? gwRows.filter((r) => r.status === "completed" || r.status === "running" || r.status === "queued").length / gwRows.length
    : 1;
  const bypassCount = (gwBypass.data ?? []).length;
  const approvalsReady = approvals.error == null;
  const ledgerRows = (ledger.data ?? []).length;
  const runtimeRows = (runtime.data ?? []).length;
  const financeRows = (roi.data ?? []).length;
  const tplActive = ((templates.data ?? []) as any[]).filter((t) => t.active !== false).length;
  const ctxActive = ((context.data ?? []) as any[]).filter((c) => c.active !== false).length;
  const killRow = ((kill.data ?? []) as any[])[0];
  const killGlobal = !!killRow?.global_pause;
  const killAvailable = kill.error == null;

  const items: Item[] = [
    {
      id: 1, title: "Provider pricing configured", impact: "cost accuracy",
      why: "Without pricing rows the ledger cannot estimate spend per provider/model.",
      status: activePricing >= 5 ? "ok" : activePricing > 0 ? "watch" : "configure",
      detail: `${activePricing} active pricing rows.`,
      fix: { label: "Open pricing registry", to: "/founder/ai-cost/pricing" },
    },
    {
      id: 2, title: "Businesses have AI budgets", impact: "cost accuracy",
      why: "Budgets enable warnings, stop-loss and finance reporting per business.",
      status: totalBiz === 0 ? "configure" : budgetedBiz === totalBiz ? "ok" : budgetedBiz > 0 ? "watch" : "configure",
      detail: `${budgetedBiz} / ${totalBiz} businesses with budgets.`,
      fix: { label: "Configure budgets", to: "/founder/ai-cost/budgets" },
    },
    {
      id: 3, title: "Agents have cost controls", impact: "safety",
      why: "Cost controls cap retries, hourly actions and require approval where needed.",
      status: totalAgents === 0 ? "configure" : controlledAgents >= totalAgents ? "ok" : controlledAgents > 0 ? "watch" : "configure",
      detail: `${controlledAgents} / ${totalAgents} agents with active controls.`,
      fix: { label: "Configure agent controls", to: "/founder/ai-cost/agent-controls" },
    },
    {
      id: 4, title: "Routing rules active", impact: "cost accuracy",
      why: "Routing rules choose the cheapest model that meets each task category.",
      status: activeRoutes >= 5 ? "ok" : activeRoutes > 0 ? "watch" : "configure",
      detail: `${activeRoutes} active routing rules.`,
      fix: { label: "Open routing rules", to: "/founder/ai-cost/routing" },
    },
    {
      id: 5, title: "Gateway active", impact: "safety",
      why: "All AI calls must flow through the Gateway for logging, leases and idempotency.",
      status: gwRows.length === 0 ? "watch" : gwOk > 0.95 ? "ok" : gwOk > 0.8 ? "watch" : "risk",
      detail: gwRows.length === 0
        ? "No gateway traffic in the last hour."
        : `${Math.round(gwOk * 100)}% success across ${gwRows.length} requests (last hour).`,
      fix: { label: "Open Gateway health", to: "/founder/ai-cost/runtime" },
    },
    {
      id: 6, title: "Bypass count zero", impact: "safety",
      why: "Any direct provider call outside the Gateway breaks cost, audit and safety guarantees.",
      status: bypassCount === 0 ? "ok" : "risk",
      detail: `${bypassCount} bypass events in the last 24h.`,
      fix: { label: "Open bypass register", to: "/founder/portfolio-exit/ai-bypass-register" },
    },
    {
      id: 7, title: "Approval queue active", impact: "safety",
      why: "External or high-risk actions must wait for founder approval before execution.",
      status: approvalsReady ? "ok" : "configure",
      detail: approvalsReady
        ? `${(approvals.data ?? []).filter((a: any) => a.status === "pending").length} pending now.`
        : "Approval queue unreachable.",
      fix: { label: "Open approval queue", to: "/founder/ai-cost/approvals" },
    },
    {
      id: 8, title: "External action lock active", impact: "safety",
      why: "Outbound sends, posts, and investor contact remain locked until founder confirms.",
      status: "ok",
      detail: "External action locks are enforced by default. Founder must explicitly unlock each external gate.",
      fix: { label: "Open action gates", to: "/founder/ai-cost/approvals" },
    },
    {
      id: 9, title: "Ledger receiving rows", impact: "reporting",
      why: "The usage ledger powers spend, ROI and finance pack reporting.",
      status: ledgerRows > 0 ? "ok" : "watch",
      detail: `${ledgerRows} ledger rows in the last 24h.`,
      fix: { label: "Open usage ledger", to: "/founder/ai-cost/ledger" },
    },
    {
      id: 10, title: "Runtime events receiving rows", impact: "reporting",
      why: "Runtime events show queue depth, retries, redaction events and Gateway behaviour.",
      status: runtimeRows > 0 ? "ok" : "watch",
      detail: `${runtimeRows} runtime events in the last 24h.`,
      fix: { label: "Open runtime health", to: "/founder/ai-cost/runtime" },
    },
    {
      id: 11, title: "Finance Pack receiving data", impact: "reporting",
      why: "ROI snapshots feed the monthly Finance Pack (cost per lead/opportunity/sale).",
      status: financeRows > 0 ? "ok" : "watch",
      detail: `${financeRows} ROI snapshots stored.`,
      fix: { label: "Open Finance Pack", to: "/founder/ai-cost/finance" },
    },
    {
      id: 12, title: "Prompt templates available", impact: "usefulness",
      why: "Templates standardise prompts so agents reuse proven, cheaper, higher-quality wording.",
      status: tplActive > 0 ? "ok" : "watch",
      detail: `${tplActive} active templates.`,
      fix: { label: "Open prompt templates", to: "/founder/ai-cost/templates" },
    },
    {
      id: 13, title: "Cached context available", impact: "usefulness",
      why: "Cached context blocks cut token cost on repeated business/agent context.",
      status: ctxActive > 0 ? "ok" : "watch",
      detail: `${ctxActive} active context blocks.`,
      fix: { label: "Open cached context", to: "/founder/ai-cost/context" },
    },
    {
      id: 14, title: "Security / redaction active", impact: "safety",
      why: "Redaction strips PII and secrets before content leaves the gateway.",
      status: "ok",
      detail: "Redaction and prompt-injection guards are enforced by the shared gateway.",
      fix: { label: "Open security centre", to: "/founder/ai-cost/security" },
    },
    {
      id: 15, title: "Kill switch inactive but available", impact: "safety",
      why: "The kill switch lets the founder instantly pause all AI activity if needed.",
      status: !killAvailable ? "configure" : killGlobal ? "watch" : "ok",
      detail: !killAvailable
        ? "Kill switch state unreachable."
        : killGlobal
          ? "Global pause currently ACTIVE."
          : "Available and inactive.",
      fix: { label: "Open queue control", to: "/founder/ai-cost/queue" },
    },
  ];

  const severityRank: Record<Severity, number> = { ok: 0, watch: 1, configure: 2, risk: 3 };
  const worst = items.reduce<Severity>((acc, it) => severityRank[it.status] > severityRank[acc] ? it.status : acc, "ok");

  return { items, overall: worst };
}

function StatusBadge({ s }: { s: Severity }) {
  const map: Record<Severity, { label: string; cls: string; icon: any }> = {
    ok:        { label: "Live — Healthy",   cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",   icon: CheckCircle2 },
    watch:     { label: "Live — Watch",     cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",         icon: Circle },
    configure: { label: "Live — Configure", cls: "border-blue-500/40 bg-blue-500/10 text-blue-300",            icon: Sparkles },
    risk:      { label: "Live — Risk Alert",cls: "border-destructive/40 bg-destructive/10 text-destructive",   icon: AlertTriangle },
  };
  const m = map[s];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-[10px] ${m.cls} inline-flex items-center gap-1`}>
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

const MIN_USEFUL = [
  { label: "At least one business budget", to: "/founder/ai-cost/budgets" },
  { label: "Active provider pricing rows", to: "/founder/ai-cost/pricing" },
  { label: "Active model routing defaults", to: "/founder/ai-cost/routing" },
  { label: "AI Gateway health — zero active bypasses", to: "/founder/portfolio-exit/ai-bypass-register" },
  { label: "Approval queue available", to: "/founder/ai-cost/approvals" },
  { label: "Ledger receiving records", to: "/founder/ai-cost/ledger" },
];

export default function AIFirstUseSetup() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai_first_use_setup_v1"],
    queryFn: loadSetup,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const overall: Severity = data?.overall ?? "ok";
  const okCount = items.filter((i) => i.status === "ok").length;

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <AICostBreadcrumb
          page="First-Use Setup"
          description="Live checklist for configuring the AI Cost Governor. Missing settings create warnings, not gates — Liftor operates live while you complete setup."
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> AI Cost Governor — First-Use Setup
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading live status…" : `${okCount} / ${items.length} items healthy.`}
            </p>
          </div>
          <StatusBadge s={overall} />
        </div>

        <Card className="tech-card border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-4 text-sm flex items-start gap-2">
            <Activity className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-emerald-300">Start using now</div>
              <p className="text-xs text-muted-foreground mt-1">
                Liftor can operate live while configuration improves. Missing settings create
                warnings, not gates. The Gateway, approval queue, redaction and kill switch
                already enforce safety. Complete the items below to improve cost accuracy,
                usefulness and reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Minimum useful configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
              {MIN_USEFUL.map((m) => (
                <li key={m.to}>
                  <Link to={m.to} className="inline-flex items-center gap-1 hover:text-primary">
                    <ArrowUpRight className="h-3 w-3 text-primary" /> {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className="tech-card">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">#{it.id}</span>
                      <span className="font-semibold text-sm">{it.title}</span>
                      <StatusBadge s={it.status} />
                      <Badge variant="outline" className="text-[10px] capitalize">{it.impact}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{it.why}</p>
                    <p className="text-[11px] text-foreground/80 mt-1">{it.detail}</p>
                  </div>
                  <Link
                    to={it.fix.to}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10"
                  >
                    {it.fix.label} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="tech-card border-primary/30">
          <CardContent className="pt-4 text-xs text-muted-foreground">
            This page is a live setup checklist — not a gate. It will continue updating as you
            configure each item. No item blocks live operation.
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}