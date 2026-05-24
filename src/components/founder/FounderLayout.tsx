import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileInput, GitBranch, FolderKanban, Activity, FileText, LogOut, Menu, X, Monitor, Bot, Workflow, Plug, Play, Command, Network, Layers, Rocket, BarChart3, Zap, BookOpen, Globe, Building2, Shield, ShieldAlert, ShieldCheck, LayoutTemplate, Sparkles, BookOpenCheck, ClipboardList, PoundSterling, Brain, Scale, Compass, MessageSquare, FlaskConical, Users, Banknote, Send, MessagesSquare, FileSignature, MonitorPlay, Briefcase, ClipboardCheck, Gavel, TrendingUp, Radar, Siren, Target, Calculator, Trophy, Handshake, Route, Coins } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Command Centre", to: "/founder/command-centre", icon: Command },
  { label: "Portfolio & Exit", to: "/founder/portfolio-exit", icon: Target },
  { label: "M&A Intelligence", to: "/founder/portfolio-exit/intelligence", icon: Radar },
  { label: "Exit Valuation", to: "/founder/portfolio-exit/valuation", icon: Calculator },
  { label: "Build Selector", to: "/founder/portfolio-exit/build-selector", icon: Trophy },
  { label: "Execution Handoff", to: "/founder/portfolio-exit/execution-handoff", icon: Handshake },
  { label: "Data Ingestion", to: "/founder/portfolio-exit/ingestion", icon: FileInput },
  { label: "Portfolio Manual", to: "/founder/portfolio-exit/manual", icon: BookOpenCheck },
  { label: "Controls Centre", to: "/founder/portfolio-exit/controls", icon: ShieldCheck },
  { label: "Hardening Centre", to: "/founder/portfolio-exit/hardening", icon: ShieldAlert },
  { label: "Release Gate", to: "/founder/portfolio-exit/release-gate", icon: Siren },
  { label: "AI Usage Ledger", to: "/founder/ai-cost/ledger", icon: Activity },
  { label: "AI Model Routing", to: "/founder/ai-cost/routing", icon: Route },
  { label: "AI Budgets", to: "/founder/ai-cost/budgets", icon: PoundSterling },
  { label: "Agent Cost Controls", to: "/founder/ai-cost/agent-controls", icon: Bot },
  { label: "AI Cost Alerts", to: "/founder/ai-cost/alerts", icon: Siren },
  { label: "AI ROI Engine", to: "/founder/ai-cost/roi", icon: TrendingUp },
  { label: "AI Approval Gates", to: "/founder/ai-cost/approvals", icon: ShieldCheck },
  { label: "Prompt Templates", to: "/founder/ai-cost/templates", icon: Sparkles },
  { label: "Cached Context", to: "/founder/ai-cost/context", icon: BookOpen },
  { label: "Provider Pricing", to: "/founder/ai-cost/pricing", icon: Coins },
  { label: "AI Quality Scoring", to: "/founder/ai-cost/quality", icon: Sparkles },
  { label: "AI Co-Pilot", to: "/founder/copilot", icon: MessageSquare },
  { label: "AI Brain", to: "/founder/brain", icon: Brain },
  { label: "Decisions", to: "/founder/decisions", icon: Scale },
  { label: "Strategy", to: "/founder/strategy", icon: Compass },
  { label: "Operations", to: "/founder/operations", icon: Globe },
  { label: "Organisations", to: "/founder/organisations", icon: Building2 },
  { label: "Overview", to: "/founder", icon: LayoutDashboard },
  { label: "Revenue", to: "/founder/revenue", icon: PoundSterling },
  { label: "Analytics", to: "/founder/analytics", icon: BarChart3 },
  { label: "Optimisation", to: "/founder/optimisation", icon: Zap },
  { label: "Proposals", to: "/founder/proposals", icon: FileInput },
  { label: "Lead Pipeline", to: "/founder/pipeline", icon: GitBranch },
  { label: "CRM", to: "/founder/crm", icon: Users },
  { label: "Finance", to: "/founder/finance", icon: Banknote },
  { label: "Outreach", to: "/founder/outreach", icon: Send },
  { label: "Sending Health", to: "/founder/sending", icon: Radar },
  { label: "Priority", to: "/founder/priority", icon: TrendingUp },
  { label: "System Oversight", to: "/founder/system", icon: Siren },
  { label: "Execution Modes", to: "/founder/system/modes", icon: Workflow },
  { label: "Conversations", to: "/founder/conversations", icon: MessagesSquare },
  { label: "Internal Proposals", to: "/founder/internal-proposals", icon: FileSignature },
  { label: "Demos", to: "/founder/demos", icon: MonitorPlay },
  { label: "Suppliers", to: "/founder/suppliers", icon: Briefcase },
  { label: "Assignments", to: "/founder/assignments", icon: ClipboardCheck },
  { label: "Compliance", to: "/founder/compliance", icon: ShieldCheck },
  { label: "Legal Console", to: "/founder/legal", icon: Gavel },
  { label: "Projects", to: "/founder/projects", icon: FolderKanban },
  { label: "Monitoring", to: "/founder/monitoring", icon: Monitor },
  { label: "Agents", to: "/founder/agents", icon: Bot },
  { label: "Workflows", to: "/founder/workflows", icon: Workflow },
  { label: "Executions", to: "/founder/executions", icon: Play },
  { label: "Processes", to: "/founder/processes", icon: Network },
  { label: "Architectures", to: "/founder/architectures", icon: Layers },
  { label: "Deployments", to: "/founder/deployments", icon: Rocket },
  { label: "Integrations", to: "/founder/integrations", icon: Plug },
  { label: "Activity", to: "/founder/activity", icon: Activity },
  { label: "Knowledge", to: "/founder/knowledge", icon: BookOpen },
  { label: "Access Control", to: "/founder/access-control", icon: Shield },
  { label: "Security", to: "/founder/security", icon: ShieldAlert },
  { label: "Templates", to: "/founder/templates", icon: LayoutTemplate },
  { label: "Expansion", to: "/founder/expansion", icon: Sparkles },
  { label: "Manual", to: "/founder/manual", icon: BookOpenCheck },
  { label: "System Mirror", to: "/founder/manual/full", icon: Layers },
  { label: "Build Log", to: "/founder/build-log", icon: ClipboardList },
  { label: "Documents", to: "/founder/documents", icon: FileText },
  { label: "Platform Testing", to: "/founder/testing", icon: FlaskConical },
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

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-border/50">
        <Link to="/founder" className="text-lg font-bold tracking-tight">
          <span className="text-foreground">Liftor</span>
          <span className="text-primary"> AI</span>
        </Link>
        <p className="text-xs text-primary mt-0.5 font-medium">Founder Console</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(item.to)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.to === "/founder/priority" && criticalCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                {criticalCount}
              </span>
            )}
            {item.to === "/founder/system" && systemCriticalCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                {systemCriticalCount}
              </span>
            )}
          </Link>
        ))}
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
