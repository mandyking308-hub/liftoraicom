import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, CheckCircle2, XCircle, AlertCircle, Clock, Link2, Globe, Shield } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    connected: "bg-green-500/20 text-green-400",
    disconnected: "bg-destructive/20 text-destructive",
    error: "bg-destructive/20 text-destructive",
    maintenance: "bg-primary/20 text-primary",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const IntegrationDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);
  const [entityType, setEntityType] = useState("agent");

  const { data: integration } = useQuery({
    queryKey: ["integration-detail", id],
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: linkedSystems = [] } = useQuery({
    queryKey: ["integration-linked", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_linked_systems")
        .select("*")
        .eq("integration_id", id!)
        .order("linked_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["integration-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_activity_logs")
        .select("*")
        .eq("integration_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["integration-alerts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_alerts")
        .select("*")
        .eq("integration_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-for-linking"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows-for-linking"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["systems-for-linking"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, system_name").order("system_name");
      return data ?? [];
    },
  });

  const linkSystem = useMutation({
    mutationFn: async (form: FormData) => {
      const entityId = form.get("entity_id") as string;
      let entityName = "";
      if (entityType === "agent") entityName = agents.find((a: any) => a.id === entityId)?.name || "";
      else if (entityType === "workflow") entityName = workflows.find((w: any) => w.id === entityId)?.name || "";
      else entityName = systems.find((s: any) => s.id === entityId)?.system_name || "";

      const { error } = await supabase.from("integration_linked_systems").insert({
        integration_id: id!,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-linked", id] });
      setLinkOpen(false);
      toast.success("System linked.");
    },
    onError: () => toast.error("Failed to link system."),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const newStatus = integration?.status === "connected" ? "disconnected" : "connected";
      const { error } = await supabase.from("integrations").update({ status: newStatus }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-detail", id] });
      toast.success("Status updated.");
    },
  });

  const entityOptions = entityType === "agent" ? agents.map((a: any) => ({ id: a.id, name: a.name }))
    : entityType === "workflow" ? workflows.map((w: any) => ({ id: w.id, name: w.name }))
    : systems.map((s: any) => ({ id: s.id, name: s.system_name }));

  if (!integration) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/integrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Integrations
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{integration.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{integration.service_type.replace(/_/g, " ")} · {integration.auth_method.replace(/_/g, " ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleStatus.mutate()}>
              {integration.status === "connected" ? "Disconnect" : "Connect"}
            </Button>
            <Badge variant="secondary" className={statusBadge(integration.status)}>{integration.status}</Badge>
          </div>
        </div>

        {/* Configuration */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={14} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Endpoint</p>
                </div>
                <p className="font-mono text-xs break-all">{integration.endpoint_url || "Not configured"}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Auth Method</p>
                </div>
                <p>{integration.auth_method.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Sync</p>
                <p>{integration.last_sync ? format(new Date(integration.last_sync), "MMM d, h:mm a") : "Never"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p>{integration.description || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Systems */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Linked Systems</CardTitle>
              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2"><Link2 size={14} /> Link System</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Link System</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); linkSystem.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Entity Type</label>
                      <Select value={entityType} onValueChange={setEntityType}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">AI Agent</SelectItem>
                          <SelectItem value="workflow">Workflow</SelectItem>
                          <SelectItem value="system">Client System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Select {entityType}</label>
                      <select name="entity_id" required className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        {entityOptions.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <Button type="submit" className="w-full" disabled={linkSystem.isPending}>
                      {linkSystem.isPending ? "Linking..." : "Link"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {linkedSystems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No systems linked.</p>
            ) : (
              <div className="space-y-2">
                {linkedSystems.map((ls: any) => (
                  <div key={ls.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Link2 size={14} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium">{ls.entity_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ls.entity_type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(ls.linked_at), "MMM d, yyyy")}</span>
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
                      <p className="text-sm font-medium">{log.event_type.replace(/_/g, " ")}</p>
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

export default IntegrationDetail;
