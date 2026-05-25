import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ClipboardCheck, Activity, Bot, DollarSign, Send, MessageSquare,
  Users, FlaskConical, ShieldAlert, Briefcase, Banknote, Sparkles, ArrowRight, Phone, Flame, ShieldCheck,
  Target,
} from "lucide-react";

type Tone = "danger" | "warn" | "good" | "default";

const toneCls: Record<Tone, string> = {
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  default: "border-border/50 bg-background/40 text-foreground",
};

function Tile({
  label, value, hint, to, icon: Icon, tone = "default",
}: { label: string; value: number | string; hint?: string; to: string; icon: any; tone?: Tone }) {
  return (
    <Link to={to} className={`group block rounded-lg border p-3 transition-colors hover:border-primary/60 ${toneCls[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <Icon size={14} />
        <ArrowRight size={12} className="opacity-60 group-hover:opacity-100" />
      </div>
      <p className="mt-1.5 text-2xl font-bold leading-none">{value}</p>
      <p className="text-[11px] mt-1 opacity-90">{label}</p>
      {hint && <p className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{hint}</p>}
    </Link>
  );
}

export default function WhatNeedsAttentionToday() {
  const { data } = useQuery({
    queryKey: ["cc-attention-today-v1"],
    refetchInterval: 60000,
    queryFn: async () => {
      const sb: any = supabase as any;
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const head = { count: "exact" as const, head: true };
      const [
        approvalsPending, alertsOpen, gatewayFails24h, runtimeErrors24h,
        pricingMissing, budgetGaps, blockedQueue, smartleadSetup,
        crmWarnings, socialApprovals, supportEscalations, financePending,
        portfolioApprovals, injectionEvents, testRecords, salesCloseApprovals, salesFollowUp,
        salesHotSignals, salesSafetyWarnings, salesReadyToBuy, salesEscalations, salesConsentIssues, salesHandoffs,
        activeTargets, targetsBehind, targetsCritical,
        upgradeOpps, upgradeHot, upgradeApprovals, renewalsSoon,
      ] = await Promise.all([
        sb.from("founder_approval_items").select("id", head).eq("status", "pending"),
        sb.from("system_events").select("id", head).eq("resolved", false).in("severity", ["critical", "high"]),
        sb.from("ai_gateway_requests").select("id", head).gte("created_at", since24h).eq("ok", false),
        sb.from("ai_runtime_events").select("id", head).gte("created_at", since24h).eq("severity", "error"),
        sb.from("ai_provider_pricing").select("id", head).eq("active", true).eq("confidence", "estimated"),
        sb.from("ai_budgets").select("id", head).eq("is_active", true).is("monthly_budget_usd", null),
        sb.from("email_queue").select("id", head).eq("status", "blocked"),
        sb.from("system_events").select("id", head).eq("resolved", false).ilike("message", "%smartlead%"),
        sb.from("crm_health_warnings").select("id", head).eq("resolved", false),
        sb.from("social_post_drafts").select("id", head).in("approval_status", ["pending", "needs_review"]),
        sb.from("support_interaction_reviews").select("id", head).eq("escalation_required", true).neq("status", "resolved"),
        sb.from("invoices").select("id", head).eq("status", "pending_send"),
        sb.from("portfolio_exit_approvals").select("id", head).eq("status", "pending"),
        sb.from("ai_runtime_events").select("id", head).gte("created_at", since24h).in("event_type", ["prompt_injection_detected", "redaction_triggered"]),
        sb.from("founder_approval_items").select("id", head).eq("status", "pending").ilike("metadata->>source", "%LIVE_INTERNAL_TEST%"),
        sb.from("customer_sales_close_actions").select("id", head).eq("action_status", "approval_required"),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "follow_up_needed"),
        sb.from("customer_sales_conversations").select("id", head).gte("close_probability", 0.7),
        sb.from("customer_sales_safety_events").select("id", head).gte("created_at", since24h).in("severity", ["high", "critical"]),
        sb.from("customer_sales_conversations").select("id", head).eq("call_outcome", "ready_to_buy"),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "escalated"),
        sb.from("customer_sales_call_logs").select("id", head).eq("consent_recorded", false).not("transcript_text", "is", null),
        sb.from("customer_sales_human_handoff_tasks").select("id", head).eq("task_status", "open"),
        sb.from("sales_revenue_targets").select("id", head).eq("active", true),
        sb.from("sales_target_progress").select("id", head).eq("status", "behind"),
        sb.from("sales_target_progress").select("id", head).eq("status", "critical"),
        sb.from("customer_upgrade_opportunities").select("id", head).in("status", ["new", "watch"]),
        sb.from("customer_upgrade_opportunities").select("id", head).gte("urgency_score", 0.7).in("status", ["new", "watch", "approval_required"]),
        sb.from("customer_upgrade_opportunities").select("id", head).eq("status", "approval_required"),
        sb.from("customer_upgrade_opportunities").select("id", head).in("opportunity_type", ["renewal", "subscription_upgrade"]).lte("due_at", new Date(Date.now() + 30 * 86400000).toISOString()).not("due_at", "is", null),
      ].map((p) => p.catch(() => ({ count: 0 }))));
      return {
        approvalsPending: approvalsPending?.count ?? 0,
        alertsOpen: alertsOpen?.count ?? 0,
        gatewayFails: gatewayFails24h?.count ?? 0,
        runtimeErrors: runtimeErrors24h?.count ?? 0,
        pricingMissing: pricingMissing?.count ?? 0,
        budgetGaps: budgetGaps?.count ?? 0,
        blockedQueue: blockedQueue?.count ?? 0,
        smartleadSetup: smartleadSetup?.count ?? 0,
        crmWarnings: crmWarnings?.count ?? 0,
        socialApprovals: socialApprovals?.count ?? 0,
        supportEscalations: supportEscalations?.count ?? 0,
        financePending: financePending?.count ?? 0,
        portfolioApprovals: portfolioApprovals?.count ?? 0,
        injectionEvents: injectionEvents?.count ?? 0,
        testRecords: testRecords?.count ?? 0,
        salesCloseApprovals: salesCloseApprovals?.count ?? 0,
        salesFollowUp: salesFollowUp?.count ?? 0,
        salesHotSignals: salesHotSignals?.count ?? 0,
        salesSafetyWarnings: salesSafetyWarnings?.count ?? 0,
        salesReadyToBuy: salesReadyToBuy?.count ?? 0,
        salesEscalations: salesEscalations?.count ?? 0,
        salesConsentIssues: salesConsentIssues?.count ?? 0,
        salesHandoffs: salesHandoffs?.count ?? 0,
        activeTargets: activeTargets?.count ?? 0,
        targetsBehind: targetsBehind?.count ?? 0,
        targetsCritical: targetsCritical?.count ?? 0,
        upgradeOpps: upgradeOpps?.count ?? 0,
        upgradeHot: upgradeHot?.count ?? 0,
        upgradeApprovals: upgradeApprovals?.count ?? 0,
        renewalsSoon: renewalsSoon?.count ?? 0,
      };
    },
  });

  const d = data ?? {
    approvalsPending: 0, alertsOpen: 0, gatewayFails: 0, runtimeErrors: 0,
    pricingMissing: 0, budgetGaps: 0, blockedQueue: 0, smartleadSetup: 0,
    crmWarnings: 0, socialApprovals: 0, supportEscalations: 0, financePending: 0,
    portfolioApprovals: 0, injectionEvents: 0, testRecords: 0, salesCloseApprovals: 0, salesFollowUp: 0,
    salesHotSignals: 0, salesSafetyWarnings: 0, salesReadyToBuy: 0, salesEscalations: 0, salesConsentIssues: 0, salesHandoffs: 0,
    activeTargets: 0, targetsBehind: 0, targetsCritical: 0,
    upgradeOpps: 0, upgradeHot: 0, upgradeApprovals: 0, renewalsSoon: 0,
  };

  const tone = (n: number, warn = 1, danger = 5): Tone =>
    n >= danger ? "danger" : n >= warn ? "warn" : n === 0 ? "good" : "default";

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            What needs attention today
            <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Live operating check
            </Badge>
            <span className="ml-auto text-[11px] text-muted-foreground font-normal">
              Click any card to act. External actions remain locked unless approved.
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <Tile label="Approvals waiting" value={d.approvalsPending} to="/founder/ai-cost/approvals" icon={ClipboardCheck} tone={tone(d.approvalsPending)} />
            <Tile label="Urgent alerts" value={d.alertsOpen} to="/founder/ai-cost/alerts" icon={AlertTriangle} tone={tone(d.alertsOpen)} />
            <Tile label="Gateway failures (24h)" value={d.gatewayFails} to="/founder/ai-cost/runtime" icon={Activity} tone={tone(d.gatewayFails)} />
            <Tile label="Failed AI actions (24h)" value={d.runtimeErrors} to="/founder/ai-cost/runtime" icon={Bot} tone={tone(d.runtimeErrors)} />
            <Tile label="Pricing rows estimated" value={d.pricingMissing} to="/founder/ai-cost/pricing" icon={DollarSign} tone={d.pricingMissing > 0 ? "warn" : "good"} hint="approval required to verify" />
            <Tile label="Budgets missing" value={d.budgetGaps} to="/founder/ai-cost/budgets" icon={DollarSign} tone={tone(d.budgetGaps)} />
            <Tile label="Outreach blocked" value={d.blockedQueue} to="/founder/outreach/queue" icon={Send} tone={tone(d.blockedQueue, 1, 20)} />
            <Tile label="Smartlead setup issues" value={d.smartleadSetup} to="/founder/outreach/campaigns" icon={Send} tone={tone(d.smartleadSetup)} />
            <Tile label="CRM warnings" value={d.crmWarnings} to="/founder/crm" icon={Users} tone={tone(d.crmWarnings)} />
            <Tile label="Social posts to approve" value={d.socialApprovals} to="/founder/social" icon={MessageSquare} tone={tone(d.socialApprovals)} hint="external publish locked" />
            <Tile label="Support escalations" value={d.supportEscalations} to="/founder/support" icon={MessageSquare} tone={tone(d.supportEscalations)} />
            <Tile label="Finance items waiting" value={d.financePending} to="/founder/finance" icon={Banknote} tone={tone(d.financePending)} hint="approval required to send" />
            <Tile label="Portfolio/exit approvals" value={d.portfolioApprovals} to="/founder/portfolio" icon={Briefcase} tone={tone(d.portfolioApprovals)} />
            <Tile label="Security / injection events" value={d.injectionEvents} to="/founder/ai-cost/security" icon={ShieldAlert} tone={d.injectionEvents > 0 ? "danger" : "good"} />
            <Tile label="Test records to clear" value={d.testRecords} to="/founder/ai-cost/approvals" icon={FlaskConical} tone={tone(d.testRecords)} hint="LIVE_INTERNAL_TEST drill items" />
            <Tile label="Sales close actions awaiting approval" value={d.salesCloseApprovals} to="/founder/customer-sales/close-engine" icon={Phone} tone={tone(d.salesCloseApprovals)} hint="external send locked" />
            <Tile label="Sales follow-ups" value={d.salesFollowUp} to="/founder/customer-sales/follow-up" icon={Phone} tone={tone(d.salesFollowUp)} />
            <Tile label="Hot buying signals" value={d.salesHotSignals} to="/founder/customer-sales/conversations" icon={Flame} tone={d.salesHotSignals > 0 ? "warn" : "good"} hint=">=70% close probability" />
            <Tile label="Ready to buy" value={d.salesReadyToBuy} to="/founder/customer-sales/conversations" icon={Phone} tone={d.salesReadyToBuy > 0 ? "warn" : "good"} />
            <Tile label="Sales safety warnings" value={d.salesSafetyWarnings} to="/founder/customer-sales/safety" icon={ShieldCheck} tone={tone(d.salesSafetyWarnings)} hint="consent / prohibited claim / window" />
            <Tile label="Sales escalations" value={d.salesEscalations} to="/founder/customer-sales/conversations" icon={AlertTriangle} tone={tone(d.salesEscalations)} />
            <Tile label="Consent gaps on calls" value={d.salesConsentIssues} to="/founder/customer-sales/call-logs" icon={ShieldAlert} tone={tone(d.salesConsentIssues)} />
            <Tile label="Human handoffs open" value={d.salesHandoffs} to="/founder/customer-sales/follow-up" icon={Users} tone={tone(d.salesHandoffs)} />
            <Tile label="Active sales targets" value={d.activeTargets} to="/founder/sales-targets" icon={Target} tone={d.activeTargets > 0 ? "good" : "warn"} hint="reverse-engineered activity plan" />
            <Tile label="Targets behind pace" value={d.targetsBehind} to="/founder/sales-targets/gaps" icon={Target} tone={d.targetsBehind > 0 ? "warn" : "good"} />
            <Tile label="Targets critical" value={d.targetsCritical} to="/founder/sales-targets/gaps" icon={AlertTriangle} tone={d.targetsCritical > 0 ? "danger" : "good"} />
            <Tile label="Upgrade opportunities" value={d.upgradeOpps} to="/founder/customer-upgrades/opportunities" icon={TrendingUp} tone={d.upgradeOpps > 0 ? "warn" : "good"} />
            <Tile label="Hot upgrade signals" value={d.upgradeHot} to="/founder/customer-upgrades/opportunities" icon={Flame} tone={d.upgradeHot > 0 ? "warn" : "good"} hint="urgency >= 0.7" />
            <Tile label="Upgrade approvals waiting" value={d.upgradeApprovals} to="/founder/customer-upgrades/follow-up" icon={ClipboardCheck} tone={tone(d.upgradeApprovals)} hint="external send locked" />
            <Tile label="Renewals due (30d)" value={d.renewalsSoon} to="/founder/customer-upgrades/renewals" icon={Target} tone={d.renewalsSoon > 0 ? "warn" : "good"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}