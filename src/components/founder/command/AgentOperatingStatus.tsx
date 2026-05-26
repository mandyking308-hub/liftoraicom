import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight } from "lucide-react";

type Row = {
  key: string;
  name: string;
  status: "active" | "idle" | "paused" | "failed" | "needs_setup";
  lastAction: string;
  costToday: number;
  failures: number;
  approvalsGenerated: number;
  nextAction: string;
  to: string;
};

const statusCls: Record<Row["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  idle: "bg-muted text-muted-foreground border-border/60",
  paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  needs_setup: "bg-background/40 text-foreground border-border/60",
};

const CORE_AGENTS: Array<{ key: string; name: string; to: string; category: string }> = [
  { key: "liftor_brain", name: "Liftor Brain", to: "/founder/brain", category: "founder_copilot" },
  { key: "founder_copilot", name: "Founder Copilot", to: "/founder/brain", category: "founder_copilot" },
  { key: "ai_engagement_agent", name: "AI Engagement Agent", to: "/founder/conversations", category: "engagement" },
  { key: "lead_fit_classify", name: "Lead Fit Classifier", to: "/founder/priority", category: "qualification" },
  { key: "apollo_qualify", name: "Apollo Qualifier", to: "/founder/outreach/imports", category: "prospecting" },
  { key: "proposal_generator", name: "Proposal Generator", to: "/founder/proposals", category: "proposals" },
  { key: "business_daily_operating", name: "Daily Operating Loop", to: "/founder/business/daily-operating-loop", category: "operations" },
  { key: "business_weekly_review", name: "Weekly Review", to: "/founder/business/weekly-review", category: "operations" },
  { key: "social_brain", name: "Social Brain", to: "/founder/social", category: "social" },
  { key: "support_knowledge", name: "Support Knowledge Agent", to: "/founder/support", category: "support" },
  { key: "customer_sales_engine", name: "Customer Sales Engine", to: "/founder/customer-sales", category: "sales" },
  { key: "voice_sales_agent", name: "Voice Sales Agent", to: "/founder/customer-sales/voice-console", category: "sales" },
  { key: "inbound_call_agent", name: "Inbound Call Agent", to: "/founder/customer-sales/voice-console", category: "sales" },
  { key: "outbound_call_agent", name: "Outbound Call Agent", to: "/founder/customer-sales/voice-console", category: "sales" },
  { key: "sales_conversation_agent", name: "Sales Conversation Agent", to: "/founder/customer-sales/conversations", category: "sales" },
  { key: "objection_handling_agent", name: "Objection Handling Agent", to: "/founder/customer-sales/objections", category: "sales" },
  { key: "close_preparation_agent", name: "Close Preparation Agent", to: "/founder/customer-sales/close-engine", category: "sales" },
  { key: "follow_up_agent", name: "Follow-Up Agent", to: "/founder/customer-sales/follow-up", category: "sales" },
  { key: "human_handoff_agent", name: "Human Handoff Agent", to: "/founder/customer-sales/follow-up", category: "sales" },
  { key: "sales_manager_agent", name: "Sales Manager Agent", to: "/founder/sales-targets", category: "sales" },
  { key: "sales_target_planner", name: "Sales Target Planner", to: "/founder/sales-targets/activity-plan", category: "sales" },
  { key: "upgrade_agent", name: "Upgrade Agent", to: "/founder/customer-upgrades", category: "sales" },
  { key: "renewal_agent", name: "Renewal Agent", to: "/founder/customer-upgrades/renewals", category: "sales" },
  { key: "cross_sell_agent", name: "Cross-Sell Agent", to: "/founder/customer-upgrades/opportunities", category: "sales" },
  { key: "coaching_agent", name: "Sales Coaching Agent", to: "/founder/sales-coaching", category: "sales" },
  { key: "conversion_learning_agent", name: "Conversion Learning Agent", to: "/founder/sales-coaching/conversions", category: "sales" },
  { key: "revenue_manager_agent", name: "Revenue Manager Agent", to: "/founder/revenue-autopilot", category: "sales" },
  { key: "revenue_autopilot_orchestrator", name: "Revenue Autopilot Orchestrator", to: "/founder/revenue-autopilot/today", category: "sales" },
  { key: "quote_to_cash_agent", name: "Quote-to-Cash Agent", to: "/founder/quote-to-cash", category: "sales" },
  { key: "delivery_agent", name: "Delivery Agent", to: "/founder/delivery", category: "operations" },
  { key: "onboarding_agent", name: "Onboarding Agent", to: "/founder/customer-onboarding", category: "operations" },
  { key: "support_sla_agent", name: "Support SLA Agent", to: "/founder/support", category: "support" },
  { key: "invoice_payment_agent", name: "Invoice & Payment Agent", to: "/founder/quote-to-cash/invoices", category: "sales" },
  { key: "revenue_confirmation_agent", name: "Revenue Confirmation Agent", to: "/founder/quote-to-cash/revenue-confirmation", category: "sales" },
  { key: "complaints_agent", name: "Complaints Agent", to: "/founder/complaints", category: "support" },
  { key: "refund_review_agent", name: "Refund Review Agent", to: "/founder/complaints/refunds", category: "support" },
  { key: "dispute_evidence_agent", name: "Dispute Evidence Agent", to: "/founder/complaints/evidence", category: "support" },
  { key: "contract_agent", name: "Contract Agent", to: "/founder/contracts", category: "legal" },
  { key: "contract_renewal_agent", name: "Contract Renewal Agent", to: "/founder/contracts/renewals", category: "legal" },
  { key: "contract_risk_agent", name: "Contract Risk Agent", to: "/founder/contracts/risk", category: "legal" },
  { key: "vendor_agent", name: "Vendor Agent", to: "/founder/vendors", category: "operations" },
  { key: "vendor_cost_agent", name: "Vendor Cost Agent", to: "/founder/vendors/costs", category: "operations" },
  { key: "vendor_risk_agent", name: "Vendor Risk Agent", to: "/founder/vendors/risk", category: "operations" },
  { key: "human_oversight_agent", name: "Human Oversight Agent", to: "/founder/people", category: "operations" },
  { key: "operator_quality_agent", name: "Operator Quality Agent", to: "/founder/people/quality", category: "operations" },
  { key: "operator_access_agent", name: "Operator Access Agent", to: "/founder/people/access", category: "operations" },
  { key: "access_governance_agent", name: "Access Governance Agent", to: "/founder/access-governance", category: "security" },
  { key: "secret_rotation_agent", name: "Secret Rotation Agent", to: "/founder/access-governance/rotation", category: "security" },
  { key: "leak_prevention_agent", name: "Leak Prevention Agent", to: "/founder/access-governance/audit", category: "security" },
  { key: "privacy_agent", name: "Privacy Agent", to: "/founder/privacy", category: "security" },
  { key: "dsar_agent", name: "DSAR Agent", to: "/founder/privacy/dsar", category: "security" },
  { key: "breach_response_agent", name: "Breach Response Agent", to: "/founder/privacy/breaches", category: "security" },
  { key: "incident_agent", name: "Incident Agent", to: "/founder/incidents", category: "operations" },
  { key: "continuity_agent", name: "Continuity Agent", to: "/founder/incidents/continuity", category: "operations" },
  { key: "postmortem_agent", name: "Postmortem Agent", to: "/founder/incidents/postmortems", category: "operations" },
  { key: "adviser_pack_agent", name: "Adviser Pack Agent", to: "/founder/adviser-pack", category: "finance" },
  { key: "adviser_question_agent", name: "Adviser Question Agent", to: "/founder/adviser-pack/questions", category: "finance" },
  { key: "tax_sensitivity_agent", name: "Tax Sensitivity Agent", to: "/founder/adviser-pack/expenses", category: "finance" },
  { key: "founder_reporting_agent", name: "Founder Reporting Agent", to: "/founder/reports", category: "operations" },
  { key: "weekly_priorities_agent", name: "Weekly Priorities Agent", to: "/founder/reports/weekly", category: "operations" },
  { key: "portfolio_recommendation_agent", name: "Portfolio Recommendation Agent", to: "/founder/reports/portfolio", category: "operations" },
  { key: "product_qa_agent", name: "Product QA Agent", to: "/founder/product", category: "operations" },
  { key: "release_notes_agent", name: "Release Notes Agent", to: "/founder/product/releases", category: "operations" },
  { key: "rollback_advisor_agent", name: "Rollback Advisor Agent", to: "/founder/product/rollback", category: "operations" },
  { key: "data_quality_agent", name: "Data Quality Agent", to: "/founder/data-quality", category: "operations" },
  { key: "duplicate_detection_agent", name: "Duplicate Detection Agent", to: "/founder/data-quality/duplicates", category: "operations" },
  { key: "revenue_integrity_agent", name: "Revenue Integrity Agent", to: "/founder/data-quality/revenue-integrity", category: "finance" },
  { key: "knowledge_governance_agent", name: "Knowledge Governance Agent", to: "/founder/knowledge-governance", category: "operations" },
  { key: "conflict_resolution_agent", name: "Conflict Resolution Agent", to: "/founder/knowledge-governance/conflicts", category: "operations" },
  { key: "approved_claims_agent", name: "Approved Claims Agent", to: "/founder/knowledge-governance/approved-claims", category: "operations" },
  { key: "capacity_agent", name: "Capacity Agent", to: "/founder/capacity", category: "operations" },
  { key: "bottleneck_detection_agent", name: "Bottleneck Detection Agent", to: "/founder/capacity/bottlenecks", category: "operations" },
  { key: "workload_balancer_agent", name: "Workload Balancer Agent", to: "/founder/capacity/forecast", category: "operations" },
  { key: "marketplace_recruitment_agent", name: "Marketplace Recruitment Agent", to: "/founder/marketplace", category: "operations" },
  { key: "seller_qualification_agent", name: "Seller Qualification Agent", to: "/founder/marketplace/seller-prospects", category: "operations" },
  { key: "seller_onboarding_agent", name: "Seller Onboarding Agent", to: "/founder/marketplace/seller-onboarding", category: "operations" },
  { key: "seller_verification_agent", name: "Seller Verification Agent", to: "/founder/marketplace/seller-verification", category: "operations" },
  { key: "listing_review_agent", name: "Listing Review Agent", to: "/founder/marketplace/listings", category: "operations" },
  { key: "supply_demand_agent", name: "Supply / Demand Agent", to: "/founder/marketplace/supply-demand", category: "operations" },
  { key: "seller_operations_agent", name: "Seller Operations Agent", to: "/founder/marketplace/seller-accounts", category: "operations" },
  { key: "supply_quality_agent", name: "Supply Quality Agent", to: "/founder/marketplace/risk", category: "operations" },
  { key: "seller_payout_agent", name: "Seller Payout Agent", to: "/founder/marketplace/payouts", category: "finance" },
  { key: "seller_performance_agent", name: "Seller Performance Agent", to: "/founder/marketplace/seller-performance", category: "operations" },
  { key: "marketplace_growth_agent", name: "Marketplace Growth Agent", to: "/founder/marketplace/liquidity", category: "operations" },
  { key: "liquidity_balance_agent", name: "Liquidity Balance Agent", to: "/founder/marketplace/liquidity", category: "operations" },
  { key: "growth_action_agent", name: "Growth Action Agent", to: "/founder/marketplace/growth-actions", category: "operations" },
  { key: "business_archetype_agent", name: "Business Archetype Agent", to: "/founder/business-archetypes/classifier", category: "operations" },
  { key: "business_template_agent", name: "Business Template Agent", to: "/founder/business-templates/apply", category: "operations" },
  { key: "entity_mapping_agent", name: "Entity Mapping Agent", to: "/founder/entity-map", category: "operations" },
  { key: "launch_factory_agent", name: "Launch Factory Agent", to: "/founder/launch-factory", category: "operations" },
  { key: "integration_planner_agent", name: "Integration Planner Agent", to: "/founder/integration-map", category: "operations" },
  { key: "compliance_rules_agent", name: "Compliance Rules Agent", to: "/founder/business-compliance", category: "security" },
  { key: "context_guard_agent", name: "Context Guard Agent", to: "/founder/context-guard", category: "security" },
  { key: "portfolio_prioritisation_agent", name: "Portfolio Prioritisation Agent", to: "/founder/portfolio-prioritisation", category: "strategy" },
  { key: "resource_allocation_agent", name: "Resource Allocation Agent", to: "/founder/resource-allocation", category: "strategy" },
  { key: "portfolio_risk_agent", name: "Portfolio Risk Agent", to: "/founder/portfolio-risk", category: "security" },
  { key: "lifecycle_agent", name: "Lifecycle Agent", to: "/founder/business-lifecycle", category: "operations" },
  { key: "product_catalogue_agent", name: "Product Catalogue Agent", to: "/founder/product-catalogue", category: "operations" },
  { key: "pricing_agent", name: "Pricing Agent", to: "/founder/pricing-margin", category: "finance" },
  { key: "channel_strategy_agent", name: "Channel Strategy Agent", to: "/founder/channel-strategy", category: "growth" },
  { key: "attribution_agent", name: "Attribution Agent", to: "/founder/analytics-attribution", category: "analytics" },
];

