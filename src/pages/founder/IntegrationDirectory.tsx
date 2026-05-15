import FounderLayout from "@/components/founder/FounderLayout";
import CRMInteractionMatchPreviewPanel from "@/components/founder/crm/CRMInteractionMatchPreviewPanel";
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
import { Plus, Search, Plug, CheckCircle2, XCircle, AlertCircle, Clock, Wifi } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import OutboundProviderEnginePanel from "@/components/founder/integrations/OutboundProviderEnginePanel";
import ControlledExternalActionGatesPanel from "@/components/founder/operations/ControlledExternalActionGatesPanel";
import OutboundChannelPolicyPanel from "@/components/founder/integrations/OutboundChannelPolicyPanel";
import BulkSendEngineBlueprint from "@/components/founder/integrations/BulkSendEngineBlueprint";
import SmartleadCampaignMappingPreview from "@/components/founder/integrations/SmartleadCampaignMappingPreview";
import SmartleadCampaignDiscoveryPanel from "@/components/founder/integrations/SmartleadCampaignDiscoveryPanel";
import SmartleadSequenceMappingPreview from "@/components/founder/integrations/SmartleadSequenceMappingPreview";
import { SecurityGovernancePanel } from "@/components/founder/security/SecurityGovernancePanel";

const statusIcon = (s: string) => {
  if (s === "connected") return <CheckCircle2 size={14} className="text-green-400" />;
  if (s === "disconnected") return <XCircle size={14} className="text-destructive" />;
  if (s === "error") return <AlertCircle size={14} className="text-destructive" />;
  if (s === "maintenance") return <Clock size={14} className="text-primary" />;
  return <Clock size={14} className="text-muted-foreground" />;
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    connected: "bg-green-500/20 text-green-400",
    disconnected: "bg-destructive/20 text-destructive",
    error: "bg-destructive/20 text-destructive",
    maintenance: "bg-primary/20 text-primary",
  };
  return m[s] || "bg-muted text-muted-foreground";
};

const typeBadge = (t: string) => {
  const m: Record<string, string> = {
    ai_model: "bg-purple-500/20 text-purple-400",
    data_processing: "bg-blue-500/20 text-blue-400",
    communication: "bg-green-500/20 text-green-400",
    analytics: "bg-primary/20 text-primary",
    storage: "bg-yellow-500/20 text-yellow-400",
  };
  return m[t] || "bg-muted text-muted-foreground";
};

const IntegrationDirectory = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState("ai_model");
  const [authMethod, setAuthMethod] = useState("api_key");
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations-dir"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["integration-alerts-unresolved"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_alerts")
        .select("*, integrations(name)")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("integrations").insert({
        name: form.get("name") as string,
        description: form.get("description") as string,
        endpoint_url: form.get("endpoint_url") as string || null,
        service_type: serviceType,
        auth_method: authMethod,
        status: "disconnected",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations-dir"] });
      setOpen(false);
      toast.success("Integration created.");
    },
    onError: () => toast.error("Failed to create integration."),
  });

  const filtered = integrations.filter((i: any) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = integrations.filter((i: any) => i.status === "connected").length;

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage AI services and API connections</p>
          </div>
        </div>

        <OutboundProviderEnginePanel />
        <SecurityGovernancePanel />
        <CRMInteractionMatchPreviewPanel />
        <BulkSendEngineBlueprint />
        <OutboundChannelPolicyPanel />
        <SmartleadCampaignMappingPreview />
        <SmartleadCampaignDiscoveryPanel />
        <SmartleadSequenceMappingPreview />

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">All integrations</div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Integration</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add Integration</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Service Name *</label>
                  <Input name="name" required placeholder="e.g. AI Language Model Service" className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea name="description" placeholder="Describe the integration..." className="bg-secondary border-border min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Service Type</label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai_model">AI Model</SelectItem>
                      <SelectItem value="data_processing">Data Processing</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Endpoint URL</label>
                  <Input name="endpoint_url" placeholder="https://api.example.com/v1" className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Authentication Method</label>
                  <Select value={authMethod} onValueChange={setAuthMethod}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="bearer_token">Bearer Token</SelectItem>
                      <SelectItem value="basic_auth">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Add Integration"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <Plug size={20} className="text-primary mb-2" />
              <p className="text-2xl font-bold">{integrations.length}</p>
              <p className="text-xs text-muted-foreground">Total Integrations</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <Wifi size={20} className="text-green-400 mb-2" />
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
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
              <CardTitle className="text-lg">Integration Directory</CardTitle>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border h-9 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">No integrations found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((i: any) => (
                  <Link key={i.id} to={`/founder/integrations/${i.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(i.status)}
                          <div>
                            <p className="font-semibold text-sm">{i.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {i.auth_method.replace(/_/g, " ")}
                              {i.description ? ` · ${i.description.slice(0, 50)}${i.description.length > 50 ? "..." : ""}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${typeBadge(i.service_type)}`}>{i.service_type.replace(/_/g, " ")}</Badge>
                          <Badge variant="secondary" className={statusBadge(i.status)}>{i.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {i.last_sync ? `Last sync ${format(new Date(i.last_sync), "MMM d, h:mm a")}` : "Never synced"} · Updated {format(new Date(i.updated_at), "MMM d, yyyy")}
                      </p>
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
                    <p className="text-xs text-muted-foreground mt-1">{(a as any).integrations?.name || "—"} · {format(new Date(a.created_at), "MMM d, h:mm a")}</p>
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

export default IntegrationDirectory;
