import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Server, Bot, Workflow, AlertTriangle, CheckCircle2, Clock, XCircle, Activity, Play } from "lucide-react";

const statusIcon = (s: string) => {
  if (["operational", "active", "connected", "completed", "running", "success"].includes(s)) return <CheckCircle2 size={14} className="text-green-400" />;
  if (["warning", "degraded", "paused"].includes(s)) return <Clock size={14} className="text-yellow-400" />;
  if (["offline", "failed", "error", "disconnected"].includes(s)) return <XCircle size={14} className="text-destructive" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusClass = (s: string) => {
  if (["operational", "active", "connected", "running", "completed", "success"].includes(s)) return "bg-green-500/20 text-green-400";
  if (["warning", "degraded", "paused"].includes(s)) return "bg-yellow-500/20 text-yellow-400";
  if (["offline", "failed", "error"].includes(s)) return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
};

const ClientControlPanel = () => {
  const { user } = useAuth();

  // Get client profile
  const { data: profile } = useQuery({
    queryKey: ["client-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Systems
  const { data: systems = [] } = useQuery({
    queryKey: ["client-systems", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("*, projects(name)").eq("client_id", profile!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!profile,
  });

  // Agents for client systems
  const systemIds = systems.map((s: any) => s.id);
  const { data: agents = [] } = useQuery({
    queryKey: ["client-agents", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("ai_agents").select("*, monitored_systems(system_name)").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  // Workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ["client-workflows", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("automation_workflows").select("*, monitored_systems(system_name)").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  // Executions
  const { data: executions = [] } = useQuery({
    queryKey: ["client-executions", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name), monitored_systems(system_name)").in("system_id", systemIds).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  // Alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["client-alerts", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("system_alerts").select("*, monitored_systems(system_name)").in("system_id", systemIds).eq("resolved", false).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const activeAgents = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;
  const runningWorkflows = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Control Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor your AI systems and automation infrastructure</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Systems", value: systems.filter((s: any) => s.status === "operational").length, total: systems.length, icon: Server },
            { label: "AI Agents", value: activeAgents, total: agents.length, icon: Bot },
            { label: "Workflows", value: runningWorkflows, total: workflows.length, icon: Workflow },
            { label: "Alerts", value: alerts.length, icon: AlertTriangle },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <s.icon size={18} className="text-primary" />
                  {s.total !== undefined && <span className="text-xs text-muted-foreground">{s.value}/{s.total}</span>}
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Systems Directory */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Server size={18} /> Your Systems</CardTitle></CardHeader>
          <CardContent>
            {systems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No systems assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {systems.map((sys: any) => (
                  <Link key={sys.id} to={`/portal/systems/${sys.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(sys.status)}
                          <div>
                            <p className="font-medium">{sys.system_name}</p>
                            <p className="text-xs text-muted-foreground">{sys.projects?.name || "—"}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={statusClass(sys.status)}>{sys.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Automations */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play size={18} /> Recent Automations</CardTitle></CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent automations.</p>
              ) : (
                <div className="space-y-3">
                  {executions.slice(0, 6).map((e: any) => (
                    <div key={e.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(e.status)}
                          <div>
                            <p className="text-sm font-medium">{e.automation_workflows?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{e.monitored_systems?.system_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${statusClass(e.status)}`}>{e.status.replace(/_/g, " ")}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> System Alerts</CardTitle></CardHeader>
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
                        <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : a.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.monitored_systems?.system_name} · {format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ClientControlPanel;
