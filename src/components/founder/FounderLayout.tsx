import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileInput, GitBranch, FolderKanban, Activity, FileText, LogOut, Menu, X, Monitor, Bot, Workflow, Plug, Play, Command, Network, Layers, Rocket, BarChart3, Zap, BookOpen, Globe, Building2, Shield, ShieldAlert, ShieldCheck, LayoutTemplate, Sparkles, BookOpenCheck, ClipboardList, PoundSterling, Brain, Scale, Compass, MessageSquare, FlaskConical, Users, Banknote, Send, MessagesSquare, FileSignature, MonitorPlay, Briefcase, ClipboardCheck, Gavel, TrendingUp, Radar, Siren, Target, Calculator, Trophy, Handshake, Coins, Flame, Swords, Cpu, ChevronDown, ChevronRight, Stethoscope, Megaphone, Settings, ArrowRightCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
import { founderAreas, areaRoute } from "@/lib/founderAreas";

/**
 * Sidebar is generated from the founder area registry (src/lib/founderAreas.ts):
 * Liftor HQ + one collapsed group per area. Older/duplicate pages are only listed on area pages.
 */
export const navGroups: NavGroup[] = [
  { label: "Liftor HQ", icon: LayoutDashboard, defaultOpen: true, items: [{ label: "Liftor HQ", to: "/founder", icon: LayoutDashboard }] },
  ...founderAreas.map((a) => ({
    label: `${a.n}. ${a.title}`,
    icon: Layers,
    items: [
      // Areas with a single page link straight to it; no in-between overview page.
      ...(a.sections.filter((x) => !x.legacy).length > 1 ? [{ label: `${a.title} overview`, to: areaRoute(a.key), icon: ArrowRightCircle }] : []),
      ...a.sections.filter((x) => !x.legacy).map((x) => ({ label: x.label, to: x.route, icon: ChevronRight })),
    ],
  })),
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

  useEffect(() => { document.body.classList.add("theme-light"); return () => document.body.classList.remove("theme-light"); }, []);
  return (
    <div className="theme-light min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-secondary fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full bg-secondary border-r border-border/50 flex flex-col z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 lg:ml-60">
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
