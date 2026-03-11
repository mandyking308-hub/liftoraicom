import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, XCircle, Clock, Server, Activity } from "lucide-react";

const statusIcon = (status: string) => {
  if (status === "operational" || status === "active" || status === "success") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "warning" || status === "degraded") return <AlertCircle size={14} className="text-yellow-400" />;
  if (status === "offline" || status === "failed") return <XCircle size={14} className="text-destructive" />;
  return <Clock size={14} className="text-primary" />;
};

const statusBadge = (status: string) => {
  const m: Record<string, string> = {
    operational: "bg-green-500/20 text-green-400",
    active: "bg-green-500/20 text-green-400",
    running: "bg-green-500/20 text-green-400",
    processing: "bg-primary/20 text-primary",
    warning: "bg-yellow-500/20 text-yellow-400",
    maintenance: "bg-primary/20 text-primary",
    offline: "bg-destructive/20 text-destructive",
  };
  return m[status] || "bg-muted text-muted-foreground";
};

const ClientSystemMonitoring = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["client-systems", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("monitored_systems")
        .select("*, projects(name)")
        .eq("client_id", profileId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const systemIds = systems.map((s: any) => s.id);

  const { data: workflows = [] } = useQuery({
    queryKey: ["client-workflows", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*").in("system_id", systemIds);
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["client-agents", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*").in("system_id", systemIds);
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["client-alerts", systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_alerts")
        .select("*")
        .in("system_id", systemIds)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (systems.length === 0) {
    return (
      <PortalLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <Activity size={40} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No monitored systems available.</p>
              <p className="text-sm text-muted-foreground mt-1">System monitoring is enabled after deployment.</p>
            </CardContent>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time status of your deployed systems</p>
        </div>

        {systems.map((sys: any) => {
          const sysWorkflows = workflows.filter((w: any) => w.system_id === sys.id);
          const sysAgents = agents.filter((a: any) => a.system_id === sys.id);
          const sysAlerts = alerts.filter((a: any) => a.system_id === sys.id);

          return (
            <div key={sys.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{sys.system_name}</h2>
                  <p className="text-xs text-muted-foreground">{(sys as any).projects?.name || "—"}</p>
                </div>
                <Badge className={statusBadge(sys.status)} variant="secondary">{sys.status}</Badge>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Workflows */}
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Automation Workflows</CardTitle></CardHeader>
                  <CardContent>
                    {sysWorkflows.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No workflows.</p>
                    ) : (
                      <div className="space-y-2">
                        {sysWorkflows.map((w: any) => (
                          <div key={w.id} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                            <div className="flex items-center gap-2">
                              {statusIcon(w.status)}
                              <span className="text-sm">{w.name}</span>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${statusBadge(w.status)}`}>{w.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Agents */}
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-3"><CardTitle className="text-sm">AI Agents</CardTitle></CardHeader>
                  <CardContent>
                    {sysAgents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No agents.</p>
                    ) : (
                      <div className="space-y-2">
                        {sysAgents.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                            <div className="flex items-center gap-2">
                              {statusIcon(a.status)}
                              <div>
                                <span className="text-sm">{a.name}</span>
                                <p className="text-xs text-muted-foreground">{a.agent_function}</p>
                              </div>
                            </div>
                            <Badge className={statusBadge(a.status)} variant="secondary" className={`text-xs ${statusBadge(a.status)}`}>{a.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {sysAlerts.length > 0 && (
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Active Alerts</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sysAlerts.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}`}>{a.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
};

export default ClientSystemMonitoring;
