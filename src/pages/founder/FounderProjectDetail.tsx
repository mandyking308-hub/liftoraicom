import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { ArrowLeft, CheckCircle2, Clock, Circle } from "lucide-react";

const statusIcon = (status: string) => {
  if (status === "completed") return <CheckCircle2 size={16} className="text-primary" />;
  if (status === "in_progress") return <Clock size={16} className="text-yellow-400" />;
  return <Circle size={16} className="text-muted-foreground" />;
};

const FounderProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [projRes, stagesRes, msRes, updRes, msgRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("project_stages").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_updates").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("project_messages").select("*").eq("project_id", id).order("created_at", { ascending: true }),
      ]);
      if (projRes.data) setProject(projRes.data);
      if (stagesRes.data) setStages(stagesRes.data);
      if (msRes.data) setMilestones(msRes.data);
      if (updRes.data) setUpdates(updRes.data);
      if (msgRes.data) setMessages(msgRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;
  if (!project) return <FounderLayout><p className="text-muted-foreground">Project not found.</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="max-w-4xl">
        <Link to="/founder/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground mt-1">{project.project_type}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${
              project.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            }`}>{project.status}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            {project.start_date && <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>}
            {project.expected_timeline && <span>Timeline: {project.expected_timeline}</span>}
            <span>Stage: {project.current_stage}</span>
          </div>
        </div>

        {/* Stages */}
        {stages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Development Stages</h2>
            <div className="space-y-2">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                  {statusIcon(s.status)}
                  <span className="text-sm font-medium flex-1">{s.name}</span>
                  <span className={`text-xs capitalize ${s.status === "completed" ? "text-primary" : s.status === "in_progress" ? "text-yellow-400" : "text-muted-foreground"}`}>{s.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Milestones</h2>
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                  {statusIcon(m.status)}
                  <span className="text-sm flex-1">{m.title}</span>
                  <span className={`text-xs capitalize ${m.status === "completed" ? "text-primary" : m.status === "in_progress" ? "text-yellow-400" : "text-muted-foreground"}`}>{m.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Updates */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-card">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {updates.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-border/50 bg-card">
                  <p className="text-sm">{u.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{u.author_name} · {new Date(u.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Messages */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Client Communication</h2>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-card">No messages yet.</p>
          ) : (
            <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-card max-h-[300px] overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="p-3 rounded-lg bg-secondary text-sm">
                  <p>{m.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FounderLayout>
  );
};

export default FounderProjectDetail;
