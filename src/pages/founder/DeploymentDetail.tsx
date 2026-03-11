import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Rocket, CheckCircle2, Clock, XCircle, Activity } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const stageStatusIcon = (s: string) => {
  if (s === "completed") return <CheckCircle2 size={16} className="text-green-400" />;
  if (s === "in_progress") return <Clock size={16} className="text-primary animate-pulse" />;
  return <XCircle size={16} className="text-muted-foreground" />;
};

const deployStatusOptions = ["preparation", "testing", "ready_for_launch", "deployed", "post_launch_monitoring"];
const statusClass = (s: string) => {
  if (s === "deployed" || s === "post_launch_monitoring") return "bg-green-500/20 text-green-400";
  if (s === "ready_for_launch") return "bg-yellow-500/20 text-yellow-400";
  if (s === "testing") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const DeploymentDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: deployment, refetch: refetchDep } = useQuery({
    queryKey: ["deployment", id],
    queryFn: async () => {
      const { data } = await supabase.from("deployments").select("*, architectures(name)").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: stages = [], refetch: refetchStages } = useQuery({
    queryKey: ["deploy-stages", id],
    queryFn: async () => {
      const { data } = await supabase.from("deployment_stages").select("*").eq("deployment_id", id!).order("order_index");
      return data ?? [];
    },
  });

  const { data: checklist = [], refetch: refetchChecklist } = useQuery({
    queryKey: ["deploy-checklist", id],
    queryFn: async () => {
      const { data } = await supabase.from("deployment_checklist").select("*").eq("deployment_id", id!).order("order_index");
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["deploy-logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("deployment_logs").select("*").eq("deployment_id", id!).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const updateStageStatus = async (stageId: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    await supabase.from("deployment_stages").update(updates).eq("id", stageId);
    const stage = stages.find((s: any) => s.id === stageId);
    await supabase.from("deployment_logs").insert({ deployment_id: id!, event: `Stage "${stage?.name}" → ${status}` });
    refetchStages();
    toast.success("Stage updated");
  };

  const toggleChecklist = async (itemId: string, completed: boolean) => {
    await supabase.from("deployment_checklist").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", itemId);
    refetchChecklist();
  };

  const updateDeployStatus = async (status: string) => {
    const updates: any = { status };
    if (status === "deployed") updates.launched_at = new Date().toISOString();
    await supabase.from("deployments").update(updates).eq("id", id!);
    await supabase.from("deployment_logs").insert({ deployment_id: id!, event: `Deployment status → ${status.replace(/_/g, " ")}` });
    refetchDep();
    toast.success("Status updated");
  };

  if (!deployment) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  const completedStages = stages.filter((s: any) => s.status === "completed").length;
  const completedChecklist = checklist.filter((c: any) => c.completed).length;
  const progress = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/deployments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Deployments
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{deployment.system_name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {deployment.client_organisation && <span>{deployment.client_organisation}</span>}
              {(deployment as any).architectures?.name && <span>· Arch: {(deployment as any).architectures.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={deployment.status} onValueChange={updateDeployStatus}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {deployStatusOptions.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50"><CardContent className="p-5">
            <p className="text-2xl font-bold">{progress}%</p>
            <p className="text-xs text-muted-foreground">Stage Progress</p>
          </CardContent></Card>
          <Card className="bg-card border-border/50"><CardContent className="p-5">
            <p className="text-2xl font-bold">{completedStages}/{stages.length}</p>
            <p className="text-xs text-muted-foreground">Stages Complete</p>
          </CardContent></Card>
          <Card className="bg-card border-border/50"><CardContent className="p-5">
            <p className="text-2xl font-bold">{completedChecklist}/{checklist.length}</p>
            <p className="text-xs text-muted-foreground">Checklist Complete</p>
          </CardContent></Card>
          <Card className="bg-card border-border/50"><CardContent className="p-5">
            <p className="text-2xl font-bold">{deployment.expected_launch_date ? format(new Date(deployment.expected_launch_date), "MMM d") : "—"}</p>
            <p className="text-xs text-muted-foreground">Launch Date</p>
          </CardContent></Card>
        </div>

        {/* Stage progress bar */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Deployment Stages</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stages.map((stage: any) => (
                <div key={stage.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {stageStatusIcon(stage.status)}
                    <div>
                      <p className="text-sm font-medium">{stage.name}</p>
                      {stage.completed_at && <p className="text-xs text-muted-foreground">Completed {format(new Date(stage.completed_at), "MMM d, h:mm a")}</p>}
                    </div>
                  </div>
                  <Select value={stage.status} onValueChange={v => updateStageStatus(stage.id, v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Checklist */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Launch Readiness Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Checkbox checked={item.completed} onCheckedChange={(checked) => toggleChecklist(item.id, !!checked)} />
                    <div>
                      <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "font-medium"}`}>{item.item}</p>
                      {item.completed_at && <p className="text-xs text-muted-foreground">{format(new Date(item.completed_at), "MMM d, h:mm a")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> Deployment Activity</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                      <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                      <div>
                        <p className="font-medium">{log.event}</p>
                        {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Post-launch info */}
        {deployment.launched_at && (
          <Card className="bg-card border-border/50 border-green-500/30">
            <CardHeader><CardTitle className="text-lg text-green-400">🚀 System Deployed</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground">Launch Date</p><p className="font-medium">{format(new Date(deployment.launched_at), "MMM d, yyyy h:mm a")}</p></div>
                <div><p className="text-muted-foreground">System Status</p><Badge variant="secondary" className={statusClass(deployment.status)}>{deployment.status.replace(/_/g, " ")}</Badge></div>
                <div><p className="text-muted-foreground">Monitoring</p><Badge variant="secondary" className="bg-green-500/20 text-green-400">Active</Badge></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
};

export default DeploymentDetail;
