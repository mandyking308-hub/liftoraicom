import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Server, Bot, Workflow, Play, AlertTriangle, CheckCircle2, XCircle, Clock,
  Loader2, Activity, Zap, Shield, Wifi, HeartPulse,
} from "lucide-react";

const statusIcon = (s: string) => {
  if (["operational", "active", "connected", "completed", "success", "running"].includes(s))
    return <CheckCircle2 size={14} className="text-green-400" />;
  if (["warning", "degraded", "paused", "completed_with_warning"].includes(s))
    return <Clock size={14} className="text-yellow-400" />;
  if (["offline", "failed", "error", "disconnected"].includes(s))
    return <XCircle size={14} className="text-destructive" />;
  if (s === "maintenance") return <Clock size={14} className="text-primary" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusClass = (s: string) => {
  if (["operational", "active", "connected", "running", "completed", "success"].includes(s))
    return "bg-green-500/20 text-green-400";
  if (["warning", "degraded", "paused"].includes(s)) return "bg-yellow-500/20 text-yellow-400";
  if (["offline", "failed", "error", "disconnected"].includes(s)) return "bg-destructive/20 text-destructive";
  if (s === "maintenance") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const CommandCenter = () => {
  // Systems
  const { data: systems = [] } = useQuery({
    queryKey: ["cc-systems"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems")
        .select("*, profiles(full_name, company_name), projects(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Agents
  const { data: agents = [] } = useQuery({
    queryKey: ["cc-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*, monitored_systems(system_name)")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ["cc-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows")
        .select("*, monitored_systems(system_name)")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Executions
  const { data: executions = [] } = useQuery({
    queryKey: ["cc-executions"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_executions")
        .select("*, automation_workflows(name), monitored_systems(system_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  // System alerts
  const { data: sysAlerts = [] } = useQuery({
    queryKey: ["cc-sys-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("system_alerts")
        .select("*, monitored_systems(system_name)")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Workflow alerts
  const { data: wfAlerts = [] } = useQuery({
    queryKey: ["cc-wf-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_alerts")
        .select("*, automation_workflows(name)")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Integration alerts
  const { data: intAlerts = [] } = useQuery({
    queryKey: ["cc-int-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("integration_alerts")
        .select("*, integrations(name)")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Integrations
  const { data: integrations = [] } = useQuery({
    queryKey: ["cc-integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Activity log
  const { data: activityLog = [] } = useQuery({
    queryKey: ["cc-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  // Platform diagnostics
  const { data: latestDiagnostic } = useQuery({
    queryKey: ["cc-diagnostics"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_diagnostic_runs")
        .select("*")
        .order("run_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const allAlerts = [
    ...sysAlerts.map((a: any) => ({ ...a, source: a.monitored_systems?.system_name || a.affected_system || "System" })),
    ...wfAlerts.map((a: any) => ({ ...a, source: (a as any).automation_workflows?.name || "Workflow" })),
    ...intAlerts.map((a: any) => ({ ...a, source: (a as any).integrations?.name || "Integration" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const operationalSystems = systems.filter((s: any) => s.status === "operational").length;
  const activeAgents = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;
  const activeWorkflows = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;
  const runningExecs = executions.filter((e: any) => e.status === "running").length;
  const connectedIntegrations = integrations.filter((i: any) => i.status === "connected").length;

  const healthItems = [
    { label: "Platform Infrastructure", status: systems.length > 0 ? (operationalSystems === systems.length ? "operational" : "degraded") : "idle", icon: Server },
    { label: "AI Services", status: activeAgents > 0 ? "operational" : "idle", icon: Bot },
    { label: "Automation Engine", status: runningExecs > 0 ? "running" : (activeWorkflows > 0 ? "operational" : "idle"), icon: Zap },
    { label: "Workflow Systems", status: activeWorkflows > 0 ? "active" : "idle", icon: Workflow },
    { label: "Integrations", status: connectedIntegrations > 0 ? "connected" : "disconnected", icon: Wifi },
  ];

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Operations Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time platform operational overview</p>
        </div>

        {/* Top-level stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Systems", value: operationalSystems, total: systems.length, icon: Server },
            { label: "Agents", value: activeAgents, total: agents.length, icon: Bot },
            { label: "Workflows", value: activeWorkflows, total: workflows.length, icon: Workflow },
            { label: "Executions", value: runningExecs, icon: Play, sub: "running" },
            { label: "Alerts", value: allAlerts.length, icon: AlertTriangle },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <s.icon size={18} className="text-primary" />
                  {s.total !== undefined && <span className="text-xs text-muted-foreground">{s.value}/{s.total}</span>}
                  {s.sub && <span className="text-xs text-muted-foreground">{s.sub}</span>}
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield size={18} /> System Health</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {healthItems.map((h) => (
                <div key={h.label} className="p-4 rounded-lg bg-secondary/50 flex items-center gap-3">
                  {statusIcon(h.status)}
                  <div>
                    <p className="text-sm font-medium">{h.label}</p>
                    <Badge variant="secondary" className={`text-xs mt-1 ${statusClass(h.status)}`}>{h.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Diagnostics Summary */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartPulse size={18} /> Platform Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestDiagnostic ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {latestDiagnostic.status === "healthy" ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={20} className="text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {latestDiagnostic.status === "healthy" ? "All Systems Healthy" : "Issues Detected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {latestDiagnostic.systems_checked} systems checked · {latestDiagnostic.failures_detected} failures · Last run {format(new Date(latestDiagnostic.run_timestamp), "dd MMM HH:mm")}
                    </p>
                  </div>
                </div>
                <Link to="/founder/testing">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary">View Details →</Badge>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <HeartPulse size={18} />
                <span>No diagnostics run yet.</span>
                <Link to="/founder/testing">
                  <Badge variant="secondary" className="cursor-pointer">Run Diagnostics →</Badge>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Automations */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Loader2 size={18} className={runningExecs > 0 ? "animate-spin" : ""} /> Active Automations</CardTitle></CardHeader>
            <CardContent>
              {executions.filter((e: any) => e.status === "running" || e.status === "queued").length === 0 ? (
                <p className="text-muted-foreground text-sm">No active automations.</p>
              ) : (
                <div className="space-y-3">
                  {executions.filter((e: any) => e.status === "running" || e.status === "queued").map((e: any) => (
                    <Link key={e.id} to={`/founder/executions/${e.id}`}>
                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {e.status === "running" ? <Loader2 size={14} className="text-primary animate-spin" /> : <Clock size={14} className="text-muted-foreground" />}
                            <div>
                              <p className="text-sm font-medium">{e.automation_workflows?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{e.monitored_systems?.system_name || "—"}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={statusClass(e.status)}>{e.status}</Badge>
                        </div>
                      </div>
                    </Link>
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
                <p className="text-muted-foreground text-sm">No agents configured.</p>
              ) : (
                <div className="space-y-3">
                  {agents.slice(0, 6).map((a: any) => (
                    <Link key={a.id} to={`/founder/agents/${a.id}`}>
                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon(a.status)}
                            <div>
                              <p className="text-sm font-medium">{a.name}</p>
                              <p className="text-xs text-muted-foreground">{a.agent_function || "—"}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${statusClass(a.status)}`}>{a.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Executions */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play size={18} /> Recent Executions</CardTitle></CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No executions.</p>
              ) : (
                <div className="space-y-3">
                  {executions.slice(0, 6).map((e: any) => (
                    <Link key={e.id} to={`/founder/executions/${e.id}`}>
                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon(e.status)}
                            <div>
                              <p className="text-sm font-medium">{e.automation_workflows?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{e.monitored_systems?.system_name || "—"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className={`text-xs ${statusClass(e.status)}`}>{e.status.replace(/_/g, " ")}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.created_at), "MMM d, h:mm a")}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts & Warnings */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> Alerts & Warnings</CardTitle></CardHeader>
            <CardContent>
              {allAlerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  All systems operating normally.
                </div>
              ) : (
                <div className="space-y-3">
                  {allAlerts.slice(0, 8).map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : a.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.source} · {format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> System Activity Feed</CardTitle></CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                      <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                      <div>
                        <p className="font-medium">{log.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{log.event_type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Systems Overview */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Server size={18} /> Client Systems</CardTitle></CardHeader>
            <CardContent>
              {systems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No client systems.</p>
              ) : (
                <div className="space-y-3">
                  {systems.slice(0, 8).map((sys: any) => {
                    const sysWorkflows = workflows.filter((w: any) => w.system_id === sys.id);
                    const activeWfs = sysWorkflows.filter((w: any) => w.status === "active" || w.status === "running").length;
                    return (
                      <Link key={sys.id} to={`/founder/monitoring/${sys.id}`}>
                        <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {statusIcon(sys.status)}
                              <div>
                                <p className="text-sm font-medium">{sys.system_name}</p>
                                <p className="text-xs text-muted-foreground">{sys.profiles?.company_name || sys.profiles?.full_name || "—"}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className={`text-xs ${statusClass(sys.status)}`}>{sys.status}</Badge>
                              <p className="text-xs text-muted-foreground mt-1">{activeWfs} active workflow{activeWfs !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FounderLayout>
  );
};

export default CommandCenter;
