import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostGovernorPortfolio from "@/components/founder/ai/AICostGovernorPortfolio";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import AIGatewayHealthPanel from "@/components/founder/ai/AIGatewayHealthPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Building2, Bot, Siren, ShieldCheck, FileText, Settings as SettingsIcon,
  TrendingUp, Coins, Route as RouteIcon, PoundSterling, Sparkles, BookOpen,
  PauseCircle, FlaskConical, ListChecks, Cpu,
} from "lucide-react";

const SECTIONS: Array<{
  title: string;
  description: string;
  to: string;
  icon: any;
  items?: Array<{ label: string; to: string; icon: any }>;
}> = [
  {
    title: "First-Use Setup",
    description: "Live checklist for configuring the AI Cost Governor. Missing settings create warnings, not gates — Liftor operates live while you complete setup.",
    to: "/founder/ai-cost/first-use",
    icon: Sparkles,
  },
  {
    title: "First-Use Configuration (whole Liftor)",
    description: "Whole-system live configuration pack: Gateway, Cost, External Safety, Business setup, CRM, Outreach/Smartlead, Social, Finance, Portfolio/Exit, Manuals. Warnings + links, never a gate.",
    to: "/founder/first-use-configuration",
    icon: Sparkles,
  },
  {
    title: "Founder Action Board",
    description: "Daily live cockpit. What needs attention, what is working, what to decide — with one-click actions.",
    to: "/founder/ai-cost/action-board",
    icon: ListChecks,
  },
  {
    title: "Runtime & Orchestration",
    description: "Live runtime, step engine, per-agent concurrency, queue depth, bottlenecks and health cockpit.",
    to: "/founder/ai-cost/runtime",
    icon: Cpu,
    items: [
      { label: "AI Runtime", to: "/founder/ai-cost/runtime", icon: Cpu },
      { label: "Orchestration Live", to: "/founder/ai-cost/orchestration-live", icon: Activity },
      { label: "Runtime Health Cockpit", to: "/founder/ai-cost/health", icon: Activity },
    ],
  },
  {
    title: "Portfolio AI Overview",
    description: "Live AI spend, ROI, alerts, approvals and budget status across every business.",
    to: "/founder/ai-cost/live",
    icon: Activity,
  },
  {
    title: "Business AI Health",
    description: "AI spend, budget, ROI, top-cost & lowest-ROI agents per business. Click a row to drill in.",
    to: "/founder/ai-cost/budgets",
    icon: Building2,
  },
  {
    title: "Agent AI Health",
    description: "Per-agent spend, action volume, approval/rejection rate, ROI status and pause controls.",
    to: "/founder/ai-cost/agent-controls",
    icon: Bot,
  },
  {
    title: "Live Alerts",
    description: "Budget warnings, cost alerts, stop-loss, prompt injection, redaction, failed actions — each with recommended action.",
    to: "/founder/ai-cost/alerts",
    icon: Siren,
  },
  {
    title: "Human Approval Queue",
    description: "Only actions whose risk leaves the building: external emails, posts, investor/buyer contact, legal/financial-sensitive output.",
    to: "/founder/ai-cost/approvals",
    icon: ShieldCheck,
  },
  {
    title: "Monthly AI Finance Pack",
    description: "Monthly unit economics: cost per lead/opportunity/sale, quality-adjusted ROI, scale/keep/watch/reduce/pause/retire decisions.",
    to: "/founder/ai-cost/finance",
    icon: FileText,
  },
  {
    title: "Settings",
    description: "Configure pricing, routing, budgets, agent controls, templates, cached context, kill switch and security.",
    to: "/founder/ai-cost/pricing",
    icon: SettingsIcon,
    items: [
      { label: "Provider Pricing Registry", to: "/founder/ai-cost/pricing", icon: Coins },
      { label: "Model Routing Rules", to: "/founder/ai-cost/routing", icon: RouteIcon },
      { label: "Business Budgets", to: "/founder/ai-cost/budgets", icon: PoundSterling },
      { label: "Agent Cost Controls", to: "/founder/ai-cost/agent-controls", icon: Bot },
      { label: "Prompt Templates", to: "/founder/ai-cost/templates", icon: Sparkles },
      { label: "Cached Context", to: "/founder/ai-cost/context", icon: BookOpen },
      { label: "Queue Control & Kill Switch", to: "/founder/ai-cost/queue", icon: PauseCircle },
      { label: "Security & Redaction", to: "/founder/ai-cost/security", icon: ShieldCheck },
      { label: "Quality Scoring", to: "/founder/ai-cost/quality", icon: TrendingUp },
      { label: "ROI Engine", to: "/founder/ai-cost/roi", icon: TrendingUp },
      { label: "Usage Ledger", to: "/founder/ai-cost/ledger", icon: Activity },
      { label: "Sandbox (optional testing)", to: "/founder/ai-cost/sandbox", icon: FlaskConical },
    ],
  },
];

const DAILY_CHECKLIST = [
  "AI spend today",
  "Budget warnings",
  "Open cost alerts",
  "Approvals waiting",
  "Paused agents or campaigns",
  "Highest-cost agents",
  "Lowest-ROI agents",
  "Prompt injection or redaction events",
  "Recommended actions",
];

