import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, ShieldCheck, ShieldAlert, PoundSterling,
  ListChecks, Siren, PauseCircle, TrendingUp, TrendingDown, Coins,
  Building2, ArrowUpRight, FileText, Gauge, Sparkles,
} from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";

type CockpitData = {
  spendToday: number;
  spendMonth: number;
  failedActions: number;
  approvalsWaiting: number;
  urgentAlerts: number;
  pausedAgents: number;
  bypassCount: number;
  gatewayStatus: "healthy" | "watch" | "alert";
  bestRoiBusiness: string | null;
  worstRoiAgent: string | null;
  missingPricing: number;
  missingBudgets: number;
  recommended: string;
};

async function loadCockpit(): Promise<CockpitData> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    ledger, alerts, approvals, gateway, controls, businesses, pricing, budgets, roi,
  ] = await Promise.all([
    supabase.from("ai_usage_ledger").select("estimated_cost,status,created_at").gte("created_at", startOfMonth).limit(5000),
    supabase.from("ai_cost_alerts").select("severity,status").is("resolved_at", null).limit(500),
    supabase.from("founder_approval_items").select("id").eq("status", "pending").limit(500),
    supabase.from("ai_gateway_requests").select("status,created_at").gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(2000),
    supabase.from("ai_agent_cost_controls").select("agent_id,active,daily_spend_cap").limit(1000),
    supabase.from("businesses").select("id,name").limit(200),
    supabase.from("ai_provider_pricing").select("id").limit(200),
    supabase.from("ai_business_budgets").select("business_id").limit(500),
    supabase.from("ai_roi_snapshots").select("business_id,agent_id,roi_score,period_end").order("period_end", { ascending: false }).limit(500),
  ]);

  let spendToday = 0, spendMonth = 0, failedActions = 0;
  for (const r of (ledger.data ?? []) as any[]) {
    const c = Number(r.estimated_cost ?? 0);
    spendMonth += c;
    if (r.created_at >= startOfDay) spendToday += c;
    if (r.status === "failed") failedActions += 1;
  }

  const urgentAlerts = ((alerts.data ?? []) as any[]).filter(
    (a) => (a.severity === "high" || a.severity === "critical") && a.status !== "resolved",
  ).length;
  const approvalsWaiting = (approvals.data ?? []).length;

  const gwRows = (gateway.data ?? []) as any[];
  const gwFailRate = gwRows.length
    ? gwRows.filter((g) => g.status === "failed" || g.status === "rate_limited").length / gwRows.length
    : 0;
  const gatewayStatus: CockpitData["gatewayStatus"] =
    gwFailRate > 0.1 ? "alert" : gwFailRate > 0.02 ? "watch" : "healthy";

  const pausedAgents = ((controls.data ?? []) as any[]).filter((c) => c.active === false).length;

  // Business + agent ROI
  const bizMap = new Map<string, string>();
  for (const b of (businesses.data ?? []) as any[]) bizMap.set(b.id, b.name ?? "—");
  const bizScores = new Map<string, number>();
  const agentScores = new Map<string, number>();
  for (const r of (roi.data ?? []) as any[]) {
    if (r.business_id && r.roi_score != null && !bizScores.has(r.business_id)) bizScores.set(r.business_id, Number(r.roi_score));
    if (r.agent_id && r.roi_score != null && !agentScores.has(r.agent_id)) agentScores.set(r.agent_id, Number(r.roi_score));
  }
  let bestRoiBusiness: string | null = null;
  let bestScore = -Infinity;
  for (const [bid, s] of bizScores) if (s > bestScore) { bestScore = s; bestRoiBusiness = bizMap.get(bid) ?? null; }
  let worstRoiAgent: string | null = null;
  let worstScore = Infinity;
  for (const [aid, s] of agentScores) if (s < worstScore) { worstScore = s; worstRoiAgent = aid; }

  const missingPricing = (pricing.data ?? []).length === 0 ? 1 : 0;
  const businessIds = new Set(((businesses.data ?? []) as any[]).map((b) => b.id));
  const budgetedIds = new Set(((budgets.data ?? []) as any[]).map((b) => b.business_id));
  let missingBudgets = 0;
  for (const id of businessIds) if (!budgetedIds.has(id)) missingBudgets += 1;

  // Recommended next action
  let recommended = "All systems Live — Healthy. Continue daily operating loop.";
  if (urgentAlerts > 0) recommended = `Resolve ${urgentAlerts} urgent alert${urgentAlerts === 1 ? "" : "s"} in Live Alerts.`;
  else if (gatewayStatus === "alert") recommended = "Investigate AI Gateway failure rate.";
  else if (approvalsWaiting > 0) recommended = `Review ${approvalsWaiting} pending approval${approvalsWaiting === 1 ? "" : "s"}.`;
  else if (failedActions > 0) recommended = `Investigate ${failedActions} failed AI action${failedActions === 1 ? "" : "s"} today.`;
  else if (missingBudgets > 0) recommended = `Set AI budgets for ${missingBudgets} business${missingBudgets === 1 ? "" : "es"}.`;
  else if (missingPricing > 0) recommended = "Seed provider pricing registry.";

  return {
    spendToday, spendMonth, failedActions, approvalsWaiting, urgentAlerts,
    pausedAgents, bypassCount: 0, gatewayStatus,
    bestRoiBusiness, worstRoiAgent, missingPricing, missingBudgets, recommended,
  };
}

