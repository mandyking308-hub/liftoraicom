import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, Bot, Zap } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    running: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    draft: "bg-muted text-muted-foreground",
    maintenance: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    pending: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/20 text-primary",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const stepIcon = (status: string) => {
  if (status === "completed") return <CheckCircle2 size={16} className="text-green-400" />;
  if (status === "in_progress") return <Zap size={16} className="text-primary" />;
  return <Clock size={16} className="text-muted-foreground" />;
};

const WorkflowDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [stepOpen, setStepOpen] = useState(false);
  const [stepAgent, setStepAgent] = useState("");

  const { data: workflow } = useQuery({
    queryKey: ["workflow-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_workflows")
        .select("*, monitored_systems(system_name, projects(name))")
        .eq("id", id!)
        .single();
      return data;
    },
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["workflow-steps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("*, ai_agents(name)")
        .eq("workflow_id", id!)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-for-assignment"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["workflow-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_activity_logs")
        .select("*")
        .eq("workflow_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["workflow-alerts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_alerts")
        .select("*")
        .eq("workflow_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const addStep = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("workflow_steps").insert({
        workflow_id: id!,
        order_index: steps.length + 1,
        name: form.get("name") as string,
        description: form.get("description") as string,
        agent_id: stepAgent || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-steps", id] });
      setStepOpen(false);
      setStepAgent("");
      toast.success("Step added.");
    },
    onError: () => toast.error("Failed to add step."),
  });

  if (!workflow) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/workflows" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Workflows
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {(workflow as any).monitored_systems?.system_name || "Unassigned"} · {workflow.automation_type?.replace(/_/g, " ") || "—"}
            </p>
          </div>
          <Badge variant="secondary" className={statusBadge(workflow.status)}>{workflow.status}</Badge>
        </div>

        {/* Overview */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="mt-1">{workflow.description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">System</p>
                <p className="mt-1">{(workflow as any).monitored_systems?.system_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Executions</p>
                <p className="mt-1 font-semibold">{workflow.execution_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Execution</p>
                <p className="mt-1">{workflow.last_execution ? format(new Date(workflow.last_execution), "MMM d, h:mm a") : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Automation Steps</CardTitle>
              <Dialog open={stepOpen} onOpenChange={setStepOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2"><Plus size={14} /> Add Step</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Add Workflow Step</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addStep.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Step Name *</label>
                      <Input name="name" required placeholder="e.g. Data Input" className="bg-secondary border-border" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Description</label>
                      <Textarea name="description" placeholder="What this step does..." className="bg-secondary border-border" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Assign Agent</label>
                      <Select value={stepAgent} onValueChange={setStepAgent}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Optional — select agent" /></SelectTrigger>
                        <SelectContent>
                          {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={addStep.isPending}>
                      {addStep.isPending ? "Adding..." : "Add Step"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-muted-foreground text-sm">No steps defined. Add steps to build the workflow.</p>
            ) : (
              <div className="space-y-1">
                {steps.map((step: any, idx: number) => (
                  <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                    <div className="flex flex-col items-center gap-1 min-w-[32px]">
                      <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      {idx < steps.length - 1 && <div className="w-px h-6 bg-border" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stepIcon(step.status)}
                          <p className="font-semibold text-sm">{step.name}</p>
                        </div>
                        <Badge variant="secondary" className={`text-xs ${statusBadge(step.status)}`}>{step.status.replace(/_/g, " ")}</Badge>
                      </div>
                      {step.description && <p className="text-xs text-muted-foreground mt-1">{step.description}</p>}
                      {step.ai_agents && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Bot size={12} className="text-primary" />
                          <span className="text-xs text-primary">{step.ai_agents.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity Log */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Activity Log</CardTitle></CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity.</p>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.details ? `${log.details} · ` : ""}{format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  No alerts.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className={`p-3 rounded-lg ${a.resolved ? "bg-secondary/30 opacity-60" : "bg-secondary/50"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FounderLayout>
  );
};

export default WorkflowDetail;
