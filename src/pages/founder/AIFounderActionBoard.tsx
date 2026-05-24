import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, ShieldAlert, ShieldCheck, Siren, PauseCircle, PlayCircle,
  Bot, PoundSterling, TrendingUp, TrendingDown, FileText, Coins, Sparkles,
  CheckCircle2, XCircle, ArrowRight, Building2, Gauge, Wallet, Trophy,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Founder Action Board — live operating cockpit for the AI Cost Governor.
// Live data only. No simulation. No artificial gates. No placeholder values.
// Where a table is empty we show a useful empty state pointing at the action.
// -----------------------------------------------------------------------------

type Sev = "info" | "warning" | "high" | "critical";
const sevTone: Record<Sev, string> = {
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n || 0);

function startOfTodayIso() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); }
function startOfMonthIso() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); }

// ---------------------------------------------------------------------------

function useActionBoardData() {
  return useQuery({
    queryKey: ["founder_action_board"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const todayIso = startOfTodayIso();
      const monthIso = startOfMonthIso();

      const [
        ledgerToday, ledgerMonth, alertsOpen, approvalsPending, agentControls,
        budgets, businesses, qualityScores,
      ] = await Promise.all([
        supabase.from("ai_usage_ledger").select("*").gte("created_at", todayIso).limit(1000),
        supabase.from("ai_usage_ledger")
          .select("business_id,agent_id,estimated_cost,status,revenue_linked_amount,pipeline_linked_amount,human_equivalent_cost,roi_score,human_approved,audit_metadata")
          .gte("created_at", monthIso).limit(2000),
        supabase.from("ai_cost_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(200),
        supabase.from("founder_approval_items").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(200),
        supabase.from("ai_agent_cost_controls").select("*").limit(500),
        supabase.from("ai_business_budgets").select("*").limit(500),
        supabase.from("businesses").select("id,name").limit(500),
        supabase.from("ai_quality_scores").select("agent_id,business_id,output_quality_score,usefulness_score,rejected,feedback_label,created_at").gte("created_at", monthIso).limit(1000),
      ]);

      const bizName = new Map<string, string>();
      (businesses.data ?? []).forEach((b: any) => bizName.set(b.id, b.name));

      return {
        today: ledgerToday.data ?? [],
        month: ledgerMonth.data ?? [],
        alerts: alertsOpen.data ?? [],
        approvals: approvalsPending.data ?? [],
        agents: agentControls.data ?? [],
        budgets: budgets.data ?? [],
        businesses: businesses.data ?? [],
        bizName,
        quality: qualityScores.data ?? [],
      };
    },
  });
}

// ---------------------------------------------------------------------------

function ActionCard({
  icon: Icon, title, body, severity = "info", count, primaryHref, primaryLabel = "Open", actions,
}: {
  icon: any; title: string; body: string; severity?: Sev; count?: number;
  primaryHref?: string; primaryLabel?: string;
  actions?: Array<{ label: string; href?: string; onClick?: () => void; variant?: "outline" | "default" | "secondary" | "destructive" }>;
}) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" /> {title}
            {typeof count === "number" && (
              <Badge variant="outline" className={`ml-1 ${sevTone[severity]}`}>{count}</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className={sevTone[severity]}>{severity}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        <div className="flex flex-wrap gap-2">
          {primaryHref && (
            <Button asChild size="sm" variant="default">
              <Link to={primaryHref}>{primaryLabel} <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          )}
          {actions?.map((a, i) =>
            a.href ? (
              <Button key={i} asChild size="sm" variant={a.variant ?? "outline"}>
                <Link to={a.href}>{a.label}</Link>
              </Button>
            ) : (
              <Button key={i} size="sm" variant={a.variant ?? "outline"} onClick={a.onClick}>
                {a.label}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AIFounderActionBoard() {
  const qc = useQueryClient();

  const { data, isLoading } = useActionBoardData();

  // Derived metrics
  const derived = useMemo(() => {
    if (!data) return null;
    const today = data.today;
    const month = data.month;

    const spendToday = today.reduce((a: number, r: any) => a + Number(r.estimated_cost || 0), 0);
    const spendMonth = month.reduce((a: number, r: any) => a + Number(r.estimated_cost || 0), 0);
    const humanSaved = month.reduce((a: number, r: any) => a + Number(r.human_equivalent_cost || 0), 0);
    const pipeline = month.reduce((a: number, r: any) => a + Number(r.pipeline_linked_amount || 0), 0);
    const revenue = month.reduce((a: number, r: any) => a + Number(r.revenue_linked_amount || 0), 0);
    const netSaving = humanSaved - spendMonth;

    // Per-business / per-agent month aggregates
    const byBiz = new Map<string, { spend: number; revenue: number; pipeline: number; humanSaved: number; rows: number; approved: number; total: number }>();
    const byAgent = new Map<string, { spend: number; humanSaved: number; revenue: number; pipeline: number; rows: number; approved: number; total: number; business_id?: string | null }>();
    for (const r of month as any[]) {
      const b = byBiz.get(r.business_id) ?? { spend: 0, revenue: 0, pipeline: 0, humanSaved: 0, rows: 0, approved: 0, total: 0 };
      b.spend += Number(r.estimated_cost || 0);
      b.revenue += Number(r.revenue_linked_amount || 0);
      b.pipeline += Number(r.pipeline_linked_amount || 0);
      b.humanSaved += Number(r.human_equivalent_cost || 0);
      b.rows += 1;
      if (r.status === "completed") b.total += 1;
      if (r.human_approved) b.approved += 1;
      byBiz.set(r.business_id, b);

      if (r.agent_id) {
        const a = byAgent.get(r.agent_id) ?? { spend: 0, humanSaved: 0, revenue: 0, pipeline: 0, rows: 0, approved: 0, total: 0, business_id: r.business_id };
        a.spend += Number(r.estimated_cost || 0);
        a.humanSaved += Number(r.human_equivalent_cost || 0);
        a.revenue += Number(r.revenue_linked_amount || 0);
        a.pipeline += Number(r.pipeline_linked_amount || 0);
        a.rows += 1;
        if (r.status === "completed") a.total += 1;
        if (r.human_approved) a.approved += 1;
        byAgent.set(r.agent_id, a);
      }
    }

    // Today by business / agent
    const todayByBiz = new Map<string, number>();
    const todayByAgent = new Map<string, { spend: number; business_id?: string | null }>();
    for (const r of today as any[]) {
      todayByBiz.set(r.business_id, (todayByBiz.get(r.business_id) ?? 0) + Number(r.estimated_cost || 0));
      if (r.agent_id) {
        const a = todayByAgent.get(r.agent_id) ?? { spend: 0, business_id: r.business_id };
        a.spend += Number(r.estimated_cost || 0);
        todayByAgent.set(r.agent_id, a);
      }
    }

    // Alerts buckets
    const alertsByType = new Map<string, number>();
    for (const a of data.alerts as any[]) alertsByType.set(a.alert_type, (alertsByType.get(a.alert_type) ?? 0) + 1);

    // Bypass / gateway counts (today)
    const gatewayCallsToday = today.filter((r: any) =>
      r.audit_metadata?.enforced_by?.startsWith?.("aiGateway") || r.audit_metadata?.enforced_by === "edge:aiGateway"
    ).length;
    const bypassCallsToday = today.length - gatewayCallsToday;
    const failedToday = today.filter((r: any) => r.status === "failed").length;
    const duplicatesPrevented = (alertsByType.get("duplicate_prevented") ?? 0);
    const redactions = (alertsByType.get("redaction") ?? 0);
    const pausedAgents = (data.agents as any[]).filter((a) => a.active === false).length;

    // Low ROI agents (poor or stop)
    const lowRoiAgents = [...byAgent.entries()]
      .map(([id, v]) => ({
        id, ...v,
        roi: v.spend > 0 ? (v.revenue + v.pipeline * 0.2 + v.humanSaved) / v.spend : null,
      }))
      .filter((x) => x.spend > 1 && (x.roi === null || (x.roi as number) < 1));

    // Highest ROI business
    const bizRoi = [...byBiz.entries()].map(([id, v]) => ({
      id, ...v,
      roi: v.spend > 0 ? (v.revenue + v.pipeline * 0.2 + v.humanSaved) / v.spend : 0,
    })).sort((a, b) => b.roi - a.roi);
    const bestBiz = bizRoi[0];
    const worstBiz = bizRoi[bizRoi.length - 1];

    const agentRoi = [...byAgent.entries()].map(([id, v]) => ({
      id, ...v,
      roi: v.spend > 0 ? (v.revenue + v.pipeline * 0.2 + v.humanSaved) / v.spend : 0,
      approvalRate: v.total > 0 ? v.approved / v.total : 0,
    }));
    const bestAgent = [...agentRoi].sort((a, b) => b.roi - a.roi)[0];
    const bestApprovalAgent = [...agentRoi].filter((a) => a.total >= 3).sort((a, b) => b.approvalRate - a.approvalRate)[0];

    // Businesses with no configured budget
    const budgetByBiz = new Set((data.budgets as any[]).filter((b) => b.active !== false).map((b) => b.business_id));
    const noBudgetBiz = (data.businesses as any[]).filter((b) => !budgetByBiz.has(b.id));

    // Quality scores — poor agents
    const poorQuality = (data.quality as any[]).filter((q) => q.rejected === true || Number(q.output_quality_score ?? 1) < 0.5 || Number(q.usefulness_score ?? 1) < 0.5 || q.feedback_label === "poor" || q.feedback_label === "reject");

    // High cost campaigns today
    const campaignSpendToday = new Map<string, number>();
    for (const r of today as any[]) {
      if (r.campaign_id) campaignSpendToday.set(r.campaign_id, (campaignSpendToday.get(r.campaign_id) ?? 0) + Number(r.estimated_cost || 0));
    }
    const highCostCampaigns = [...campaignSpendToday.entries()].filter(([, s]) => s > 5);

    // Cost per useful action (month)
    const usefulActions = month.filter((r: any) => r.status === "completed" && (r.human_approved || Number(r.revenue_linked_amount) > 0 || Number(r.pipeline_linked_amount) > 0)).length;
    const costPerUseful = usefulActions > 0 ? spendMonth / usefulActions : null;
    const approvedCount = month.filter((r: any) => r.human_approved).length;
    const costPerApproved = approvedCount > 0 ? spendMonth / approvedCount : null;
    const rejectedCount = month.filter((r: any) => r.status === "blocked" || r.status === "failed").length;
    const costPerRejected = rejectedCount > 0 ? spendMonth / rejectedCount : null;

    return {
      spendToday, spendMonth, humanSaved, pipeline, revenue, netSaving,
      gatewayCallsToday, bypassCallsToday, failedToday,
      duplicatesPrevented, redactions, pausedAgents,
      alertsByType,
      lowRoiAgents, highCostCampaigns,
      bestBiz, worstBiz, bestAgent, bestApprovalAgent,
      noBudgetBiz, poorQuality,
      todayByBiz, todayByAgent, byBiz, byAgent,
      costPerUseful, costPerApproved, costPerRejected,
    };
  }, [data]);

  const nameOf = (id: string | null | undefined) => (id && data?.bizName.get(id)) || (id ? id.slice(0, 8) : "—");

  async function acknowledgeAlert(id: string) {
    const { error } = await supabase.from("ai_cost_alerts").update({ status: "acknowledged", acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Could not acknowledge", description: error.message, variant: "destructive" });
    else { toast({ title: "Alert acknowledged" }); qc.invalidateQueries({ queryKey: ["founder_action_board"] }); }
  }
  async function pauseAgent(agentId: string, paused: boolean) {
    const { error } = await supabase.from("ai_agent_cost_controls").update({ active: !paused }).eq("agent_id", agentId);
    if (error) toast({ title: "Could not update", description: error.message, variant: "destructive" });
    else { toast({ title: paused ? "Agent paused" : "Agent resumed" }); qc.invalidateQueries({ queryKey: ["founder_action_board"] }); }
  }

  // -------------------------------------------------------------------------
  // Section 1: What needs attention today
  // -------------------------------------------------------------------------
  const attentionCards = useMemo(() => {
    if (!derived) return [];
    const cards: Array<React.ReactNode> = [];

    cards.push(
      <ActionCard key="approvals" icon={ShieldCheck}
        title="Approvals waiting" severity={data!.approvals.length > 5 ? "high" : data!.approvals.length > 0 ? "warning" : "info"}
        count={data!.approvals.length}
        body={data!.approvals.length === 0
          ? "No approvals waiting. External and high-risk actions will appear here when AI prepares them."
          : `${data!.approvals.length} item(s) waiting before external action can leave the system. Nothing is sent without your approval.`}
        primaryHref="/founder/ai-cost/approvals" primaryLabel="Review approvals"
        actions={[{ label: "View ledger", href: "/founder/ai-cost/ledger" }]}
      />
    );

    const budgetWarn = derived.alertsByType.get("budget_warning") ?? 0;
    cards.push(
      <ActionCard key="budget" icon={PoundSterling}
        title="Budget warnings" severity={budgetWarn > 0 ? "high" : "info"} count={budgetWarn}
        body={budgetWarn === 0
          ? "All businesses are within budget today. System continues live."
          : `${budgetWarn} business budget threshold(s) exceeded today. Only flagged actions are restricted — the rest of the system remains live.`}
        primaryHref="/founder/ai-cost/budgets" primaryLabel="Open budget settings"
        actions={[{ label: "View alerts", href: "/founder/ai-cost/alerts" }]}
      />
    );

    const costAlerts = [...derived.alertsByType.entries()]
      .filter(([t]) => !["redaction", "prompt_injection", "pricing_missing", "duplicate_prevented", "budget_warning"].includes(t))
      .reduce((a, [, n]) => a + n, 0);
    cards.push(
      <ActionCard key="costAlerts" icon={Siren}
        title="Cost alerts" severity={costAlerts > 0 ? "high" : "info"} count={costAlerts}
        body={costAlerts === 0
          ? "No cost alerts open. Stop-loss and per-agent caps are active."
          : `${costAlerts} open cost alert(s). Review the recommended action on each before acknowledging.`}
        primaryHref="/founder/ai-cost/alerts" primaryLabel="Open alerts"
      />
    );

    cards.push(
      <ActionCard key="paused" icon={PauseCircle}
        title="Paused agents" severity={derived.pausedAgents > 0 ? "warning" : "info"} count={derived.pausedAgents}
        body={derived.pausedAgents === 0
          ? "No agents are paused. All cost-controlled agents are live."
          : `${derived.pausedAgents} agent(s) are paused. Resume only after confirming the underlying issue is fixed.`}
        primaryHref="/founder/ai-cost/agent-controls" primaryLabel="Open agent controls"
      />
    );

    cards.push(
      <ActionCard key="lowRoi" icon={TrendingDown}
        title="Low ROI agents" severity={derived.lowRoiAgents.length > 0 ? "warning" : "info"} count={derived.lowRoiAgents.length}
        body={derived.lowRoiAgents.length === 0
          ? "All agents with measurable spend are returning value. Nothing to review."
          : `${derived.lowRoiAgents.length} agent(s) have AI cost above value created this month. Consider downgrading model tier or pausing.`}
        primaryHref="/founder/ai-cost/roi" primaryLabel="Open ROI engine"
        actions={[{ label: "Open agent controls", href: "/founder/ai-cost/agent-controls" }]}
      />
    );

    cards.push(
      <ActionCard key="hiCampaign" icon={Activity}
        title="High-cost campaigns today" severity={derived.highCostCampaigns.length > 0 ? "warning" : "info"} count={derived.highCostCampaigns.length}
        body={derived.highCostCampaigns.length === 0
          ? "No campaign has spiked in spend today."
          : `${derived.highCostCampaigns.length} campaign(s) spent more than expected today. Review agent cost controls.`}
        primaryHref="/founder/ai-cost/agent-controls" primaryLabel="Open agent controls"
        actions={[{ label: "View ledger", href: "/founder/ai-cost/ledger" }]}
      />
    );

    const pricingMissing = derived.alertsByType.get("pricing_missing") ?? 0;
    cards.push(
      <ActionCard key="pricing" icon={Coins}
        title="Missing provider pricing" severity={pricingMissing > 0 ? "warning" : "info"} count={pricingMissing}
        body={pricingMissing === 0
          ? "All AI calls today have priced models. Cost tracking is accurate."
          : "Pricing missing for at least one model. Add pricing so costs can be calculated accurately."}
        primaryHref="/founder/ai-cost/pricing" primaryLabel="Open Provider Pricing"
      />
    );

    const injection = derived.alertsByType.get("prompt_injection") ?? 0;
    cards.push(
      <ActionCard key="injection" icon={ShieldAlert}
        title="Prompt injection warnings" severity={injection > 0 ? "critical" : "info"} count={injection}
        body={injection === 0
          ? "No prompt injection markers detected in untrusted input."
          : `${injection} untrusted input(s) flagged. No injected instruction was followed. Confirm sources are still trusted.`}
        primaryHref="/founder/ai-cost/security" primaryLabel="Open security centre"
        actions={[{ label: "Open alerts", href: "/founder/ai-cost/alerts" }]}
      />
    );

    const redactions = derived.alertsByType.get("redaction") ?? 0;
    cards.push(
      <ActionCard key="redaction" icon={ShieldCheck}
        title="Redaction / security events" severity={redactions > 0 ? "warning" : "info"} count={redactions}
        body={redactions === 0
          ? "No secrets detected in AI input today."
          : `${redactions} secret pattern(s) redacted. Raw values are not stored. Confirm redaction rules cover the source.`}
        primaryHref="/founder/ai-cost/security" primaryLabel="Open security centre"
      />
    );

    cards.push(
      <ActionCard key="failed" icon={XCircle}
        title="Failed AI actions today" severity={derived.failedToday > 0 ? "warning" : "info"} count={derived.failedToday}
        body={derived.failedToday === 0
          ? "No failed AI actions today."
          : `${derived.failedToday} AI action(s) failed today. Open the ledger to view trace and reason.`}
        primaryHref="/founder/ai-cost/ledger" primaryLabel="View ledger"
      />
    );

    cards.push(
      <ActionCard key="dup" icon={CheckCircle2}
        title="Duplicate actions prevented" severity="info" count={derived.duplicatesPrevented}
        body={derived.duplicatesPrevented === 0
          ? "No duplicate AI calls were prevented today."
          : `Idempotency stopped ${derived.duplicatesPrevented} duplicate call(s) — money saved.`}
        primaryHref="/founder/ai-cost/ledger" primaryLabel="View ledger"
      />
    );

    cards.push(
      <ActionCard key="needReview" icon={Bot}
        title="Agents needing review" severity={derived.lowRoiAgents.length + derived.poorQuality.length > 0 ? "warning" : "info"}
        count={derived.lowRoiAgents.length + derived.poorQuality.length}
        body="Agents flagged by ROI or quality scoring. Use this list to prioritise weekly review."
        primaryHref="/founder/ai-cost/agent-controls" primaryLabel="Open agent controls"
        actions={[{ label: "Open quality", href: "/founder/ai-cost/quality" }]}
      />
    );

    cards.push(
      <ActionCard key="noBudget" icon={Wallet}
        title="Businesses with no AI budget" severity={derived.noBudgetBiz.length > 0 ? "warning" : "info"} count={derived.noBudgetBiz.length}
        body={derived.noBudgetBiz.length === 0
          ? "Every business has an AI budget configured."
          : `${derived.noBudgetBiz.length} business(es) have no AI budget set. Configure one to enable proper cost control.`}
        primaryHref="/founder/ai-cost/budgets" primaryLabel="Open budget settings"
      />
    );

    cards.push(
      <ActionCard key="quality" icon={Gauge}
        title="Agents with poor quality score" severity={derived.poorQuality.length > 0 ? "warning" : "info"} count={derived.poorQuality.length}
        body={derived.poorQuality.length === 0
          ? "All scored agents are above the quality threshold."
          : `${derived.poorQuality.length} quality entr(y/ies) below threshold. Review the agent and tighten prompts or model tier.`}
        primaryHref="/founder/ai-cost/quality" primaryLabel="Open quality scoring"
      />
    );

    const costNoValue = derived.lowRoiAgents.filter((a) => a.revenue === 0 && a.pipeline === 0 && a.humanSaved === 0).length;
    cards.push(
      <ActionCard key="costNoValue" icon={AlertTriangle}
        title="Workflows costing money but no value" severity={costNoValue > 0 ? "high" : "info"} count={costNoValue}
        body={costNoValue === 0
          ? "Every workflow with cost has linked at least some value this month."
          : `${costNoValue} agent(s) accumulated AI cost with no linked revenue, pipeline or time saving. Investigate before scaling.`}
        primaryHref="/founder/ai-cost/finance" primaryLabel="Open Finance Pack"
      />
    );

    return cards;
  }, [derived, data]);

  // -------------------------------------------------------------------------
  // Section 4: Recommended decisions
  // -------------------------------------------------------------------------
  const recommendations = useMemo(() => {
    if (!derived) return [];
    const recs: Array<{ kind: string; tone: Sev; reason: string; action?: { label: string; href: string } }> = [];

    if (derived.bestAgent && derived.bestAgent.roi > 3 && derived.bestAgent.spend > 1) {
      recs.push({ kind: "Scale", tone: "info",
        reason: `Agent ${derived.bestAgent.id.slice(0, 8)} has ROI ${derived.bestAgent.roi.toFixed(1)}× on ${fmtGBP(derived.bestAgent.spend)} spend this month.`,
        action: { label: "Open agent controls", href: "/founder/ai-cost/agent-controls" } });
    }
    if (derived.bestBiz && derived.bestBiz.roi > 2) {
      recs.push({ kind: "Keep", tone: "info",
        reason: `Business ${nameOf(derived.bestBiz.id)} is the highest-ROI business at ${derived.bestBiz.roi.toFixed(1)}×.`,
        action: { label: "Open Finance Pack", href: "/founder/ai-cost/finance" } });
    }
    if (derived.worstBiz && derived.worstBiz.spend > 1 && derived.worstBiz.roi < 0.5) {
      recs.push({ kind: "Watch", tone: "warning",
        reason: `Business ${nameOf(derived.worstBiz.id)} AI spend is rising faster than linked value (${derived.worstBiz.roi.toFixed(2)}×).`,
        action: { label: "Open budgets", href: "/founder/ai-cost/budgets" } });
    }
    if ((derived.alertsByType.get("pricing_missing") ?? 0) > 0) {
      recs.push({ kind: "Configure", tone: "warning",
        reason: "At least one model is missing pricing — cost tracking will be inaccurate until added.",
        action: { label: "Open Provider Pricing", href: "/founder/ai-cost/pricing" } });
    }
    if (derived.noBudgetBiz.length > 0) {
      recs.push({ kind: "Configure", tone: "warning",
        reason: `${derived.noBudgetBiz.length} business(es) have no AI budget configured.`,
        action: { label: "Open budgets", href: "/founder/ai-cost/budgets" } });
    }
    for (const a of derived.lowRoiAgents.slice(0, 3)) {
      const noValue = a.revenue === 0 && a.pipeline === 0 && a.humanSaved === 0;
      recs.push({ kind: noValue ? "Pause" : "Reduce", tone: noValue ? "high" : "warning",
        reason: noValue
          ? `Agent ${a.id.slice(0, 8)} cost ${fmtGBP(a.spend)} this month with no linked value.`
          : `Agent ${a.id.slice(0, 8)} ROI ${(a.roi ?? 0).toFixed(2)}× — downgrade model tier or tighten prompts.`,
        action: { label: "Open agent controls", href: "/founder/ai-cost/agent-controls" } });
    }
    if (data!.approvals.length > 0) {
      recs.push({ kind: "Approve", tone: "warning",
        reason: `${data!.approvals.length} approval item(s) waiting before external action can occur.`,
        action: { label: "Review approvals", href: "/founder/ai-cost/approvals" } });
    }
    if (derived.failedToday > 0) {
      recs.push({ kind: "Investigate", tone: "warning",
        reason: `${derived.failedToday} AI action(s) failed today — open ledger for trace.`,
        action: { label: "View ledger", href: "/founder/ai-cost/ledger" } });
    }
    if ((derived.alertsByType.get("prompt_injection") ?? 0) > 0) {
      recs.push({ kind: "Investigate", tone: "critical",
        reason: "Prompt injection markers detected in untrusted input. No instruction was followed, but confirm source.",
        action: { label: "Open security centre", href: "/founder/ai-cost/security" } });
    }
    if (derived.bestAgent && derived.bestAgent.roi < 1 && derived.bestAgent.spend > 5) {
      recs.push({ kind: "Retire", tone: "high",
        reason: `Best-ROI agent is still below break-even at ${derived.bestAgent.roi.toFixed(2)}× — consider retiring the workflow.`,
        action: { label: "Open Finance Pack", href: "/founder/ai-cost/finance" } });
    }
    return recs;
  }, [derived, data]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <AICostBreadcrumb page="Founder Action Board"
          description="Live daily cockpit. Internal preparation and logging run live. External and high-risk action requires explicit approval." />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> Founder Action Board
            </h1>
            <p className="text-sm text-muted-foreground">What needs attention, what is working, what to decide — today.</p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Live Operating Mode</Badge>
        </div>

        {isLoading || !derived ? (
          <Card className="tech-card"><CardContent className="py-8 text-center text-muted-foreground">Loading live data…</CardContent></Card>
        ) : (
          <>
            {/* Section 3: Live AI Operating Summary (placed up top for fast scan) */}
            <Card className="tech-card border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Live AI Operating Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <StatTile label="AI spend today" value={fmtGBP(derived.spendToday)} />
                  <StatTile label="AI spend this month" value={fmtGBP(derived.spendMonth)} />
                  <StatTile label="Human cost saved" value={fmtGBP(derived.humanSaved)} tone="good" />
                  <StatTile label="Net saving (month)" value={fmtGBP(derived.netSaving)} tone={derived.netSaving >= 0 ? "good" : "bad"} />
                  <StatTile label="Pipeline linked" value={fmtGBP(derived.pipeline)} />
                  <StatTile label="Revenue linked" value={fmtGBP(derived.revenue)} />
                  <StatTile label="Approval queue" value={data!.approvals.length} tone={data!.approvals.length > 0 ? "warn" : undefined} />
                  <StatTile label="Alerts open" value={data!.alerts.length} tone={data!.alerts.length > 0 ? "warn" : undefined} />
                  <StatTile label="Agents paused" value={derived.pausedAgents} />
                  <StatTile label="Gateway calls today" value={derived.gatewayCallsToday} />
                  <StatTile label="Bypass calls today" value={derived.bypassCallsToday} tone={derived.bypassCallsToday > 0 ? "warn" : "good"} />
                  <StatTile label="Failed actions today" value={derived.failedToday} tone={derived.failedToday > 0 ? "warn" : undefined} />
                </div>
              </CardContent>
            </Card>

            {/* Section 1: What needs attention today */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> What needs attention today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{attentionCards}</div>
            </div>

            {/* Section 2: What is working */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" /> What is working
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Highest ROI business"
                  value={derived.bestBiz ? `${derived.bestBiz.roi.toFixed(1)}×` : "—"}
                  hint={derived.bestBiz ? nameOf(derived.bestBiz.id) : "Will appear once agents create linked value"} tone="good" />
                <StatTile label="Best performing agent"
                  value={derived.bestAgent ? `${derived.bestAgent.roi.toFixed(1)}×` : "—"}
                  hint={derived.bestAgent ? derived.bestAgent.id.slice(0, 8) : "Will appear once ROI is measured"} tone="good" />
                <StatTile label="Best approved-output rate"
                  value={derived.bestApprovalAgent ? `${Math.round(derived.bestApprovalAgent.approvalRate * 100)}%` : "—"}
                  hint={derived.bestApprovalAgent ? `Agent ${derived.bestApprovalAgent.id.slice(0, 8)}` : "Will appear after approvals recorded"} tone="good" />
                <StatTile label="Biggest human time saving" value={fmtGBP(derived.humanSaved)} tone="good" hint="Linked human cost equivalent this month" />
                <StatTile label="Best cost→pipeline result"
                  value={derived.pipeline > 0 && derived.spendMonth > 0 ? `${(derived.pipeline / derived.spendMonth).toFixed(1)}×` : "—"} tone="good" />
                <StatTile label="Duplicate spend prevented" value={derived.duplicatesPrevented} tone="good" />
                <StatTile label="Secrets redacted (protection)" value={derived.redactions} tone="good" />
                <StatTile label="Gateway enforcement"
                  value={`${derived.gatewayCallsToday}/${derived.gatewayCallsToday + derived.bypassCallsToday || 0}`} tone={derived.bypassCallsToday === 0 ? "good" : "warn"} hint="enforced / total calls today" />
              </div>
            </div>

            {/* Section 4: Recommended decisions */}
            <Card className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Recommended founder decisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recommendations right now. The system will surface scale / watch / reduce / pause / configure suggestions as data accumulates.</p>
                )}
                {recommendations.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/60 p-3">
                    <div className="flex-1">
                      <Badge variant="outline" className={`${sevTone[r.tone]} mr-2`}>{r.kind}</Badge>
                      <span className="text-sm text-foreground">{r.reason}</span>
                    </div>
                    {r.action && (
                      <Button asChild size="sm" variant="outline"><Link to={r.action.href}>{r.action.label}</Link></Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Section 5: Today's AI Finance Snapshot */}
            <Card className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><PoundSterling className="h-4 w-4 text-primary" /> Today's AI finance snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Spend today by business</div>
                    {derived.todayByBiz.size === 0 ? (
                      <p className="text-xs text-muted-foreground">No AI spend recorded today.</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {[...derived.todayByBiz.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([bid, v]) => (
                          <li key={bid} className="flex justify-between border-b border-border/40 py-1">
                            <span>{nameOf(bid)}</span><span className="font-mono">{fmtGBP(v)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1"><Bot className="h-3 w-3" /> Spend today by agent</div>
                    {derived.todayByAgent.size === 0 ? (
                      <p className="text-xs text-muted-foreground">No agent spend recorded today.</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {[...derived.todayByAgent.entries()].sort((a, b) => b[1].spend - a[1].spend).slice(0, 8).map(([aid, v]) => (
                          <li key={aid} className="flex justify-between border-b border-border/40 py-1 gap-2">
                            <span className="truncate">{aid.slice(0, 8)} <span className="text-xs text-muted-foreground">({nameOf(v.business_id ?? null)})</span></span>
                            <span className="flex items-center gap-1">
                              <span className="font-mono">{fmtGBP(v.spend)}</span>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => pauseAgent(aid, true)}>Pause</Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatTile label="Cost / approved output" value={derived.costPerApproved == null ? "—" : fmtGBP(derived.costPerApproved)} />
                  <StatTile label="Cost / rejected output" value={derived.costPerRejected == null ? "—" : fmtGBP(derived.costPerRejected)} tone={derived.costPerRejected ? "warn" : undefined} />
                  <StatTile label="Cost / useful action" value={derived.costPerUseful == null ? "—" : fmtGBP(derived.costPerUseful)} />
                  <StatTile label="Cost / opportunity" value={derived.pipeline > 0 ? fmtGBP(derived.spendMonth / Math.max(1, (data!.month as any[]).filter((r: any) => Number(r.pipeline_linked_amount) > 0).length)) : "—"} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="text-xs uppercase text-emerald-400 mb-1">Best ROI today</div>
                    <div className="text-sm">
                      {derived.bestAgent ? <>Agent <code>{derived.bestAgent.id.slice(0, 8)}</code> — ROI <b>{derived.bestAgent.roi.toFixed(1)}×</b> on {fmtGBP(derived.bestAgent.spend)}</> : "—"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-xs uppercase text-destructive mb-1">Worst ROI today</div>
                    <div className="text-sm">
                      {derived.lowRoiAgents[0] ? <>Agent <code>{derived.lowRoiAgents[0].id.slice(0, 8)}</code> — ROI <b>{(derived.lowRoiAgents[0].roi ?? 0).toFixed(2)}×</b> on {fmtGBP(derived.lowRoiAgents[0].spend)}</> : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open alerts quick-action list */}
            {data!.alerts.length > 0 && (
              <Card className="tech-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Siren className="h-4 w-4 text-primary" /> Open alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data!.alerts as any[]).slice(0, 10).map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/60 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={sevTone[(a.severity as Sev) ?? "info"]}>{a.severity}</Badge>
                          <code className="text-[11px] text-muted-foreground">{a.alert_type}</code>
                        </div>
                        <p className="text-sm">{a.message}</p>
                        {a.recommended_action && <p className="text-xs text-muted-foreground mt-1">→ {a.recommended_action}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(a.id)}>Acknowledge</Button>
                    </div>
                  ))}
                  <div className="pt-1">
                    <Button asChild size="sm" variant="ghost"><Link to="/founder/ai-cost/alerts">Open all alerts <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="tech-card border-primary/30">
              <CardContent className="pt-4 text-xs text-muted-foreground">
                Live-first principle: internal AI preparation, logging, dashboards and recommendations run live. External and high-risk actions (sending email, posts, investor/buyer contact, legal/tax/financial output, paid API activation) require explicit founder approval before they leave the system.
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </FounderLayout>
  );
}