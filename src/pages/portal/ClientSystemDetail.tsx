import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, Server, Bot, Workflow, AlertTriangle, CheckCircle2, Clock, XCircle, Activity, Play, FileText } from "lucide-react";

const statusIcon = (s: string) => {
  if (["operational", "active", "connected", "completed", "running", "success"].includes(s)) return <CheckCircle2 size={14} className="text-green-400" />;
  if (["warning", "degraded", "paused"].includes(s)) return <Clock size={14} className="text-yellow-400" />;
  if (["offline", "failed", "error"].includes(s)) return <XCircle size={14} className="text-destructive" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusClass = (s: string) => {
  if (["operational", "active", "connected", "running", "completed", "success"].includes(s)) return "bg-green-500/20 text-green-400";
  if (["warning", "degraded", "paused"].includes(s)) return "bg-yellow-500/20 text-yellow-400";
  if (["offline", "failed", "error"].includes(s)) return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
};

const ClientSystemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: system } = useQuery({
    queryKey: ["client-system", id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("*, projects(name, project_type, start_date)").eq("id", id!).maybeSingle();
      return data;
    },
  });

  // Agents
  const { data: agents = [] } = useQuery({
    queryKey: ["client-sys-agents", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*").eq("system_id", id!).order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ["client-sys-workflows", id],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*").eq("system_id", id!).order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Executions
  const { data: executions = [] } = useQuery({
    queryKey: ["client-sys-executions", id],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name)").eq("system_id", id!).order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
  });

  // Alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["client-sys-alerts", id],
    queryFn: async () => {
      const { data } = await supabase.from("system_alerts").select("*").eq("system_id", id!).eq("resolved", false).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Agent activity logs
  const { data: agentLogs = [] } = useQuery({
    queryKey: ["client-sys-agent-logs", id],
    queryFn: async () => {
      const agentIds = agents.map((a: any) => a.id);
      if (agentIds.length === 0) return [];
      const { data } = await supabase.from("agent_activity_logs").select("*").in("agent_id", agentIds).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: agents.length > 0,
  });

  // Documents
  const { data: documents = [] } = useQuery({
    queryKey: ["client-sys-docs", system?.project_id],
    queryFn: async () => {
      if (!system?.project_id) return [];
      const { data } = await supabase.from("project_documents").select("*").eq("project_id", system.project_id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!system?.project_id,
  });

  if (!system) return <PortalLayout><p className="text-muted-foreground">Loading...</p></PortalLayout>;

  const activeAgents = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;
  const activeWorkflows = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;
  const runningExecs = executions.filter((e: any) => e.status === "running").length;
  const completedExecs = executions.filter((e: any) => e.status === "completed").length;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <Link to="/portal/systems" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Systems
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{system.system_name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {system.projects?.name && <span>{system.projects.name}</span>}
              {system.projects?.project_type && <span>· {system.projects.project_type}</span>}
              {system.projects?.start_date && <span>· Deployed {format(new Date(system.projects.start_date), "MMM d, yyyy")}</span>}
            </div>
          </div>
          <Badge variant="secondary" className={statusClass(system.status)}>{system.status}</Badge>
        </div>

        {/* Operational Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Automations Running", value: runningExecs, icon: Play },
            { label: "Agents Active", value: activeAgents, total: agents.length, icon: Bot },
            { label: "Workflows Active", value: activeWorkflows, total: workflows.length, icon: Workflow },
            { label: "Completed Tasks", value: completedExecs, icon: CheckCircle2 },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Automation Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Workflow size={18} /> Automation Activity</CardTitle></CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No workflows configured.</p>
              ) : (
                <div className="space-y-3">
                  {workflows.map((w: any) => (
                    <div key={w.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(w.status)}
                          <p className="text-sm font-medium">{w.name}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${statusClass(w.status)}`}>{w.status}</Badge>
                          {w.last_execution && <p className="text-xs text-muted-foreground mt-1">{format(new Date(w.last_execution), "MMM d, h:mm a")}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Agent Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bot size={18} /> AI Agent Activity</CardTitle></CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No agents assigned.</p>
              ) : (
                <div className="space-y-3">
                  {agents.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(a.status)}
                          <div>
                            <p className="text-sm font-medium">{a.name}</p>
                            <p className="text-xs text-muted-foreground">{a.agent_function || "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${statusClass(a.status)}`}>{a.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{a.tasks_completed_total} tasks done</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> System Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  No active alerts.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : a.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}>{a.severity}</Badge>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> Activity History</CardTitle></CardHeader>
            <CardContent>
              {executions.length === 0 && agentLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {executions.slice(0, 8).map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                      <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{format(new Date(e.created_at), "MMM d, h:mm a")}</span>
                      <div>
                        <p className="font-medium">{e.automation_workflows?.name || "Workflow"} — {e.status.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText size={18} /> System Documentation</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.category}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
};

export default ClientSystemDetail;
