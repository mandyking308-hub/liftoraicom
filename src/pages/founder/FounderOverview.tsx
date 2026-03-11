import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { FileInput, FolderKanban, CheckCircle2, Activity, ArrowRight } from "lucide-react";

const FounderOverview = () => {
  const [stats, setStats] = useState({ proposals: 0, activeProjects: 0, nearCompletion: 0, recentActivity: 0 });
  const [recentProposals, setRecentProposals] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [proposalsRes, projectsRes, activityRes] = await Promise.all([
        supabase.from("proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const proposals = proposalsRes.data || [];
      const projects = projectsRes.data || [];
      const activities = activityRes.data || [];

      setStats({
        proposals: proposals.length,
        activeProjects: projects.filter((p) => p.status === "active").length,
        nearCompletion: projects.filter((p) => p.current_stage === "Launch" || p.current_stage === "Testing").length,
        recentActivity: activities.length,
      });

      setRecentProposals(proposals.slice(0, 5));
      setRecentActivities(activities.slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Founder Console</h1>
          <p className="text-muted-foreground mt-1">Operational overview of Liftor AI</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[
                { label: "Proposal Requests", value: stats.proposals, icon: FileInput, link: "/founder/proposals" },
                { label: "Active Projects", value: stats.activeProjects, icon: FolderKanban, link: "/founder/projects" },
                { label: "Near Completion", value: stats.nearCompletion, icon: CheckCircle2, link: "/founder/projects" },
                { label: "Recent Activity", value: stats.recentActivity, icon: Activity, link: "/founder/activity" },
              ].map((s) => (
                <Link key={s.label} to={s.link} className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <s.icon size={18} className="text-primary" />
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-3xl font-bold">{s.value}</p>
                </Link>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Recent proposals */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Proposals</h2>
                  <Link to="/founder/proposals" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
                </div>
                {recentProposals.length === 0 ? (
                  <div className="p-6 rounded-xl border border-border/50 bg-card text-center text-muted-foreground text-sm">No proposals yet.</div>
                ) : (
                  <div className="space-y-2">
                    {recentProposals.map((p) => (
                      <Link key={p.id} to={`/founder/proposals/${p.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{p.company_name}</p>
                          <p className="text-xs text-muted-foreground">{p.industry} · {p.project_types?.join(", ")}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity feed */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Activity</h2>
                  <Link to="/founder/activity" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
                </div>
                {recentActivities.length === 0 ? (
                  <div className="p-6 rounded-xl border border-border/50 bg-card text-center text-muted-foreground text-sm">No activity yet.</div>
                ) : (
                  <div className="space-y-2">
                    {recentActivities.map((a) => (
                      <div key={a.id} className="p-4 rounded-xl border border-border/50 bg-card">
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderOverview;
