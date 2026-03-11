import PartnerLayout from "@/components/partner/PartnerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";

const stageIcon = (status: string) => {
  if (status === "completed") return <CheckCircle2 size={16} className="text-green-400" />;
  if (status === "in_progress") return <Clock size={16} className="text-primary" />;
  return <Circle size={16} className="text-muted-foreground" />;
};

const PartnerProjectDetail = () => {
  const { id } = useParams();

  const { data: project } = useQuery({
    queryKey: ["partner-project", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["partner-project-stages", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_stages").select("*").eq("project_id", id!).order("order_index");
      return data ?? [];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["partner-project-milestones", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_milestones").select("*").eq("project_id", id!).order("order_index");
      return data ?? [];
    },
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["partner-project-updates", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_updates").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!project) return <PartnerLayout><p className="text-muted-foreground">Loading...</p></PartnerLayout>;

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <Link to="/partner/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Projects
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{project.project_type} · {project.current_stage}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Development Stages</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  {stageIcon(s.status)}
                  <span className={s.status === "in_progress" ? "text-primary font-medium" : ""}>{s.name}</span>
                  <Badge variant="secondary" className="ml-auto text-xs capitalize">{s.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
              {stages.length === 0 && <p className="text-muted-foreground text-sm">No stages yet.</p>}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Milestones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  {stageIcon(m.status)}
                  <span>{m.title}</span>
                </div>
              ))}
              {milestones.length === 0 && <p className="text-muted-foreground text-sm">No milestones yet.</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Latest Updates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {updates.length === 0 ? (
              <p className="text-muted-foreground text-sm">No updates yet.</p>
            ) : (
              updates.map((u) => (
                <div key={u.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                  <p>{u.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{u.author_name} · {format(new Date(u.created_at), "MMM d, yyyy")}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
};

export default PartnerProjectDetail;
