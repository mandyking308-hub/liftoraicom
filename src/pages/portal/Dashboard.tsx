import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { FolderKanban, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  project_type: string;
  current_stage: string;
  status: string;
  start_date: string | null;
  expected_timeline: string | null;
}

interface Update {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  project_id: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      if (profile?.full_name) setProfileName(profile.full_name);

      // Get projects
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (proj) setProjects(proj);

      // Get latest updates across projects
      const { data: upd } = await supabase
        .from("project_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (upd) setUpdates(upd);

      setLoading(false);
    };
    load();
  }, [user]);

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <PortalLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {profileName ? `Welcome back, ${profileName}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">Your project overview</p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="p-5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <FolderKanban size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Active Projects</span>
                </div>
                <p className="text-3xl font-bold">{activeProjects.length}</p>
              </div>
              <div className="p-5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Total Projects</span>
                </div>
                <p className="text-3xl font-bold">{projects.length}</p>
              </div>
              <div className="p-5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Latest Updates</span>
                </div>
                <p className="text-3xl font-bold">{updates.length}</p>
              </div>
            </div>

            {/* Projects */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Projects</h2>
                <Link to="/portal/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {projects.length === 0 ? (
                <div className="p-8 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">
                  No projects yet. Your projects will appear here once assigned.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {projects.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      to={`/portal/projects/${p.id}`}
                      className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold">{p.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{p.project_type}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>Stage: {p.current_stage}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Updates */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Latest Updates</h2>
              {updates.length === 0 ? (
                <div className="p-8 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">
                  No updates yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div key={u.id} className="p-4 rounded-xl border border-border/50 bg-card">
                      <p className="text-sm">{u.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{u.author_name}</span>
                        <span>·</span>
                        <span>{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default Dashboard;
