import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, Clock, Bot, Zap, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";

const statusBadge = (status: string) => {
  const m: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    idle: "bg-muted text-muted-foreground",
    paused: "bg-yellow-500/20 text-yellow-400",
    maintenance: "bg-primary/20 text-primary",
    processing: "bg-primary/20 text-primary",
    offline: "bg-destructive/20 text-destructive",
  };
  return m[status] || "bg-muted text-muted-foreground";
};

const severityBadge = (severity: string) => {
  const m: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive",
    warning: "bg-yellow-500/20 text-yellow-400",
    info: "bg-primary/20 text-primary",
  };
  return m[severity] || "bg-muted text-muted-foreground";
};

const AgentProfile = () => {
  const { id } = useParams();

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("*, monitored_systems(system_name, projects(name))")
        .eq("id", id!)
        .single();
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["agent-assignments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_system_assignments")
        .select("*, monitored_systems(system_name, projects(name))")
        .eq("agent_id", id!);
      return data ?? [];
    },
  });

  const { data: taskStats = [] } = useQuery({
    queryKey: ["agent-task-stats", id],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7).toISOString().split("T")[0];
      const { data } = await supabase
        .from("agent_task_stats")
        .select("*")
        .eq("agent_id", id!)
        .gte("date", weekAgo)
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["agent-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_activity_logs")
        .select("*")
        .eq("agent_id", id!)
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["agent-alerts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_alerts")
        .select("*")
        .eq("agent_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (!agent) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  const todayStats = taskStats[0];
  const weekCompleted = taskStats.reduce((s, t: any) => s + (t.tasks_completed || 0), 0);
  const weekFailed = taskStats.reduce((s, t: any) => s + (t.tasks_failed || 0), 0);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/agents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Agent Directory
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bot size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{agent.agent_function || "—"}</p>
            </div>
          </div>
          <Badge variant="secondary" className={statusBadge(agent.status)}>{agent.status}</Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Tasks</p>
              <p className="text-xl font-bold mt-1">{agent.tasks_completed_total || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold mt-1">{agent.tasks_pending || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">This Week</p>
              <p className="text-xl font-bold mt-1">{weekCompleted}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Failures (Week)</p>
              <p className="text-xl font-bold mt-1 text-destructive">{weekFailed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Purpose & Info */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Agent Details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Purpose</span>
                <p className="mt-1">{agent.purpose || agent.agent_function || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Primary System</span>
                <p className="mt-1">{(agent as any).monitored_systems?.system_name || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Activity</span>
                <p className="mt-1">{agent.last_activity ? format(new Date(agent.last_activity), "MMM d, yyyy h:mm a") : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="mt-1">{format(new Date(agent.created_at), "MMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Systems */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Assigned Systems</CardTitle></CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Not assigned to any additional systems.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{a.monitored_systems?.system_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.monitored_systems?.projects?.name || "—"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Since {format(new Date(a.assigned_at), "MMM d")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Stats */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Task Summary (7 Days)</CardTitle></CardHeader>
            <CardContent>
              {taskStats.length === 0 ? (
                <p className="text-muted-foreground text-sm">No task data available.</p>
              ) : (
                <div className="space-y-2">
                  {taskStats.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                      <span>{format(new Date(s.date), "MMM d")}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400">{s.tasks_completed} done</span>
                        <span className="text-muted-foreground">{s.tasks_pending} pending</span>
                        {s.tasks_failed > 0 && <span className="text-destructive">{s.tasks_failed} failed</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  No alerts for this agent.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className={`p-3 rounded-lg ${a.resolved ? "bg-secondary/30 opacity-60" : "bg-secondary/50"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="secondary" className={severityBadge(a.severity)}>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.affected_system ? `${a.affected_system} · ` : ""}{format(new Date(a.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Activity Log</CardTitle></CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                    </div>
                    <div className="text-right">
                      {log.system_name && <p className="text-xs text-muted-foreground">{log.system_name}</p>}
                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), "MMM d, h:mm a")}</p>
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

export default AgentProfile;
