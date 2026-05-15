import FounderLayout from "@/components/founder/FounderLayout";
import InternalOperatingSchedulesPanel from "@/components/founder/operations/InternalOperatingSchedulesPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Play, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, Pause, ListOrdered, History, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusIcon = (s: string) => {
  if (s === "completed" || s === "success") return <CheckCircle2 size={14} className="text-green-400" />;
  if (s === "running") return <Loader2 size={14} className="text-primary animate-spin" />;
  if (s === "queued") return <Clock size={14} className="text-muted-foreground" />;
  if (s === "failed" || s === "error") return <XCircle size={14} className="text-destructive" />;
  if (s === "paused") return <Pause size={14} className="text-yellow-400" />;
  if (s === "completed_with_warning") return <AlertCircle size={14} className="text-yellow-400" />;
  return <Clock size={14} className="text-muted-foreground" />;
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    running: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    success: "bg-green-500/20 text-green-400",
    failed: "bg-destructive/20 text-destructive",
    error: "bg-destructive/20 text-destructive",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed_with_warning: "bg-yellow-500/20 text-yellow-400",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const priorityBadge = (p: string) => {
  const m: Record<string, string> = {
    high: "bg-destructive/20 text-destructive",
    normal: "bg-muted text-muted-foreground",
    low: "bg-muted text-muted-foreground",
  };
  return m[p] || "bg-muted text-muted-foreground";
};

const ExecutionDashboard = () => {
  const [runOpen, setRunOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("normal");
  const queryClient = useQueryClient();

  const { data: executions = [] } = useQuery({
    queryKey: ["all-executions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_executions")
        .select("*, automation_workflows(name), monitored_systems(system_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows-for-exec"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_workflows")
        .select("id, name, system_id, monitored_systems(system_name)")
        .order("name");
      return data ?? [];
    },
  });

  const queuedExecs = executions.filter((e: any) => e.status === "queued");
  const runningExecs = executions.filter((e: any) => e.status === "running");
  const completedExecs = executions.filter((e: any) => e.status === "completed" || e.status === "completed_with_warning");
  const failedExecs = executions.filter((e: any) => e.status === "failed");

  const runWorkflow = useMutation({
    mutationFn: async () => {
      const wf = workflows.find((w: any) => w.id === selectedWorkflow);
      if (!wf) throw new Error("Workflow not found");

      // Create execution
      const { data: exec, error: execError } = await supabase
        .from("workflow_executions")
        .insert({
          workflow_id: selectedWorkflow,
          system_id: wf.system_id,
          status: "queued",
          priority: selectedPriority,
        })
        .select()
        .single();
      if (execError) throw execError;

      // Get workflow steps and create execution steps
      const { data: steps } = await supabase
        .from("workflow_steps")
        .select("*, ai_agents(name)")
        .eq("workflow_id", selectedWorkflow)
        .order("order_index");

      if (steps && steps.length > 0) {
        const execSteps = steps.map((s: any) => ({
          execution_id: exec.id,
          step_id: s.id,
          step_name: s.name,
          order_index: s.order_index,
          agent_id: s.agent_id,
          agent_name: s.ai_agents?.name || null,
          status: "pending",
        }));
        await supabase.from("execution_steps").insert(execSteps);
      }

      // Log start
      await supabase.from("execution_logs").insert({
        execution_id: exec.id,
        event: "Workflow Queued",
        details: `Workflow "${wf.name}" queued for execution`,
      });

      return exec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-executions"] });
      setRunOpen(false);
      setSelectedWorkflow("");
      toast.success("Workflow queued for execution.");
    },
    onError: () => toast.error("Failed to queue workflow."),
  });

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Execution Engine</h1>
            <p className="text-muted-foreground text-sm mt-1">Automation workflow execution control</p>
          </div>
          <Dialog open={runOpen} onOpenChange={setRunOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Play size={16} /> Run Workflow</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Run Workflow</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Select Workflow *</label>
                  <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose workflow" /></SelectTrigger>
                    <SelectContent>
                      {workflows.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} — {(w as any).monitored_systems?.system_name || "Unassigned"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Priority</label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => runWorkflow.mutate()} disabled={runWorkflow.isPending || !selectedWorkflow}>
                  {runWorkflow.isPending ? "Queuing..." : "Queue Execution"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <InternalOperatingSchedulesPanel />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <Clock size={20} className="text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{queuedExecs.length}</p>
              <p className="text-xs text-muted-foreground">Queued</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <Zap size={20} className="text-primary mb-2" />
              <p className="text-2xl font-bold">{runningExecs.length}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <CheckCircle2 size={20} className="text-green-400 mb-2" />
              <p className="text-2xl font-bold">{completedExecs.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <XCircle size={20} className="text-destructive mb-2" />
              <p className="text-2xl font-bold">{failedExecs.length}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Task Queue */}
        {queuedExecs.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ListOrdered size={18} /> Task Queue</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queuedExecs.map((e: any) => (
                  <Link key={e.id} to={`/founder/executions/${e.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-sm">{(e as any).automation_workflows?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{(e as any).monitored_systems?.system_name || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${priorityBadge(e.priority)}`}>{e.priority}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Running */}
        {runningExecs.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Active Executions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runningExecs.map((e: any) => (
                  <Link key={e.id} to={`/founder/executions/${e.id}`}>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Loader2 size={14} className="text-primary animate-spin" />
                          <div>
                            <p className="font-semibold text-sm">{(e as any).automation_workflows?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{(e as any).monitored_systems?.system_name || "—"}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Started {e.started_at ? format(new Date(e.started_at), "h:mm a") : "—"}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Execution History */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History size={18} /> Execution History</CardTitle></CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No executions yet.</p>
            ) : (
              <div className="space-y-3">
                {executions.map((e: any) => (
                  <Link key={e.id} to={`/founder/executions/${e.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(e.status)}
                          <div>
                            <p className="font-semibold text-sm">{(e as any).automation_workflows?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{(e as any).monitored_systems?.system_name || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {e.started_at ? format(new Date(e.started_at), "MMM d, h:mm a") : format(new Date(e.created_at), "MMM d, h:mm a")}
                            </p>
                            {e.completed_at && e.started_at && (
                              <p className="text-xs text-muted-foreground">
                                Duration: {Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 1000)}s
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className={statusBadge(e.status)}>{e.status.replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default ExecutionDashboard;
