import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileInput, GitBranch, FolderKanban, Activity, FileText, LogOut, Menu, X, Monitor, Bot, Workflow, Plug, Play, Command, Network, Layers, Rocket, BarChart3, Zap, BookOpen, Globe, Building2, Shield, ShieldAlert, LayoutTemplate, Sparkles, BookOpenCheck, ClipboardList, PoundSterling, Brain, Scale } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Command Center", to: "/founder/command-center", icon: Command },
  { label: "AI Brain", to: "/founder/brain", icon: Brain },
  { label: "Decisions", to: "/founder/decisions", icon: Scale },
  { label: "Operations", to: "/founder/operations", icon: Globe },
  { label: "Organisations", to: "/founder/organisations", icon: Building2 },
  { label: "Overview", to: "/founder", icon: LayoutDashboard },
  { label: "Revenue", to: "/founder/revenue", icon: PoundSterling },
  { label: "Analytics", to: "/founder/analytics", icon: BarChart3 },
  { label: "Optimisation", to: "/founder/optimisation", icon: Zap },
  { label: "Proposals", to: "/founder/proposals", icon: FileInput },
  { label: "Lead Pipeline", to: "/founder/pipeline", icon: GitBranch },
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
  { label: "Build Log", to: "/founder/build-log", icon: ClipboardList },
  { label: "Documents", to: "/founder/documents", icon: FileText },
];

const FounderLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            {item.label}
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