function Stat({
  icon: Icon, label, value, tone, to,
}: { icon: any; label: string; value: string | number; tone?: "good" | "warn" | "danger"; to?: string }) {
  const toneCls =
    tone === "danger" ? "border-destructive/40 bg-destructive/5 text-destructive" :
    tone === "warn" ? "border-amber-500/40 bg-amber-500/5 text-amber-300" :
    tone === "good" ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" :
    "border-border";
  const inner = (
    <div className={`rounded-md border p-2 h-full ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-semibold text-sm mt-0.5 truncate">{value}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90">{inner}</Link> : inner;
}

const DAILY_WORKFLOW: Array<{ label: string; to: string }> = [
  { label: "Review approvals", to: "/founder/ai-cost/approvals" },
  { label: "Check live alerts", to: "/founder/ai-cost/alerts" },
  { label: "Check AI spend", to: "/founder/ai-cost/ledger" },
  { label: "Check Gateway health", to: "/founder/ai-cost/runtime" },
  { label: "Check low-ROI agents", to: "/founder/ai-cost/roi" },
  { label: "Check missing pricing / budgets", to: "/founder/ai-cost/budgets" },
  { label: "Continue business build / run", to: "/founder/command-centre" },
];

export default function FounderCockpit() {
  const { data, isLoading } = useQuery({
    queryKey: ["founder_cockpit_v1"],
    queryFn: loadCockpit,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const d = data;
  const statusLabel =
    d?.urgentAlerts ? "Live — Risk Alert" :
    d?.gatewayStatus === "alert" ? "Live — Cost Alert" :
    d?.gatewayStatus === "watch" ? "Live — Watch" :
    d?.approvalsWaiting ? "Live — Approval Required" :
    d?.pausedAgents ? "Live — Paused by Founder" :
    "Live — Gateway Controlled";
  const statusTone =
    statusLabel.includes("Risk") || statusLabel.includes("Cost") ? "border-destructive/40 bg-destructive/10 text-destructive" :
    statusLabel.includes("Watch") || statusLabel.includes("Approval") || statusLabel.includes("Paused") ? "border-amber-500/40 bg-amber-500/10 text-amber-300" :
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card border-primary/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Today’s Founder Cockpit
              <Badge variant="outline" className={`ml-2 text-[10px] ${statusTone}`}>{statusLabel}</Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Link to="/founder/first-use-configuration">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> First-Use Configuration
                </Button>
              </Link>
              <Link to="/founder/ai-cost/action-board">
                <Button size="sm" className="h-8 text-xs">
                  <ListChecks className="h-3.5 w-3.5 mr-1" /> Open Founder Action Board
                </Button>
              </Link>
              <Link to="/founder/ai-cost/runtime">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <Activity className="h-3.5 w-3.5 mr-1" /> AI Runtime Health
                </Button>
              </Link>
              <Link to="/founder/ai-cost/ledger">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1" /> AI Usage Ledger
                </Button>
              </Link>
              <Link to="/founder/ai-cost/approvals">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approval Queue
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Stat icon={PoundSterling} label="AI spend today" value={formatGBP(d?.spendToday ?? 0)} to="/founder/ai-cost/ledger" />
            <Stat icon={PoundSterling} label="AI spend this month" value={formatGBP(d?.spendMonth ?? 0)} to="/founder/ai-cost/ledger" />
            <Stat icon={ShieldCheck} label="Gateway status"
              value={d?.gatewayStatus === "healthy" ? "Healthy" : d?.gatewayStatus === "watch" ? "Watch" : "Alert"}
              tone={d?.gatewayStatus === "healthy" ? "good" : d?.gatewayStatus === "watch" ? "warn" : "danger"}
              to="/founder/ai-cost/runtime" />
            <Stat icon={ShieldAlert} label="Active bypasses" value={d?.bypassCount ?? 0}
              tone={(d?.bypassCount ?? 0) > 0 ? "danger" : "good"}
              to="/founder/portfolio-exit/ai-bypass-register" />
            <Stat icon={ShieldCheck} label="Approvals waiting" value={d?.approvalsWaiting ?? 0}
              tone={(d?.approvalsWaiting ?? 0) > 0 ? "warn" : "good"}
              to="/founder/ai-cost/approvals" />
            <Stat icon={Siren} label="Urgent alerts" value={d?.urgentAlerts ?? 0}
              tone={(d?.urgentAlerts ?? 0) > 0 ? "danger" : "good"}
              to="/founder/ai-cost/alerts" />
            <Stat icon={AlertTriangle} label="Failed AI actions" value={d?.failedActions ?? 0}
              tone={(d?.failedActions ?? 0) > 0 ? "warn" : "good"}
              to="/founder/ai-cost/ledger" />
            <Stat icon={PauseCircle} label="Paused agents" value={d?.pausedAgents ?? 0}
              tone={(d?.pausedAgents ?? 0) > 0 ? "warn" : undefined}
              to="/founder/ai-cost/agent-controls" />
            <Stat icon={TrendingUp} label="Best-ROI business" value={d?.bestRoiBusiness ?? "—"}
              to="/founder/ai-cost/roi" />
            <Stat icon={TrendingDown} label="Worst-ROI agent" value={d?.worstRoiAgent ? d.worstRoiAgent.slice(0, 8) : "—"}
              to="/founder/ai-cost/roi" />
            <Stat icon={Coins} label="Missing pricing" value={d?.missingPricing ?? 0}
              tone={(d?.missingPricing ?? 0) > 0 ? "warn" : "good"}
              to="/founder/ai-cost/pricing" />
            <Stat icon={Building2} label="Missing budgets" value={d?.missingBudgets ?? 0}
              tone={(d?.missingBudgets ?? 0) > 0 ? "warn" : "good"}
              to="/founder/ai-cost/budgets" />
          </div>

          <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 text-xs">
            <div className="flex items-center gap-2 mb-1 text-primary font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" /> Recommended next action
            </div>
            <div className="text-foreground">{isLoading ? "Loading live signals…" : d?.recommended}</div>
          </div>

          <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
            <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-primary" /> What to do today
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAILY_WORKFLOW.map((w) => (
                <Link key={w.to} to={w.to}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary">
                  {w.label}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}