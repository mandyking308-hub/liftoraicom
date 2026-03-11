import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { ArrowLeft, CheckCircle2, Clock, Circle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  project_type: string;
  current_stage: string;
  status: string;
  start_date: string | null;
  expected_timeline: string | null;
}

interface Stage { id: string; name: string; status: string; order_index: number; }
interface Milestone { id: string; title: string; status: string; order_index: number; }
interface Update { id: string; content: string; author_name: string; created_at: string; }

const statusIcon = (status: string) => {
  if (status === "completed") return <CheckCircle2 size={16} className="text-primary" />;
  if (status === "in_progress") return <Clock size={16} className="text-yellow-400" />;
  return <Circle size={16} className="text-muted-foreground" />;
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [projRes, stagesRes, msRes, updRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("project_stages").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_updates").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      ]);
      if (projRes.data) setProject(projRes.data);
      if (stagesRes.data) setStages(stagesRes.data);
      if (msRes.data) setMilestones(msRes.data);
      if (updRes.data) setUpdates(updRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return <PortalLayout><p className="text-muted-foreground">Loading...</p></PortalLayout>;
  }

  if (!project) {
    return <PortalLayout><p className="text-muted-foreground">Project not found.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl">
        <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground mt-1">{project.project_type}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${
              project.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            }`}>{project.status}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            {project.start_date && <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>}
            {project.expected_timeline && <span>Timeline: {project.expected_timeline}</span>}
            <span>Current Stage: {project.current_stage}</span>
          </div>
        </div>

        {/* Stages */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Development Stages</h2>
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-card">
              Stages will appear here once your project begins.
            </p>
          ) : (
            <div className="space-y-2">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
                  {statusIcon(s.status)}
                  <span className="text-sm font-medium flex-1">{s.name}</span>
                  <span className={`text-xs capitalize ${
                    s.status === "completed" ? "text-primary" : s.status === "in_progress" ? "text-yellow-400" : "text-muted-foreground"
                  }`}>{s.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Milestones</h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-card">
              Milestones will appear here as your project progresses.
            </p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
                  {statusIcon(m.status)}
                  <span className="text-sm flex-1">{m.title}</span>
                  <span className={`text-xs capitalize ${
                    m.status === "completed" ? "text-primary" : m.status === "in_progress" ? "text-yellow-400" : "text-muted-foreground"
                  }`}>{m.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Updates */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Project Updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-card">
              No updates yet.
            </p>
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
      </div>
    </PortalLayout>
  );
};

export default ProjectDetail;
