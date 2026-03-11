import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const statusIcon = (status: string) => {
  if (status === "operational" || status === "active" || status === "success") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "warning" || status === "degraded") return <AlertCircle size={14} className="text-yellow-400" />;
  if (status === "offline" || status === "failed" || status === "error") return <XCircle size={14} className="text-destructive" />;
  return <Clock size={14} className="text-primary" />;
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
    success: "bg-green-500/20 text-green-400",
    failed: "bg-destructive/20 text-destructive",
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

const MonitoringSystemDetail = () => {
  const { id } = useParams();

  const { data: system } = useQuery({
    queryKey: ["monitored-system", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("monitored_systems")
        .select("*, projects(name), profiles(full_name, company_name)")
        .eq("id", id!)
        .single();
      return data;
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["system-workflows", id],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*").eq("system_id", id!).order("name");
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["system-agents", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*").eq("system_id", id!).order("name");
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["system-alerts", id],
    queryFn: async () => {
      const { data } = await supabase.from("system_alerts").select("*").eq("system_id", id!).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  if (!system) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  const totalExec = workflows.reduce((s: number, w: any) => s + (w.execution_count || 0), 0);
  const totalSuccess = workflows.reduce((s: number, w: any) => s + (w.success_count || 0), 0);
  const totalFailure = workflows.reduce((s: number, w: any) => s + (w.failure_count || 0), 0);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/monitoring" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Monitoring
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{system.system_name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {(system as any).profiles?.company_name || (system as any).profiles?.full_name || "—"} · {(system as any).projects?.name || "—"}
            </p>
          </div>
          <Badge className={statusBadge(system.status)} variant="secondary">{system.status}</Badge>
        </div>

        {/* Performance */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Workflows */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Automation Workflows</CardTitle></CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No workflows.</p>
              ) : (
                <div className="space-y-3">
                  {workflows.map((w: any) => (
                    <div key={w.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(w.last_result || w.status)}
                          <p className="text-sm font-medium">{w.name}</p>
                        </div>
                        <Badge className={statusBadge(w.status)} variant="secondary">{w.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{w.execution_count} runs</span>
                        <span className="text-green-400">{w.success_count} ok</span>
                        <span className="text-destructive">{w.failure_count} fail</span>
                        {w.last_execution && <span>Last: {format(new Date(w.last_execution), "MMM d, h:mm a")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agents */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">AI Agents</CardTitle></CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No agents.</p>
              ) : (
                <div className="space-y-3">
                  {agents.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(a.status)}
                          <p className="text-sm font-medium">{a.name}</p>
                        </div>
                        <Badge className={statusBadge(a.status)} variant="secondary">{a.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.agent_function || "—"}
                        {a.last_activity ? ` · Last active: ${format(new Date(a.last_activity), "MMM d, h:mm a")}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Alerts</CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 size={18} className="text-green-400" />
                No alerts for this system.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a: any) => (
                  <div key={a.id} className={`p-3 rounded-lg ${a.resolved ? "bg-secondary/30 opacity-60" : "bg-secondary/50"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.title}</p>
                      <div className="flex items-center gap-2">
                        {a.resolved && <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">Resolved</Badge>}
                        <Badge className={severityBadge(a.severity)} variant="secondary">{a.severity}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.affected_system ? `${a.affected_system} · ` : ""}{format(new Date(a.created_at), "MMM d, h:mm a")}
                    </p>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
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

export default MonitoringSystemDetail;
