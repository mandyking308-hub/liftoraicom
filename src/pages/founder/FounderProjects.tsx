import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { ArrowRight, Clock } from "lucide-react";

const FounderProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [projRes, profRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (profRes.data) {
        const map: Record<string, string> = {};
        profRes.data.forEach((p) => { map[p.id] = p.company_name || p.full_name || "Unknown"; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">All client projects</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">No projects yet.</div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/founder/projects/${p.id}`}
                className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{profiles[p.client_id] || "Unknown Client"} · {p.project_type}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock size={12} /> {p.current_stage}
                    {p.expected_timeline && <span className="ml-2">· {p.expected_timeline}</span>}
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderProjects;
