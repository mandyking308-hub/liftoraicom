import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, Loader2, Pause, Bot, Zap, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusIcon = (s: string) => {
  if (s === "completed" || s === "success") return <CheckCircle2 size={16} className="text-green-400" />;
  if (s === "running" || s === "in_progress") return <Loader2 size={16} className="text-primary animate-spin" />;
  if (s === "pending" || s === "queued") return <Clock size={16} className="text-muted-foreground" />;
  if (s === "failed" || s === "error") return <XCircle size={16} className="text-destructive" />;
  if (s === "paused") return <Pause size={16} className="text-yellow-400" />;
  return <Clock size={16} className="text-muted-foreground" />;
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    queued: "bg-muted text-muted-foreground",
    running: "bg-primary/20 text-primary",
    in_progress: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    success: "bg-green-500/20 text-green-400",
    failed: "bg-destructive/20 text-destructive",
    error: "bg-destructive/20 text-destructive",
    paused: "bg-yellow-500/20 text-yellow-400",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const ExecutionDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: execution } = useQuery({
    queryKey: ["execution-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_executions")
        .select("*, automation_workflows(name, description), monitored_systems(system_name)")
        .eq("id", id!)
        .single();
      return data;
    },
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["execution-steps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("execution_steps")
        .select("*")
        .eq("execution_id", id!)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["execution-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("execution_logs")
        .select("*")
        .eq("execution_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const startExecution = useMutation({
    mutationFn: async () => {
      // Update execution to running
      await supabase.from("workflow_executions").update({
        status: "running",
        started_at: new Date().toISOString(),
      }).eq("id", id!);

      await supabase.from("execution_logs").insert({
        execution_id: id!,
        event: "Workflow Started",
        details: "Execution started",
      });

      // Process steps sequentially (simulate)
      for (const step of steps) {
        // Mark step running
        await supabase.from("execution_steps").update({
          status: "running",
          started_at: new Date().toISOString(),
        }).eq("id", step.id);

        await supabase.from("execution_logs").insert({
          execution_id: id!,
          step_name: step.step_name,
          event: "Step Started",
          details: step.agent_name ? `Agent: ${step.agent_name}` : undefined,
        });

        // Simulate processing delay
        await new Promise(r => setTimeout(r, 500));

        // Mark step completed
        await supabase.from("execution_steps").update({
          status: "completed",
          result: "success",
          completed_at: new Date().toISOString(),
        }).eq("id", step.id);

        await supabase.from("execution_logs").insert({
          execution_id: id!,
          step_name: step.step_name,
          event: "Step Completed",
          result: "success",
        });
      }

      // Mark execution completed
      await supabase.from("workflow_executions").update({
        status: "completed",
        result: "success",
        completed_at: new Date().toISOString(),
      }).eq("id", id!);

      await supabase.from("execution_logs").insert({
        execution_id: id!,
        event: "Workflow Completed",
        result: "success",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["execution-steps", id] });
      queryClient.invalidateQueries({ queryKey: ["execution-logs", id] });
      toast.success("Workflow execution completed.");
    },
    onError: async () => {
      await supabase.from("workflow_executions").update({
        status: "failed",
        error_message: "Execution error",
        completed_at: new Date().toISOString(),
      }).eq("id", id!);

      await supabase.from("execution_logs").insert({
        execution_id: id!,
        event: "Workflow Failed",
        result: "error",
        details: "An error occurred during execution",
      });

      queryClient.invalidateQueries({ queryKey: ["execution-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["execution-logs", id] });
      toast.error("Workflow execution failed.");
    },
  });

  if (!execution) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  const duration = execution.completed_at && execution.started_at
    ? Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)
    : null;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/executions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Executions
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{(execution as any).automation_workflows?.name || "Execution"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{(execution as any).monitored_systems?.system_name || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            {execution.status === "queued" && (
              <Button size="sm" className="gap-2" onClick={() => startExecution.mutate()} disabled={startExecution.isPending}>
                <Play size={14} /> {startExecution.isPending ? "Running..." : "Start"}
              </Button>
            )}
            <Badge variant="secondary" className={statusBadge(execution.status)}>{execution.status.replace(/_/g, " ")}</Badge>
          </div>
        </div>

        {/* Overview */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {statusIcon(execution.status)}
                  <span className="capitalize">{execution.status.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Priority</p>
                <p className="mt-1 capitalize">{execution.priority}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Started</p>
                <p className="mt-1">{execution.started_at ? format(new Date(execution.started_at), "MMM d, h:mm:ss a") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="mt-1">{execution.completed_at ? format(new Date(execution.completed_at), "MMM d, h:mm:ss a") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                <p className="mt-1">{duration !== null ? `${duration}s` : "—"}</p>
              </div>
            </div>
            {execution.error_message && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-destructive" />
                  <p className="text-sm text-destructive font-medium">Error: {execution.error_message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Steps */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Execution Steps</CardTitle></CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-muted-foreground text-sm">No steps.</p>
            ) : (
              <div className="space-y-1">
                {steps.map((step: any, idx: number) => (
                  <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                    <div className="flex flex-col items-center gap-1 min-w-[32px]">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                        step.status === "completed" ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : step.status === "running" ? "bg-primary/20 border-primary/40 text-primary"
                        : step.status === "failed" ? "bg-destructive/20 border-destructive/40 text-destructive"
                        : "bg-card border-border text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < steps.length - 1 && <div className="w-px h-6 bg-border" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(step.status)}
                          <p className="font-semibold text-sm">{step.step_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.started_at && step.completed_at && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)}s
                            </span>
                          )}
                          <Badge variant="secondary" className={`text-xs ${statusBadge(step.status)}`}>{step.status}</Badge>
                        </div>
                      </div>
                      {step.agent_name && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Bot size={12} className="text-primary" />
                          <span className="text-xs text-primary">{step.agent_name}</span>
                        </div>
                      )}
                      {step.error_message && (
                        <p className="text-xs text-destructive mt-1">{step.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Execution Logs</CardTitle></CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No logs.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 font-mono text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "HH:mm:ss")}</span>
                    <span className={`font-semibold whitespace-nowrap ${
                      log.result === "success" ? "text-green-400"
                      : log.result === "error" ? "text-destructive"
                      : "text-foreground"
                    }`}>{log.event}</span>
                    {log.step_name && <span className="text-primary">[{log.step_name}]</span>}
                    {log.details && <span className="text-muted-foreground">{log.details}</span>}
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

export default ExecutionDetail;