export default function AgentOperatingStatus() {
  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["cc-agent-operating-status-v1"],
    refetchInterval: 60000,
    queryFn: async () => {
      const sb: any = supabase as any;
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [ledger, runtime, approvals] = await Promise.all([
        sb.from("ai_usage_ledger").select("task_category,action_type,cost_usd,created_at").gte("created_at", since),
        sb.from("ai_runtime_events").select("event_type,severity,metadata,created_at").gte("created_at", since),
        sb.from("founder_approval_items").select("approval_type,status,created_at").gte("created_at", since),
      ].map((p) => p.catch(() => ({ data: [] }))));

      return CORE_AGENTS.map((a) => {
        const used = (ledger.data ?? []).filter((l: any) =>
          l.task_category === a.category || (l.action_type ?? "").includes(a.key),
        );
        const cost = used.reduce((s: number, l: any) => s + Number(l.cost_usd ?? 0), 0);
        const failures = (runtime.data ?? []).filter((r: any) =>
          r.severity === "error" && ((r.metadata?.function ?? "").includes(a.key) || (r.event_type ?? "").includes(a.key)),
        ).length;
        const generated = (approvals.data ?? []).filter((ap: any) =>
          (ap.approval_type ?? "").includes(a.category) || (ap.approval_type ?? "").includes(a.key),
        ).length;
        const lastUse = used[0]?.created_at as string | undefined;

        let status: Row["status"] = used.length > 0 ? "active" : "idle";
        if (failures >= 3) status = "failed";

        let nextAction = "—";
        if (status === "failed") nextAction = "Investigate failures in Runtime Health";
        else if (status === "idle") nextAction = "No activity in 24h — run an internal task to warm it up";
        else if (generated > 0) nextAction = `Review ${generated} approval${generated === 1 ? "" : "s"} this agent created`;
        else nextAction = "Healthy — no action required";

        return {
          key: a.key,
          name: a.name,
          status,
          lastAction: lastUse ? new Date(lastUse).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "no activity (24h)",
          costToday: Math.round(cost * 100000) / 100000,
          failures,
          approvalsGenerated: generated,
          nextAction,
          to: a.to,
        };
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot size={14} className="text-primary" /> Agent operating status
            <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Live</Badge>
            <span className="ml-auto text-[11px] text-muted-foreground font-normal">All agents route through the AI Gateway. External actions remain locked.</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Agent</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Last action</th>
                  <th className="text-right p-2">Cost today</th>
                  <th className="text-right p-2">Failures (24h)</th>
                  <th className="text-right p-2">Approvals generated</th>
                  <th className="text-left p-2">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2"><Link to={r.to} className="font-medium hover:text-primary inline-flex items-center gap-1">{r.name} <ArrowRight size={10} /></Link></td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusCls[r.status]}`}>{r.status.replace("_", " ")}</Badge></td>
                    <td className="p-2 text-muted-foreground">{r.lastAction}</td>
                    <td className="p-2 text-right font-mono">${r.costToday.toFixed(5)}</td>
                    <td className={`p-2 text-right ${r.failures > 0 ? "text-destructive" : ""}`}>{r.failures}</td>
                    <td className="p-2 text-right">{r.approvalsGenerated}</td>
                    <td className="p-2 text-primary/90">{r.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}