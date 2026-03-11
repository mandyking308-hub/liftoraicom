import PartnerLayout from "@/components/partner/PartnerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const PartnerProjects = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["partner-confirmed-opps", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_opportunities")
        .select("*, projects(*)")
        .eq("partner_id", profileId!)
        .not("project_id", "is", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Active projects from your opportunities</p>
        </div>

        {opportunities.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No confirmed projects yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp: any) => {
              const project = opp.projects;
              if (!project) return null;
              return (
                <Link key={project.id} to={`/partner/projects/${project.id}`}>
                  <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{project.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {project.project_type} · {project.current_stage}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-primary/20 text-primary">{project.status}</Badge>
                      </div>
                      {project.start_date && (
                        <p className="text-xs text-muted-foreground mt-2">Started {format(new Date(project.start_date), "MMM d, yyyy")}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
};

export default PartnerProjects;
