import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileInput, GitBranch, FolderKanban, Activity, FileText, LogOut, Menu, X, Monitor, Bot, Workflow, Plug, Play, Command, Network, Layers, Rocket, BarChart3, Zap, BookOpen, Globe, Building2, Shield, ShieldAlert, ShieldCheck, LayoutTemplate, Sparkles, BookOpenCheck, ClipboardList, PoundSterling, Brain, Scale, Compass, MessageSquare, FlaskConical, Users, Banknote, Send, MessagesSquare, FileSignature, MonitorPlay, Briefcase, ClipboardCheck, Gavel, TrendingUp, Radar, Siren, Target, Calculator, Trophy, Handshake, Coins, Flame, Swords, Cpu, ChevronDown, ChevronRight, Stethoscope, Megaphone, Settings } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { label: string; to: string; icon: any; badge?: "priority" | "system" };
type NavGroup = { label: string; icon: any; defaultOpen?: boolean; items: NavItem[] };

/**
 * Lifecycle-grouped founder navigation.
 * Every previously-listed route is preserved; nothing is removed. Routes are
 * regrouped under the 10 lifecycle stages from
 * docs/liftor-master-site-lifecycle-map.md §I so daily founder use is navigable
 * without scrolling through hundreds of unrelated routes.
 */
