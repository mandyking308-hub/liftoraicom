import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Search, Workflow, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusIcon = (s: string) => {
  if (s === "active" || s === "running") return <CheckCircle2 size={14} className="text-green-400" />;
  if (s === "paused") return <AlertCircle size={14} className="text-yellow-400" />;
  if (s === "draft") return <Clock size={14} className="text-muted-foreground" />;
  if (s === "maintenance") return <XCircle size={14} className="text-primary" />;
  return <Clock size={14} className="text-muted-foreground" />;
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    running: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    draft: "bg-muted text-muted-foreground",
    maintenance: "bg-primary/20 text-primary",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const typeBadge = (t: string) => {
  const m: Record<string, string> = {
    data_processing: "bg-blue-500/20 text-blue-400",
    customer_interaction: "bg-purple-500/20 text-purple-400",
    reporting: "bg-primary/20 text-primary",
    operational: "bg-green-500/20 text-green-400",
  };
  return m[t] || "bg-muted text-muted-foreground";
};

const WorkflowDirectory = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [automationType, setAutomationType] = useState("operational");
  const [systemId, setSystemId] = useState("");
  const queryClient = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ["all-workflows-dir"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_workflows")
        .select("*, monitored_systems(system_name, projects(name))")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["all-systems-for-workflow"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, system_name").order("system_name");
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["workflow-alerts-unresolved"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_alerts").select("*, automation_workflows(name)").eq("resolved", false).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("automation_workflows").insert({
        system_id: systemId,
        name: form.get("name") as string,
        description: form.get("description") as string,
        automation_type: automationType,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-workflows-dir"] });
      setOpen(false);
      toast.success("Workflow created.");
    },
    onError: () => toast.error("Failed to create workflow."),
  });

  const filtered = workflows.filter((w: any) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflow Builder</h1>
            <p className="text-muted-foreground text-sm mt-1">Design and manage automation workflows</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Workflow</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Workflow Name *</label>
                  <Input name="name" required placeholder="e.g. Client Reporting Automation" className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea name="description" placeholder="Describe the workflow..." className="bg-secondary border-border min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assigned System *</label>
                  <Select value={systemId} onValueChange={setSystemId} required>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select system" /></SelectTrigger>
                    <SelectContent>
                      {systems.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.system_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Automation Type</label>
                  <Select value={automationType} onValueChange={setAutomationType}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_processing">Data Processing</SelectItem>
                      <SelectItem value="customer_interaction">Customer Interaction</SelectItem>
                      <SelectItem value="reporting">Reporting Automation</SelectItem>
                      <SelectItem value="operational">Operational Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !systemId}>
                  {createMutation.isPending ? "Creating..." : "Create Workflow"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <Workflow size={20} className="text-primary mb-2" />
              <p className="text-2xl font-bold">{workflows.length}</p>
              <p className="text-xs text-muted-foreground">Total Workflows</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <CheckCircle2 size={20} className="text-green-400 mb-2" />
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <AlertCircle size={20} className="text-yellow-400 mb-2" />
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Open Alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Directory */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Workflow Directory</CardTitle>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border h-9 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workflows found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((w: any) => (
                  <Link key={w.id} to={`/founder/workflows/${w.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(w.status)}
                          <div>
                            <p className="font-semibold text-sm">{w.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {w.monitored_systems?.system_name || "Unassigned"}
                              {w.description ? ` · ${w.description.slice(0, 60)}${w.description.length > 60 ? "..." : ""}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${typeBadge(w.automation_type)}`}>{w.automation_type.replace(/_/g, " ")}</Badge>
                          <Badge variant="secondary" className={statusBadge(w.status)}>{w.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Updated {format(new Date(w.updated_at), "MMM d, yyyy")}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Active Alerts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}>{a.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.automation_workflows?.name || "—"} · {format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
};

export default WorkflowDirectory;
