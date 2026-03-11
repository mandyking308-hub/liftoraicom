import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { LayoutTemplate, Search, Plus, Package, Workflow, Bot } from "lucide-react";
import { format } from "date-fns";

const typeClass = (t: string) => {
  if (t === "platform") return "bg-primary/20 text-primary";
  if (t === "workflow") return "bg-blue-500/20 text-blue-400";
  if (t === "agent") return "bg-purple-500/20 text-purple-400";
  if (t === "automation") return "bg-green-500/20 text-green-400";
  return "bg-muted text-muted-foreground";
};

const TemplateDirectory = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", template_type: "platform", description: "", architecture_id: "" });

  const { data: templates = [], refetch } = useQuery({
    queryKey: ["system-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("system_templates").select("*, architectures(name), template_components(id)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: architectures = [] } = useQuery({
    queryKey: ["architectures-list"],
    queryFn: async () => {
      const { data } = await supabase.from("architectures").select("id, name");
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Template name required"); return; }
    const { error } = await supabase.from("system_templates").insert({
      name: form.name, template_type: form.template_type, description: form.description,
      architecture_id: form.architecture_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Template created");
    setForm({ name: "", template_type: "platform", description: "", architecture_id: "" });
    setDialogOpen(false);
    refetch();
  };

  const filtered = templates.filter((t: any) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.template_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutTemplate size={24} className="text-primary" /> System Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">Reusable templates for rapid system deployment</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> New Template</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.template_type} onValueChange={v => setForm(p => ({ ...p, template_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform Template</SelectItem>
                      <SelectItem value="workflow">Workflow Template</SelectItem>
                      <SelectItem value="agent">AI Agent Configuration</SelectItem>
                      <SelectItem value="automation">Automation System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div>
                  <Label>Based on Architecture (optional)</Label>
                  <Select value={form.architecture_id} onValueChange={v => setForm(p => ({ ...p, architecture_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {architectures.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Templates", value: templates.length, icon: LayoutTemplate },
            { label: "Platform", value: templates.filter((t: any) => t.template_type === "platform").length, icon: Package },
            { label: "Workflow", value: templates.filter((t: any) => t.template_type === "workflow").length, icon: Workflow },
            { label: "Agent", value: templates.filter((t: any) => t.template_type === "agent").length, icon: Bot },
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

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="workflow">Workflow</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="automation">Automation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Directory */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="bg-card border-border/50"><CardContent className="p-6 text-muted-foreground text-sm">No templates found.</CardContent></Card>
          ) : filtered.map((t: any) => (
            <Link key={t.id} to={`/founder/templates/${t.id}`}>
              <Card className="bg-card border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">{t.name}</p>
                        <Badge variant="secondary" className={`text-xs ${typeClass(t.template_type)}`}>{t.template_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{t.description || "—"}</p>
                      {(t.architectures as any)?.name && <p className="text-xs text-muted-foreground mt-1">Based on: {(t.architectures as any).name}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      <p>{t.template_components?.length || 0} components</p>
                      <p>{t.usage_count} uses</p>
                      <p>{format(new Date(t.updated_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </FounderLayout>
  );
};

export default TemplateDirectory;
