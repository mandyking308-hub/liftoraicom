import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Clock, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  project_type: string;
  current_stage: string;
  status: string;
  start_date: string | null;
  expected_timeline: string | null;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
        setLoading(false);
      });
  }, []);

  return (
    <PortalLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">All your active and completed projects</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center">
            <p className="text-muted-foreground mb-2">No projects assigned yet.</p>
            <p className="text-sm text-muted-foreground">Projects will appear here once your Liftor AI engagement begins.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/portal/projects/${p.id}`}
                className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.project_type}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className={`px-2 py-0.5 rounded-full ${
                      p.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary"
                    }`}>{p.status}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {p.current_stage}</span>
                    {p.expected_timeline && <span>{p.expected_timeline}</span>}
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default Projects;
