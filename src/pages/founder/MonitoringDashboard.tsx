import FounderLayout from "@/components/founder/FounderLayout";
import SelfHealingMonitoringPanel from "@/components/founder/monitoring/SelfHealingMonitoringPanel";
import AutopilotActivationGatesPanel from "@/components/founder/autonomy/AutopilotActivationGatesPanel";
import GlobalOperatingClockPanel from "@/components/founder/global/GlobalOperatingClockPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Activity, Bot, Workflow, AlertTriangle, CheckCircle2, AlertCircle, XCircle, Clock, Server } from "lucide-react";

const statusIcon = (status: string) => {
  if (status === "operational" || status === "active" || status === "success") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "warning" || status === "degraded") return <AlertCircle size={14} className="text-yellow-400" />;
  if (status === "offline" || status === "failed" || status === "error") return <XCircle size={14} className="text-destructive" />;
  if (status === "maintenance") return <Clock size={14} className="text-primary" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusBadge = (status: string) => {
  const m: Record<string, string> = {
    operational: "bg-green-500/20 text-green-400",
    active: "bg-green-500/20 text-green-400",
    running: "bg-green-500/20 text-green-400",
    processing: "bg-primary/20 text-primary",
    idle: "bg-muted text-muted-foreground",
    warning: "bg-yellow-500/20 text-yellow-400",
    maintenance: "bg-primary/20 text-primary",
    offline: "bg-destructive/20 text-destructive",
    paused: "bg-muted text-muted-foreground",
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

const MonitoringDashboard = () => {
  const { data: systems = [] } = useQuery({
    queryKey: ["all-monitored-systems"],
    queryFn: async () => {
      const { data } = await supabase
        .from("monitored_systems")
        .select("*, projects(name, client_id), profiles(full_name, company_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const systemIds = systems.map((s: any) => s.id);

  const { data: workflows = [] } = useQuery({
    queryKey: ["all-workflows", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_workflows")
        .select("*")
        .in("system_id", systemIds)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("*")
        .in("system_id", systemIds)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["all-alerts", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_alerts")
        .select("*, monitored_systems(system_name)")
        .in("system_id", systemIds)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;
  const totalSuccess = workflows.reduce((sum: number, w: any) => sum + (w.success_count || 0), 0);
  const totalFailure = workflows.reduce((sum: number, w: any) => sum + (w.failure_count || 0), 0);
  const totalExec = workflows.reduce((sum: number, w: any) => sum + (w.execution_count || 0), 0);
  const activeAgents = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;

  const stats = [
    { label: "Active Systems", value: systems.filter((s: any) => s.status === "operational").length, icon: Server, total: systems.length },
    { label: "Automations", value: activeWorkflows, icon: Workflow, total: totalWorkflows },
    { label: "AI Agents", value: activeAgents, icon: Bot, total: agents.length },
    { label: "Open Alerts", value: alerts.length, icon: AlertTriangle },
  ];

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">AI operations control center</p>
        </div>

        <SelfHealingMonitoringPanel />
        <AutopilotActivationGatesPanel />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <s.icon size={20} className="text-primary" />
                  {s.total !== undefined && (
                    <span className="text-xs text-muted-foreground">{s.value}/{s.total}</span>
                  )}
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Summary */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Automation Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Executions</p>
                <p className="text-xl font-bold mt-1">{totalExec.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Successful</p>
                <p className="text-xl font-bold mt-1 text-green-400">{totalSuccess.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Failed</p>
                <p className="text-xl font-bold mt-1 text-destructive">{totalFailure.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
                <p className="text-xl font-bold mt-1">{totalExec > 0 ? ((totalSuccess / totalExec) * 100).toFixed(1) : "—"}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Systems Grid */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Deployed Systems</CardTitle>
          </CardHeader>
          <CardContent>
            {systems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No monitored systems.</p>
            ) : (
              <div className="space-y-3">
                {systems.map((sys: any) => {
                  const sysWorkflows = workflows.filter((w: any) => w.system_id === sys.id);
                  const sysAgents = agents.filter((a: any) => a.system_id === sys.id);
                  return (
                    <Link key={sys.id} to={`/founder/monitoring/${sys.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {statusIcon(sys.status)}
                            <div>
                              <p className="font-semibold text-sm">{sys.system_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {sys.profiles?.company_name || sys.profiles?.full_name || "—"} · {sys.projects?.name || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{sysWorkflows.length} workflows · {sysAgents.length} agents</span>
                            <Badge className={statusBadge(sys.status)} variant="secondary">{sys.status}</Badge>
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Active Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  All systems operating normally.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge className={severityBadge(a.severity)} variant="secondary">{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.monitored_systems?.system_name || a.affected_system || "—"} · {format(new Date(a.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Workflow Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Recent Workflow Activity</CardTitle></CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No workflows configured.</p>
              ) : (
                <div className="space-y-3">
                  {workflows.slice(0, 6).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        {statusIcon(w.last_result || w.status)}
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.last_execution ? format(new Date(w.last_execution), "MMM d, h:mm a") : "No executions"}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusBadge(w.status)} variant="secondary">{w.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Agent Activity */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">AI Agent Activity</CardTitle></CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No agents configured.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map((a: any) => (
                  <div key={a.id} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2 mb-2">
                      {statusIcon(a.status)}
                      <p className="text-sm font-semibold">{a.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.agent_function || "—"}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="secondary" className={`text-xs ${statusBadge(a.status)}`}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {a.last_activity ? format(new Date(a.last_activity), "MMM d") : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <GlobalOperatingClockPanel />
      </div>
    </FounderLayout>
  );
};

export default MonitoringDashboard;