// 5-group simplified index over the AI Cost Governor surface.
// Daily-Driver Polish Pass 1 (section N of the pre-live cleanup report):
// no sub-pages are removed — this just lets the founder land on a
// grouped view instead of facing 20 separate links.
const AI_COST_GROUPS: Array<{
  title: string;
  description: string;
  links: Array<{ label: string; to: string }>;
}> = [
  {
    title: "Overview & Alerts",
    description: "Live portfolio AI spend, daily action board, alerts and approval queue.",
    links: [
      { label: "Portfolio Overview", to: "/founder/ai-cost/live" },
      { label: "Founder Action Board", to: "/founder/ai-cost/action-board" },
      { label: "Live Alerts", to: "/founder/ai-cost/alerts" },
      { label: "Human Approval Queue", to: "/founder/ai-cost/approvals" },
      { label: "First-Use Setup", to: "/founder/ai-cost/first-use" },
    ],
  },
  {
    title: "Usage Ledger & Costs",
    description: "Per-call usage, provider pricing, business budgets, ROI and monthly finance pack.",
    links: [
      { label: "Usage Ledger", to: "/founder/ai-cost/ledger" },
      { label: "Provider Pricing Registry", to: "/founder/ai-cost/pricing" },
      { label: "Business Budgets", to: "/founder/ai-cost/budgets" },
      { label: "ROI Engine", to: "/founder/ai-cost/roi" },
      { label: "Monthly AI Finance Pack", to: "/founder/ai-cost/finance" },
    ],
  },
  {
    title: "Model Routing & Runtime",
    description: "Routing rules, runtime, orchestration and queue / kill switch controls.",
    links: [
      { label: "Model Routing Rules", to: "/founder/ai-cost/routing" },
      { label: "AI Runtime", to: "/founder/ai-cost/runtime" },
      { label: "Orchestration Live", to: "/founder/ai-cost/orchestration-live" },
      { label: "Runtime Health Cockpit", to: "/founder/ai-cost/health" },
      { label: "Queue Control & Kill Switch", to: "/founder/ai-cost/queue" },
    ],
  },
  {
    title: "Agent Controls & Permissions",
    description: "Per-agent pause/limits, prompt templates, cached context and sandbox testing.",
    links: [
      { label: "Agent Cost Controls", to: "/founder/ai-cost/agent-controls" },
      { label: "Prompt Templates", to: "/founder/ai-cost/templates" },
      { label: "Cached Context", to: "/founder/ai-cost/context" },
      { label: "Sandbox (optional)", to: "/founder/ai-cost/sandbox" },
    ],
  },
  {
    title: "Quality / Security / Compliance",
    description: "Quality scoring, security & redaction — keep AI output trustworthy.",
    links: [
      { label: "Quality Scoring", to: "/founder/ai-cost/quality" },
      { label: "Security & Redaction", to: "/founder/ai-cost/security" },
    ],
  },
];

export default function AICostGovernorHub() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <AICostBreadcrumb
          page="Overview"
          description="Live monitoring and governance for every pound of AI spend across Liftor. Live by default — internal preparation, logging, dashboards, ROI and alerts run live. Founder approval is required only where action leaves the system or carries legal, financial, compliance or reputational risk."
          showHubLink={false}
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> AI Cost Governor + ROI Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Section landing inside the Liftor Command Centre.
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            Live Operating Mode
          </Badge>
        </div>

        {/* Daily checklist */}
        <Card className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Founder daily checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-muted-foreground list-disc ml-5">
              {DAILY_CHECKLIST.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </CardContent>
        </Card>

        {/* Grouped 5-tab quick index so the AI Cost surface stays scannable. */}
        <Card className="tech-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Cost Governor · grouped index</CardTitle>
            <p className="text-xs text-muted-foreground">
              Same pages as below, grouped into five themes. No sub-pages removed.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {AI_COST_GROUPS.map((g) => (
                <div key={g.title} className="rounded-md border border-border/60 p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{g.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{g.description}</p>
                  </div>
                  <ul className="space-y-1">
                    {g.links.map((l) => (
                      <li key={l.to}>
                        <Link
                          to={l.to}
                          className="block text-[11px] px-2 py-1 rounded border border-border/40 hover:border-primary/50 hover:text-primary text-muted-foreground"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live portfolio overview embedded */}
        <AICostGovernorPortfolio />

        {/* AI Gateway enforcement health */}
        <AIGatewayHealthPanel />

        {/* Section cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <Link to={s.to} className="hover:text-primary">{s.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{s.description}</p>
                {s.items && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.items.map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary"
                      >
                        <it.icon className="h-3 w-3" /> {it.label}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="tech-card border-primary/30">
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
            <p className="text-foreground font-medium">Live-first principle</p>
            <p>
              Liftor operates live by default. The AI Cost Governor monitors and controls live activity in real time.
              The system does not sit behind artificial readiness gates. Internal AI preparation, logging, analysis,
              routing, alerts and dashboards run live. Founder approval is required only where external action,
              legal/tax/financial/compliance risk, public reputation risk, investor/buyer contact or other high-risk
              activity is involved.
            </p>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}