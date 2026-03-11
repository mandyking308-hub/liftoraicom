import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Play, Bot, Workflow, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(142 76% 36%)", "hsl(48 96% 53%)"];

const ClientAnalytics = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["ca-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["ca-systems", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, system_name").eq("client_id", profile!.id);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const systemIds = systems.map((s: any) => s.id);

  const { data: executions = [] } = useQuery({
    queryKey: ["ca-executions", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name)").in("system_id", systemIds).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["ca-agents", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("ai_agents").select("*").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["ca-workflows", systemIds],
    queryFn: async () => {
      if (systemIds.length === 0) return [];
      const { data } = await supabase.from("automation_workflows").select("*").in("system_id", systemIds);
      return data ?? [];
    },
    enabled: systemIds.length > 0,
  });

  const totalExecs = executions.length;
  const successExecs = executions.filter((e: any) => e.status === "completed").length;
  const failedExecs = executions.filter((e: any) => e.status === "failed").length;
  const successRate = totalExecs > 0 ? Math.round((successExecs / totalExecs) * 100) : 0;

  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayExecs = executions.filter((e: any) => e.created_at?.startsWith(dateStr));
    return {
      date: format(date, "MMM d"),
      total: dayExecs.length,
      success: dayExecs.filter((e: any) => e.status === "completed").length,
      failed: dayExecs.filter((e: any) => e.status === "failed").length,
    };
  });

  const statusPie = [
    { name: "Completed", value: successExecs },
    { name: "Failed", value: failedExecs },
    { name: "Running", value: executions.filter((e: any) => e.status === "running").length },
  ].filter(s => s.value > 0);

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance metrics for your AI systems</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Executions", value: totalExecs, icon: Play },
            { label: "Successful", value: successExecs, icon: CheckCircle2 },
            { label: "Failed", value: failedExecs, icon: XCircle },
            { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp },
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

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border/50 lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Automation Activity (14 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="success" stackId="a" fill="hsl(142 76% 36%)" name="Success" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Execution Status</CardTitle></CardHeader>
            <CardContent>
              {statusPie.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bot size={18} /> AI Agent Performance</CardTitle></CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No agents assigned.</p>
            ) : (
              <div className="space-y-3">
                {agents.map((a: any) => {
                  const rate = (a.tasks_completed_total + a.tasks_pending) > 0 ? Math.round((a.tasks_completed_total / (a.tasks_completed_total + a.tasks_pending)) * 100) : 0;
                  return (
                    <div key={a.id} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{a.name}</p>
                        <Badge variant="secondary" className={a.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>{a.status}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><p className="text-muted-foreground text-xs">Tasks Completed</p><p className="font-bold">{a.tasks_completed_total}</p></div>
                        <div><p className="text-muted-foreground text-xs">Pending</p><p className="font-bold">{a.tasks_pending}</p></div>
                        <div><p className="text-muted-foreground text-xs">Success Rate</p><p className="font-bold">{rate}%</p></div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Performance */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Workflow size={18} /> Workflow Performance</CardTitle></CardHeader>
          <CardContent>
            {workflows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workflows configured.</p>
            ) : (
              <div className="space-y-3">
                {workflows.map((w: any) => {
                  const rate = w.execution_count > 0 ? Math.round((w.success_count / w.execution_count) * 100) : 0;
                  return (
                    <div key={w.id} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{w.name}</p>
                        <Badge variant="secondary" className={rate >= 90 ? "bg-green-500/20 text-green-400" : rate >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}>{rate}%</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><p className="text-muted-foreground text-xs">Total Runs</p><p className="font-bold">{w.execution_count}</p></div>
                        <div><p className="text-muted-foreground text-xs">Successful</p><p className="font-bold">{w.success_count}</p></div>
                        <div><p className="text-muted-foreground text-xs">Failures</p><p className="font-bold">{w.failure_count}</p></div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default ClientAnalytics;