const navGroups: NavGroup[] = [
  {
    label: "Control / Command Centre", icon: Command, defaultOpen: true,
    items: [
      { label: "Start Here", to: "/founder/start-here", icon: Sparkles },
      { label: "Business Setup Tunnel", to: "/founder/business-setup-tunnel", icon: Workflow },
      { label: "Daily Operator", to: "/founder/daily-operator", icon: ClipboardCheck },
      { label: "Founder User Guide", to: "/founder/user-guide", icon: BookOpenCheck },
      { label: "Command Centre", to: "/founder/command-centre", icon: Command },
      { label: "Overview", to: "/founder", icon: LayoutDashboard },
      { label: "Priority", to: "/founder/priority", icon: TrendingUp, badge: "priority" },
      { label: "Decisions", to: "/founder/decisions", icon: Scale },
      { label: "AI Co-Pilot", to: "/founder/copilot", icon: MessageSquare },
      { label: "AI Brain", to: "/founder/brain", icon: Brain },
      { label: "Strategy", to: "/founder/strategy", icon: Compass },
      { label: "Approval Queue", to: "/founder/ai-cost/approvals", icon: ClipboardCheck },
    ],
  },
  {
    label: "Opportunity", icon: Radar,
    items: [
      { label: "Lead Pipeline", to: "/founder/pipeline", icon: GitBranch },
      { label: "Proposals", to: "/founder/proposals", icon: FileInput },
      { label: "Internal Proposals", to: "/founder/internal-proposals", icon: FileSignature },
      { label: "Demos", to: "/founder/demos", icon: MonitorPlay },
      { label: "Relationship Intelligence", to: "/founder/relationship-intelligence", icon: Network },
      { label: "Funding Radar", to: "/founder/funding-radar/shortlist", icon: Radar },
      { label: "PR Radar", to: "/founder/global-pr-radar", icon: Megaphone },
    ],
  },
  {
    label: "Build", icon: Layers,
    items: [
      { label: "Quarterly Build Selector", to: "/founder/portfolio-exit/build-selector", icon: Trophy },
      { label: "Architectures", to: "/founder/architectures", icon: Layers },
      { label: "Workflows", to: "/founder/workflows", icon: Workflow },
      { label: "Agents", to: "/founder/agents", icon: Bot },
      { label: "Processes", to: "/founder/processes", icon: Network },
      { label: "Templates", to: "/founder/templates", icon: LayoutTemplate },
      { label: "Projects", to: "/founder/projects", icon: FolderKanban },
      { label: "Platform Testing", to: "/founder/testing", icon: FlaskConical },
    ],
  },
  {
    label: "Launch", icon: Rocket,
    items: [
      { label: "Deployments", to: "/founder/deployments", icon: Rocket },
      { label: "Executions", to: "/founder/executions", icon: Play },
      { label: "Execution Modes", to: "/founder/system/modes", icon: Workflow },
      { label: "Campaign Factory", to: "/founder/campaign-factory", icon: Rocket },
      { label: "Release Workflow", to: "/founder/release-workflow", icon: GitBranch },
    ],
  },
  {
    label: "Operate", icon: Activity,
    items: [
      { label: "Operations", to: "/founder/operations", icon: Globe },
      { label: "Organisations", to: "/founder/organisations", icon: Building2 },
      { label: "CRM", to: "/founder/crm", icon: Users },
      { label: "Billionaire Access", to: "/founder/crm/billionaire-access", icon: Coins },
      { label: "Conversations", to: "/founder/conversations", icon: MessagesSquare },
      { label: "Outreach", to: "/founder/outreach", icon: Send },
      { label: "Sending Health", to: "/founder/sending", icon: Radar },
      { label: "Suppliers", to: "/founder/suppliers", icon: Briefcase },
      { label: "Assignments", to: "/founder/assignments", icon: ClipboardCheck },
      { label: "Human Workforce Control", to: "/founder/human-workforce-control", icon: Users },
      { label: "Worker Manuals", to: "/founder/worker-manuals", icon: BookOpenCheck },
      { label: "Worker Help Audit", to: "/founder/worker-help-audit", icon: MessagesSquare },
      { label: "Video SOP Factory", to: "/founder/video-sop-factory", icon: MonitorPlay },
      { label: "Automation Book", to: "/founder/automation-book", icon: BookOpen },
      { label: "Manual", to: "/founder/manual", icon: BookOpenCheck },
      { label: "System Mirror", to: "/founder/manual/full", icon: Layers },
      // Finance Hub (umbrella entry — sub-routes kept alive in /founder/finance/*,
      // /founder/revenue, /founder/revenue-autopilot, /founder/quote-to-cash,
      // /founder/pricing-margin, /founder/collections, /founder/reconciliation,
      // /founder/portfolio-fx — surfaced as tabs inside Finance Hub).
      { label: "Finance Hub", to: "/founder/finance", icon: Banknote },
      { label: "Revenue", to: "/founder/revenue", icon: PoundSterling },
      // Marketing Hub (umbrella entry — sub-routes kept alive at /founder/social,
      // /founder/social-autopilot, /founder/campaign-factory, /founder/assets,
      // /founder/global-pr-radar, /founder/channel-strategy, /founder/analytics-attribution).
      { label: "Marketing Hub", to: "/founder/marketing", icon: Megaphone },
    ],
  },
  {
    label: "Scale", icon: TrendingUp,
    items: [
      { label: "Analytics", to: "/founder/analytics", icon: BarChart3 },
      { label: "Optimisation", to: "/founder/optimisation", icon: Zap },
      { label: "Expansion", to: "/founder/expansion", icon: Sparkles },
      { label: "Integrations", to: "/founder/integrations", icon: Plug },
      { label: "AI Runtime", to: "/founder/ai-cost/runtime", icon: Cpu },
      { label: "AI Orchestration Live", to: "/founder/ai-cost/orchestration-live", icon: Activity },
      { label: "AI Runtime Health", to: "/founder/ai-cost/health", icon: Activity },
    ],
  },
  {
    label: "Evidence", icon: FileText,
    items: [
      { label: "Documents", to: "/founder/documents", icon: FileText },
      { label: "Build Log", to: "/founder/build-log", icon: ClipboardList },
      { label: "Knowledge", to: "/founder/knowledge", icon: BookOpen },
      { label: "Data Room", to: "/founder/data-room", icon: FileSignature },
    ],
  },
  {
    label: "Exit", icon: Target,
    items: [
      { label: "Portfolio & Exit", to: "/founder/portfolio-exit", icon: Target },
      { label: "M&A Intelligence", to: "/founder/portfolio-exit/intelligence", icon: Radar },
      { label: "Exit Valuation", to: "/founder/portfolio-exit/valuation", icon: Calculator },
      { label: "Execution Handoff", to: "/founder/portfolio-exit/execution-handoff", icon: Handshake },
      { label: "Buyer Warm-Up", to: "/founder/portfolio-exit/buyer-warmup", icon: Flame },
      { label: "Investor Intel", to: "/founder/portfolio-exit/investors", icon: Banknote },
      { label: "Competitor Intel", to: "/founder/portfolio-exit/competitors", icon: Swords },
      { label: "Operating Panels", to: "/founder/portfolio-exit/operating-panels", icon: Coins },
      { label: "Data Ingestion", to: "/founder/portfolio-exit/ingestion", icon: FileInput },
      { label: "Portfolio Manual", to: "/founder/portfolio-exit/manual", icon: BookOpenCheck },
      { label: "Operating Status", to: "/founder/portfolio-exit/release-gate", icon: Activity },
    ],
  },
  {
    label: "Governance / Safety", icon: ShieldCheck,
    items: [
      { label: "Compliance", to: "/founder/compliance", icon: ShieldCheck },
      { label: "AI Compliance Control", to: "/founder/ai-compliance", icon: ShieldCheck },
      { label: "Legal Console", to: "/founder/legal", icon: Gavel },
      { label: "Healthcare Overlay", to: "/founder/healthcare-overlay", icon: Stethoscope },
      { label: "Access Control", to: "/founder/access-control", icon: Shield },
      { label: "Security", to: "/founder/security", icon: ShieldAlert },
      { label: "AI Cost Governor", to: "/founder/ai-cost", icon: Activity },
      { label: "AI Bypass Register", to: "/founder/portfolio-exit/ai-bypass-register", icon: ShieldAlert },
      { label: "Controls Centre", to: "/founder/portfolio-exit/controls", icon: ShieldCheck },
      { label: "Hardening Centre", to: "/founder/portfolio-exit/hardening", icon: ShieldAlert },
      { label: "System Oversight", to: "/founder/system", icon: Siren, badge: "system" },
      { label: "Monitoring", to: "/founder/monitoring", icon: Monitor },
      { label: "Activity", to: "/founder/activity", icon: Activity },
    ],
  },
  {
    label: "Settings / Admin", icon: Settings,
    items: [
      { label: "Portal Admin", to: "/founder/portal-admin", icon: Users },
    ],
  },
];

const FounderLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: criticalCount = 0 } = useQuery({
    queryKey: ["sidebar_priority_critical_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("priority_scores" as never)
        .select("id", { count: "exact", head: true })
        .eq("priority_level", "critical");
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: systemCriticalCount = 0 } = useQuery({
    queryKey: ["sidebar_system_critical_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("system_events" as never)
        .select("id", { count: "exact", head: true })
        .eq("resolved", false)
        .in("severity", ["critical", "high"]);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/portal/login");
  };

  const isActive = (to: string) => {
    if (to === "/founder") return location.pathname === "/founder";
    return location.pathname.startsWith(to);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of navGroups) {
      initial[g.label] = g.defaultOpen ?? g.items.some(i => isActive(i.to));
    }
    return initial;
  });
  const toggleGroup = (label: string) =>
    setOpenGroups((s) => ({ ...s, [label]: !s[label] }));

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-border/50">
        <Link to="/founder" className="text-lg font-bold tracking-tight">
          <span className="text-foreground">Liftor</span>
          <span className="text-primary"> AI</span>
        </Link>
        <p className="text-xs text-primary mt-0.5 font-medium">Founder Console</p>
      </div>

      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {navGroups.map((group) => {
          const open = openGroups[group.label];
          const GroupIcon = group.icon;
          return (
            <div key={group.label} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <GroupIcon size={12} />
                <span className="flex-1 text-left">{group.label}</span>
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {open && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={`${group.label}:${item.to}`}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon size={16} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === "priority" && criticalCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                          {criticalCount}
                        </span>
                      )}
                      {item.badge === "system" && systemCriticalCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                          {systemCriticalCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        <Link
          to="/portal/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <FolderKanban size={18} />
          Client Portal
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full bg-card border-r border-border/50 flex flex-col z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-60">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50">
          <Link to="/founder" className="text-lg font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default FounderLayout;
