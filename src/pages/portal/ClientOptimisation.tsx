import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Zap, Bot, Workflow, TrendingUp } from "lucide-react";

const priorityClass = (p: string) => {
  if (p === "critical") return "bg-destructive/20 text-destructive";
  if (p === "high") return "bg-orange-500/20 text-orange-400";
  if (p === "medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-muted text-muted-foreground";
};

const statusClass = (s: string) => {
  if (s === "new") return "bg-primary/20 text-primary";
  if (s === "under_review") return "bg-yellow-500/20 text-yellow-400";
  if (s === "resolved") return "bg-green-500/20 text-green-400";
  return "bg-muted text-muted-foreground";
};

const entityIcon = (t: string) => {
  if (t === "agent") return <Bot size={16} />;
  if (t === "workflow") return <Workflow size={16} />;
  return <Zap size={16} />;
};

const ClientOptimisation = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["co-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["co-systems", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, system_name").eq("client_id", profile!.id);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const systemIds = systems.map((s: any) => s.id);

  const { data: insights = [] } = useQuery({
    queryKey: ["co-insights", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("optimisation_insights").select("*, monitored_systems(system_name)").in("system_id", systemIds).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["co-workflows", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("automation_workflows").select("*").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["co-agents", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("ai_agents").select("*").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  // Scores
  const totalWfExecs = workflows.reduce((s: number, w: any) => s + w.execution_count, 0);
  const totalWfSuccess = workflows.reduce((s: number, w: any) => s + w.success_count, 0);
  const workflowReliability = totalWfExecs > 0 ? Math.round((totalWfSuccess / totalWfExecs) * 100) : 100;

  const totalAgentTasks = agents.reduce((s: number, a: any) => s + a.tasks_completed_total + a.tasks_pending, 0);
  const completedAgentTasks = agents.reduce((s: number, a: any) => s + a.tasks_completed_total, 0);
  const agentScore = totalAgentTasks > 0 ? Math.round((completedAgentTasks / totalAgentTasks) * 100) : 100;

  const overallScore = Math.round((workflowReliability + agentScore) / 2);
  const scoreColor = (v: number) => v >= 90 ? "text-green-400" : v >= 70 ? "text-yellow-400" : "text-destructive";

  const activeInsights = insights.filter((i: any) => i.status !== "resolved");

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Optimisation</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance insights and improvement recommendations for your systems</p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Overall Score", value: `${overallScore}%`, color: scoreColor(overallScore), icon: TrendingUp },
            { label: "Workflow Reliability", value: `${workflowReliability}%`, color: scoreColor(workflowReliability), icon: Workflow },
            { label: "Agent Performance", value: `${agentScore}%`, color: scoreColor(agentScore), icon: Bot },
            { label: "Active Insights", value: activeInsights.length, color: activeInsights.length > 0 ? "text-primary" : "text-muted-foreground", icon: Zap },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={18} className="text-primary mb-2" />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Recommendations */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap size={18} /> Optimisation Insights</CardTitle></CardHeader>
          <CardContent>
            {activeInsights.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active optimisation insights. Your systems are performing well.</p>
            ) : (
              <div className="space-y-3">
                {activeInsights.map((i: any) => (
                  <div key={i.id} className="p-4 rounded-lg bg-secondary/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {entityIcon(i.entity_type)}
                        <div>
                          <p className="font-medium">{i.title}</p>
                          <p className="text-xs text-muted-foreground">{i.monitored_systems?.system_name || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${priorityClass(i.priority)}`}>{i.priority}</Badge>
                        <Badge variant="secondary" className={`text-xs ${statusClass(i.status)}`}>{i.status.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
                    {i.recommended_action && (
                      <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">Suggested Improvement</p>
                        <p className="text-sm">{i.recommended_action}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp size={18} /> Insight History</CardTitle></CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-muted-foreground text-sm">No optimisation history yet.</p>
            ) : (
              <div className="space-y-2">
                {insights.slice(0, 15).map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      {entityIcon(i.entity_type)}
                      <div>
                        <p className="text-sm font-medium">{i.title}</p>
                        <p className="text-xs text-muted-foreground">{i.monitored_systems?.system_name || "—"} · {format(new Date(i.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${statusClass(i.status)}`}>{i.status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default ClientOptimisation;
