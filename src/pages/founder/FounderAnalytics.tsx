import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import LearningOptimisationEnginePanel from "@/components/founder/optimisation/LearningOptimisationEnginePanel";
import HumanAccountManagerPanel from "@/components/founder/customer/HumanAccountManagerPanel";
import RetentionRecurringRevenuePanel from "@/components/founder/customer/RetentionRecurringRevenuePanel";
import PortfolioIntelligenceBrainPanel from "@/components/founder/strategy/PortfolioIntelligenceBrainPanel";
import SocialAnalyticsTrendPanel from "@/components/founder/social/SocialAnalyticsTrendPanel";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { Play, Bot, Workflow, AlertTriangle, CheckCircle2, TrendingUp, XCircle } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(142 76% 36%)", "hsl(48 96% 53%)"];

const FounderAnalytics = () => {
  const { data: executions = [] } = useQuery({
    queryKey: ["analytics-executions"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name), monitored_systems(system_name)").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["analytics-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*, monitored_systems(system_name)");
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["analytics-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*, monitored_systems(system_name)");
      return data ?? [];
    },
  });

  const { data: taskStats = [] } = useQuery({
    queryKey: ["analytics-task-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_task_stats").select("*, ai_agents(name)").order("date", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // Automation metrics
  const totalExecs = executions.length;
  const successExecs = executions.filter((e: any) => e.status === "completed").length;
  const failedExecs = executions.filter((e: any) => e.status === "failed").length;
  const runningExecs = executions.filter((e: any) => e.status === "running").length;
  const successRate = totalExecs > 0 ? Math.round((successExecs / totalExecs) * 100) : 0;

  // Daily activity chart (last 14 days)
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

  // Execution status pie
  const statusPie = [
    { name: "Completed", value: successExecs },
    { name: "Failed", value: failedExecs },
    { name: "Running", value: runningExecs },
    { name: "Queued", value: executions.filter((e: any) => e.status === "queued").length },
  ].filter(s => s.value > 0);

  // Top agents by tasks
  const agentPerf = agents.map((a: any) => ({
    name: a.name,
    completed: a.tasks_completed_total || 0,
    pending: a.tasks_pending || 0,
    system: a.monitored_systems?.system_name || "—",
    status: a.status,
  })).sort((a: any, b: any) => b.completed - a.completed);

  // Workflow performance
  const workflowPerf = workflows.map((w: any) => ({
    name: w.name,
    executions: w.execution_count || 0,
    success: w.success_count || 0,
    failures: w.failure_count || 0,
    rate: w.execution_count > 0 ? Math.round((w.success_count / w.execution_count) * 100) : 0,
    system: w.monitored_systems?.system_name || "—",
  })).sort((a: any, b: any) => b.executions - a.executions);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Analytics & Performance</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide performance metrics and operational insights</p>
        </div>

        <LearningOptimisationEnginePanel />
        <HumanAccountManagerPanel />
        <RetentionRecurringRevenuePanel />
        <PortfolioIntelligenceBrainPanel />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Executions", value: totalExecs, icon: Play },
            { label: "Successful", value: successExecs, icon: CheckCircle2 },
            { label: "Failed", value: failedExecs, icon: XCircle },
            { label: "Running Now", value: runningExecs, icon: TrendingUp },
            { label: "Success Rate", value: `${successRate}%`, icon: Workflow },
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

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily activity */}
          <Card className="bg-card border-border/50 lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Automation Activity (14 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="success" stackId="a" fill="hsl(142 76% 36%)" radius={[0, 0, 0, 0]} name="Success" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status pie */}
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
            {agentPerf.length === 0 ? (
              <p className="text-muted-foreground text-sm">No agents configured.</p>
            ) : (
              <div className="space-y-3">
                {agentPerf.slice(0, 10).map((a: any) => {
                  const rate = (a.completed + a.pending) > 0 ? Math.round((a.completed / (a.completed + a.pending)) * 100) : 0;
                  return (
                    <div key={a.name} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.system}</p>
                        </div>
                        <Badge variant="secondary" className={a.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>{a.status}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><p className="text-muted-foreground text-xs">Tasks Completed</p><p className="font-bold">{a.completed}</p></div>
                        <div><p className="text-muted-foreground text-xs">Pending</p><p className="font-bold">{a.pending}</p></div>
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
            {workflowPerf.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workflows configured.</p>
            ) : (
              <div className="space-y-3">
                {workflowPerf.slice(0, 10).map((w: any) => (
                  <div key={w.name} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{w.system}</p>
                      </div>
                      <Badge variant="secondary" className={w.rate >= 90 ? "bg-green-500/20 text-green-400" : w.rate >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}>{w.rate}%</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-muted-foreground text-xs">Total Executions</p><p className="font-bold">{w.executions}</p></div>
                      <div><p className="text-muted-foreground text-xs">Successful</p><p className="font-bold">{w.success}</p></div>
                      <div><p className="text-muted-foreground text-xs">Failures</p><p className="font-bold">{w.failures}</p></div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${w.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <SocialAnalyticsTrendPanel />
      </div>
    </FounderLayout>
  );
};

export default FounderAnalytics;
