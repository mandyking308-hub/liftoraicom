import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  LayoutTemplate, ArrowLeft, Plus, Package, Workflow, Bot, Plug, Layers,
  Trash2,
} from "lucide-react";

const compTypeIcon = (t: string) => {
  if (t === "workflow") return <Workflow size={16} className="text-blue-400" />;
  if (t === "agent") return <Bot size={16} className="text-purple-400" />;
  if (t === "integration") return <Plug size={16} className="text-green-400" />;
  if (t === "interface") return <Layers size={16} className="text-primary" />;
  return <Package size={16} className="text-muted-foreground" />;
};

const typeClass = (t: string) => {
  if (t === "platform") return "bg-primary/20 text-primary";
  if (t === "workflow") return "bg-blue-500/20 text-blue-400";
  if (t === "agent") return "bg-purple-500/20 text-purple-400";
  if (t === "automation") return "bg-green-500/20 text-green-400";
  return "bg-muted text-muted-foreground";
};

const TemplateDetail = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [compDialog, setCompDialog] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", component_type: "custom", description: "" });

  const { data: template } = useQuery({
    queryKey: ["system-template", id],
    queryFn: async () => {
      const { data } = await supabase.from("system_templates").select("*, architectures(name, system_type)").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: components = [] } = useQuery({
    queryKey: ["template-components", id],
    queryFn: async () => {
      const { data } = await supabase.from("template_components").select("*, automation_workflows(name), ai_agents(name)").eq("template_id", id!).order("order_index");
      return data ?? [];
    },
    enabled: !!id,
  });

  const handleAddComponent = async () => {
    if (!compForm.name.trim()) { toast.error("Component name required"); return; }
    const { error } = await supabase.from("template_components").insert({
      template_id: id!, name: compForm.name, component_type: compForm.component_type,
      description: compForm.description, order_index: components.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Component added");
    setCompForm({ name: "", component_type: "custom", description: "" });
    setCompDialog(false);
    qc.invalidateQueries({ queryKey: ["template-components", id] });
  };

  const handleDeleteComponent = async (compId: string) => {
    await supabase.from("template_components").delete().eq("id", compId);
    toast.success("Component removed");
    qc.invalidateQueries({ queryKey: ["template-components", id] });
  };

  const workflows = components.filter((c: any) => c.component_type === "workflow");
  const agents = components.filter((c: any) => c.component_type === "agent");
  const other = components.filter((c: any) => !["workflow", "agent"].includes(c.component_type));

  if (!template) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/founder/templates"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutTemplate size={24} className="text-primary" /> {template.name}</h1>
            <p className="text-muted-foreground text-sm">{template.description || "No description"}</p>
          </div>
          <Badge variant="secondary" className={typeClass(template.template_type)}>{template.template_type}</Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Components", value: components.length },
            { label: "Workflows", value: workflows.length },
            { label: "Agents", value: agents.length },
            { label: "Usage Count", value: template.usage_count },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Architecture link */}
        {(template.architectures as any)?.name && (
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Layers size={18} className="text-primary" />
              <div>
                <p className="text-sm font-medium">Based on Architecture: {(template.architectures as any).name}</p>
                <p className="text-xs text-muted-foreground">{(template.architectures as any).system_type}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Components */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Template Components</CardTitle>
              <Dialog open={compDialog} onOpenChange={setCompDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Component</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name *</Label><Input value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={compForm.component_type} onValueChange={v => setCompForm(p => ({ ...p, component_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interface">Platform Interface</SelectItem>
                          <SelectItem value="workflow">Automation Workflow</SelectItem>
                          <SelectItem value="agent">AI Agent</SelectItem>
                          <SelectItem value="integration">Integration Layer</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <Button onClick={handleAddComponent} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <p className="text-muted-foreground text-sm">No components. Add components to define this template.</p>
            ) : (
              <div className="space-y-2">
                {components.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {compTypeIcon(c.component_type)}
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.description || c.component_type}</p>
                          {c.automation_workflows?.name && <p className="text-xs text-muted-foreground">Workflow: {c.automation_workflows.name}</p>}
                          {c.ai_agents?.name && <p className="text-xs text-muted-foreground">Agent: {c.ai_agents.name}</p>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteComponent(c.id)}><Trash2 size={14} className="text-muted-foreground" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Preview Summary */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Template Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Purpose</p>
                <p className="text-sm text-muted-foreground">{template.description || "Not defined"}</p>
                <p className="text-sm font-medium mt-4 mb-2">Type</p>
                <Badge variant="secondary" className={typeClass(template.template_type)}>{template.template_type}</Badge>
                <p className="text-sm font-medium mt-4 mb-1">Last Updated</p>
                <p className="text-sm text-muted-foreground">{format(new Date(template.updated_at), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Included Components ({other.length})</p>
                {other.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : other.map((c: any) => (
                  <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                ))}
                <p className="text-sm font-medium mt-3 mb-2">Workflows ({workflows.length})</p>
                {workflows.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : workflows.map((c: any) => (
                  <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                ))}
                <p className="text-sm font-medium mt-3 mb-2">AI Agents ({agents.length})</p>
                {agents.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : agents.map((c: any) => (
                  <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default TemplateDetail;
