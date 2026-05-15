import FounderLayout from "@/components/founder/FounderLayout";
import BusinessActivationWizardPanel from "@/components/founder/activation/BusinessActivationWizardPanel";
import BusinessRehearsalSimulationPanel from "@/components/founder/activation/BusinessRehearsalSimulationPanel";
import BusinessCapabilityMatrixPanel from "@/components/founder/operations/BusinessCapabilityMatrixPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Rocket, Search, Plus, LayoutTemplate, Building2, Activity, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import MultiBusinessOperatingLayerPanel from "@/components/founder/operations/MultiBusinessOperatingLayerPanel";
import BusinessKnowledgeBrainPanel from "@/components/founder/knowledge/BusinessKnowledgeBrainPanel";
import PortfolioCommandCentrePanel from "@/components/founder/command/PortfolioCommandCentrePanel";
import BusinessLaunchFactoryPanel from "@/components/founder/expansion/BusinessLaunchFactoryPanel";

const statusClass = (s: string) => {
  if (s === "active") return "bg-green-500/20 text-green-400";
  if (s === "pending") return "bg-yellow-500/20 text-yellow-400";
  if (s === "configuring") return "bg-blue-500/20 text-blue-400";
  return "bg-muted text-muted-foreground";
};

const DEFAULT_CHECKLIST = [
  "Template Applied",
  "Workflows Configured",
  "AI Agents Assigned",
  "User Access Configured",
  "Monitoring Enabled",
];

const PlatformExpansion = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", organisation_name: "", industry: "", platform_purpose: "", template_id: "",
  });

  const { data: platforms = [], refetch } = useQuery({
    queryKey: ["launched-platforms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("launched_platforms")
        .select("*, launch_checklist(id, completed)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["system-templates-list"],
    queryFn: async () => {
      const { data } = await supabase.from("system_templates").select("id, name").order("name");
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Platform name required"); return; }
    const selectedTemplate = templates.find((t: any) => t.id === form.template_id);
    const { data, error } = await supabase.from("launched_platforms").insert({
      name: form.name,
      organisation_name: form.organisation_name,
      industry: form.industry,
      platform_purpose: form.platform_purpose,
      template_id: form.template_id || null,
      template_name: selectedTemplate?.name || "",
      status: "configuring",
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    // Create default checklist
    if (data?.id) {
      await supabase.from("launch_checklist").insert(
        DEFAULT_CHECKLIST.map((item, i) => ({
          platform_id: data.id, item, order_index: i,
          completed: i === 0 && !!form.template_id,
          completed_at: i === 0 && form.template_id ? new Date().toISOString() : null,
        }))
      );
    }
    toast.success("Platform created");
    setForm({ name: "", organisation_name: "", industry: "", platform_purpose: "", template_id: "" });
    setDialogOpen(false);
    refetch();
  };

  const active = platforms.filter((p: any) => p.status === "active");
  const pending = platforms.filter((p: any) => p.status !== "active");
  const filtered = platforms.filter((p: any) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.organisation_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FounderLayout>
      <div className="space-y-6">
        <BusinessActivationWizardPanel />
        <BusinessRehearsalSimulationPanel />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket size={24} className="text-primary" /> Platform Expansion</h1>
            <p className="text-muted-foreground text-sm mt-1">Launch new ventures and operational systems</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> Launch Platform</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Platform</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Platform Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="AI Investment Platform" /></div>
                <div><Label>Organisation Name</Label><Input value={form.organisation_name} onChange={e => setForm(p => ({ ...p, organisation_name: e.target.value }))} placeholder="Stone Crown Capital" /></div>
                <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Financial Services" /></div>
                <div><Label>Platform Purpose</Label><Textarea value={form.platform_purpose} onChange={e => setForm(p => ({ ...p, platform_purpose: e.target.value }))} placeholder="Describe the purpose of this platform..." /></div>
                <div>
                  <Label>Template (optional)</Label>
                  <Select value={form.template_id} onValueChange={v => setForm(p => ({ ...p, template_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Create & Configure</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <MultiBusinessOperatingLayerPanel />
        <BusinessKnowledgeBrainPanel />
        <PortfolioCommandCentrePanel />
        <BusinessLaunchFactoryPanel />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Platforms", value: platforms.length, icon: Rocket },
            { label: "Active", value: active.length, icon: CheckCircle2 },
            { label: "Pending / Configuring", value: pending.length, icon: Clock },
            { label: "Templates Available", value: templates.length, icon: LayoutTemplate },
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

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search platforms..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>

        {/* Directory */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="bg-card border-border/50"><CardContent className="p-6 text-muted-foreground text-sm">No platforms found. Launch your first platform above.</CardContent></Card>
          ) : filtered.map((p: any) => {
            const checklist = p.launch_checklist || [];
            const done = checklist.filter((c: any) => c.completed).length;
            const total = checklist.length;
            return (
              <Link key={p.id} to={`/founder/expansion/${p.id}`}>
                <Card className="bg-card border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium">{p.name}</p>
                          <Badge variant="secondary" className={`text-xs ${statusClass(p.status)}`}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {p.organisation_name && <span className="flex items-center gap-1"><Building2 size={12} /> {p.organisation_name}</span>}
                          {p.template_name && <span className="flex items-center gap-1"><LayoutTemplate size={12} /> {p.template_name}</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground hidden sm:block">
                        <p>Checklist: {done}/{total}</p>
                        <p>{p.launched_at ? `Launched ${format(new Date(p.launched_at), "MMM d, yyyy")}` : format(new Date(p.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <BusinessCapabilityMatrixPanel />
      </div>
    </FounderLayout>
  );
};

export default PlatformExpansion;
