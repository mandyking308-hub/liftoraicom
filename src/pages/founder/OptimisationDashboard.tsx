import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Zap, AlertTriangle, Bot, Workflow, TrendingUp, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

const OptimisationDashboard = () => {
  const qc = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ["opt-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*, monitored_systems(system_name)");
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["opt-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*, monitored_systems(system_name)");
      return data ?? [];
    },
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["opt-executions"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name)").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const { data: insights = [], refetch: refetchInsights } = useQuery({
    queryKey: ["opt-insights"],
    queryFn: async () => {
      const { data } = await supabase.from("optimisation_insights").select("*, monitored_systems(system_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateInsight = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("optimisation_insights").update({ status }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opt-insights"] }); },
  });

  // Generate insights from live data
  const generateInsights = useMutation({
    mutationFn: async () => {
      const newInsights: any[] = [];

      // Workflow insights: high failure rate
      workflows.forEach((w: any) => {
        if (w.execution_count > 5) {
          const failRate = w.failure_count / w.execution_count;
          if (failRate > 0.15) {
            newInsights.push({
              system_id: w.system_id,
              entity_type: "workflow",
              entity_id: w.id,
              entity_name: w.name,
              insight_type: "failure_rate",
              title: `High failure rate detected: ${w.name}`,
              description: `Failure rate of ${Math.round(failRate * 100)}% across ${w.execution_count} executions.`,
              recommended_action: "Review workflow logic and error handling. Consider adding retry mechanisms or adjusting step configurations.",
              priority: failRate > 0.3 ? "critical" : "high",
            });
          }
        }
      });

      // Agent insights: low productivity or inactive
      agents.forEach((a: any) => {
        const total = a.tasks_completed_total + a.tasks_pending;
        if (total > 10) {
          const successRate = a.tasks_completed_total / total;
          if (successRate < 0.8) {
            newInsights.push({
              system_id: a.system_id,
              entity_type: "agent",
              entity_id: a.id,
              entity_name: a.name,
              insight_type: "low_success_rate",
              title: `Low task success rate: ${a.name}`,
              description: `Success rate of ${Math.round(successRate * 100)}% with ${a.tasks_pending} tasks still pending.`,
              recommended_action: "Review agent configuration and task assignment logic. Consider adjusting agent function parameters.",
              priority: successRate < 0.6 ? "critical" : "high",
            });
          }
        }
        if (a.status === "active" && a.last_activity) {
          const daysSince = (Date.now() - new Date(a.last_activity).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 7) {
            newInsights.push({
              system_id: a.system_id,
              entity_type: "agent",
              entity_id: a.id,
              entity_name: a.name,
              insight_type: "inactivity",
              title: `Agent inactive: ${a.name}`,
              description: `No activity in ${Math.round(daysSince)} days despite active status.`,
              recommended_action: "Investigate agent connectivity and task queue. Consider reassigning or restarting the agent.",
              priority: "medium",
            });
          }
        }
      });

      // Workflow with no recent execution
      workflows.forEach((w: any) => {
        if (w.status === "active" && w.last_execution) {
          const daysSince = (Date.now() - new Date(w.last_execution).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 14) {
            newInsights.push({
              system_id: w.system_id,
              entity_type: "workflow",
              entity_id: w.id,
              entity_name: w.name,
              insight_type: "inactivity",
              title: `Workflow dormant: ${w.name}`,
              description: `Active workflow has not executed in ${Math.round(daysSince)} days.`,
              recommended_action: "Review workflow triggers and scheduling. May need reconfiguration or deactivation.",
              priority: "low",
            });
          }
        }
      });

      if (newInsights.length > 0) {
        await supabase.from("optimisation_insights").insert(newInsights);
      }
      return newInsights.length;
    },
    onSuccess: (count) => {
      refetchInsights();
      toast.success(`Generated ${count} optimisation insight${count !== 1 ? "s" : ""}`);
    },
    onError: () => toast.error("Failed to generate insights"),
  });

  // Scores
  const totalExecs = executions.length;
  const successExecs = executions.filter((e: any) => e.status === "completed").length;
  const automationEfficiency = totalExecs > 0 ? Math.round((successExecs / totalExecs) * 100) : 100;

  const totalAgentTasks = agents.reduce((s: number, a: any) => s + a.tasks_completed_total + a.tasks_pending, 0);
  const completedAgentTasks = agents.reduce((s: number, a: any) => s + a.tasks_completed_total, 0);
  const agentScore = totalAgentTasks > 0 ? Math.round((completedAgentTasks / totalAgentTasks) * 100) : 100;

  const totalWfExecs = workflows.reduce((s: number, w: any) => s + w.execution_count, 0);
  const totalWfSuccess = workflows.reduce((s: number, w: any) => s + w.success_count, 0);
  const workflowReliability = totalWfExecs > 0 ? Math.round((totalWfSuccess / totalWfExecs) * 100) : 100;

  const scoreColor = (v: number) => v >= 90 ? "text-green-400" : v >= 70 ? "text-yellow-400" : "text-destructive";

  const newInsights = insights.filter((i: any) => i.status === "new").length;
  const reviewInsights = insights.filter((i: any) => i.status === "under_review").length;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automation Optimisation</h1>
            <p className="text-muted-foreground text-sm mt-1">Performance analysis and improvement recommendations</p>
          </div>
          <Button onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending} size="sm">
            <RefreshCw size={16} className={`mr-2 ${generateInsights.isPending ? "animate-spin" : ""}`} />
            Analyse Systems
          </Button>
        </div>

        {/* Performance Scores */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Automation Efficiency", value: `${automationEfficiency}%`, color: scoreColor(automationEfficiency), icon: Zap },
            { label: "Agent Performance", value: `${agentScore}%`, color: scoreColor(agentScore), icon: Bot },
            { label: "Workflow Reliability", value: `${workflowReliability}%`, color: scoreColor(workflowReliability), icon: Workflow },
            { label: "New Insights", value: newInsights, color: newInsights > 0 ? "text-primary" : "text-muted-foreground", icon: AlertTriangle },
            { label: "Under Review", value: reviewInsights, color: reviewInsights > 0 ? "text-yellow-400" : "text-muted-foreground", icon: Clock },
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

        {/* Workflow Insights */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Workflow size={18} /> Workflow Optimisation Insights</CardTitle></CardHeader>
          <CardContent>
            {insights.filter((i: any) => i.entity_type === "workflow").length === 0 ? (
              <p className="text-muted-foreground text-sm">No workflow insights. Click "Analyse Systems" to generate.</p>
            ) : (
              <div className="space-y-3">
                {insights.filter((i: any) => i.entity_type === "workflow").map((i: any) => (
                  <InsightCard key={i.id} insight={i} onStatusChange={(status) => updateInsight.mutate({ id: i.id, status })} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Insights */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bot size={18} /> Agent Performance Insights</CardTitle></CardHeader>
          <CardContent>
            {insights.filter((i: any) => i.entity_type === "agent").length === 0 ? (
              <p className="text-muted-foreground text-sm">No agent insights. Click "Analyse Systems" to generate.</p>
            ) : (
              <div className="space-y-3">
                {insights.filter((i: any) => i.entity_type === "agent").map((i: any) => (
                  <InsightCard key={i.id} insight={i} onStatusChange={(status) => updateInsight.mutate({ id: i.id, status })} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimisation History */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp size={18} /> Optimisation History</CardTitle></CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-muted-foreground text-sm">No optimisation history yet.</p>
            ) : (
              <div className="space-y-2">
                {insights.slice(0, 20).map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      {entityIcon(i.entity_type)}
                      <div>
                        <p className="text-sm font-medium">{i.title}</p>
                        <p className="text-xs text-muted-foreground">{i.monitored_systems?.system_name || "—"} · {format(new Date(i.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${priorityClass(i.priority)}`}>{i.priority}</Badge>
                      <Badge variant="secondary" className={`text-xs ${statusClass(i.status)}`}>{i.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

const InsightCard = ({ insight, onStatusChange }: { insight: any; onStatusChange: (status: string) => void }) => (
  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {entityIcon(insight.entity_type)}
        <div>
          <p className="font-medium">{insight.title}</p>
          <p className="text-xs text-muted-foreground">{insight.monitored_systems?.system_name || "—"} · {insight.entity_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={`text-xs ${priorityClass(insight.priority)}`}>{insight.priority}</Badge>
        <Badge variant="secondary" className={`text-xs ${statusClass(insight.status)}`}>{insight.status.replace(/_/g, " ")}</Badge>
      </div>
    </div>
    {insight.description && <p className="text-sm text-muted-foreground">{insight.description}</p>}
    {insight.recommended_action && (
      <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
        <p className="text-xs font-medium text-primary mb-1">Recommended Action</p>
        <p className="text-sm">{insight.recommended_action}</p>
      </div>
    )}
    <div className="flex gap-2">
      {insight.status === "new" && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange("under_review")}>
          <Clock size={14} className="mr-1" /> Mark Under Review
        </Button>
      )}
      {(insight.status === "new" || insight.status === "under_review") && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange("resolved")}>
          <CheckCircle2 size={14} className="mr-1" /> Resolve
        </Button>
      )}
    </div>
  </div>
);

export default OptimisationDashboard;
