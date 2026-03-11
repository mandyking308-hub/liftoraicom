import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Layers, Bot, Workflow, Plug, Trash2, ArrowDown, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeColors: Record<string, string> = {
  interface: "bg-primary/20 text-primary",
  agent: "bg-green-500/20 text-green-400",
  workflow: "bg-yellow-500/20 text-yellow-400",
  data_layer: "bg-blue-500/20 text-blue-400",
  integration: "bg-purple-500/20 text-purple-400",
  custom: "bg-muted text-muted-foreground",
};

const ArchitectureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [compOpen, setCompOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", component_type: "custom", description: "" });
  const [relForm, setRelForm] = useState({ source_component_id: "", target_component_id: "", relationship_label: "" });

  const { data: arch } = useQuery({
    queryKey: ["architecture", id],
    queryFn: async () => {
      const { data } = await supabase.from("architectures").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: components = [], refetch: refetchComps } = useQuery({
    queryKey: ["arch-components", id],
    queryFn: async () => {
      const { data } = await supabase.from("architecture_components")
        .select("*, ai_agents(name), automation_workflows(name), integrations(name)")
        .eq("architecture_id", id!)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: relationships = [], refetch: refetchRels } = useQuery({
    queryKey: ["arch-relationships", id],
    queryFn: async () => {
      const { data } = await supabase.from("architecture_relationships")
        .select("*, source:architecture_components!architecture_relationships_source_component_id_fkey(name), target:architecture_components!architecture_relationships_target_component_id_fkey(name)")
        .eq("architecture_id", id!);
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents-arch"],
    queryFn: async () => { const { data } = await supabase.from("ai_agents").select("id, name"); return data ?? []; },
  });
  const { data: workflows = [] } = useQuery({
    queryKey: ["all-workflows-arch"],
    queryFn: async () => { const { data } = await supabase.from("automation_workflows").select("id, name"); return data ?? []; },
  });
  const { data: integrations = [] } = useQuery({
    queryKey: ["all-integrations-arch"],
    queryFn: async () => { const { data } = await supabase.from("integrations").select("id, name"); return data ?? []; },
  });

  const addComponent = async () => {
    if (!compForm.name.trim()) { toast.error("Component name required"); return; }
    const { error } = await supabase.from("architecture_components").insert({
      architecture_id: id!,
      name: compForm.name.trim(),
      component_type: compForm.component_type,
      description: compForm.description.trim(),
      order_index: components.length,
    });
    if (error) { toast.error("Failed to add component"); return; }
    toast.success("Component added");
    setCompForm({ name: "", component_type: "custom", description: "" });
    setCompOpen(false);
    refetchComps();
  };

  const deleteComponent = async (compId: string) => {
    await supabase.from("architecture_components").delete().eq("id", compId);
    toast.success("Component removed");
    refetchComps();
    refetchRels();
  };

  const linkAgent = async (compId: string, agentId: string | null) => {
    await supabase.from("architecture_components").update({ agent_id: agentId || null }).eq("id", compId);
    refetchComps();
  };

  const linkWorkflow = async (compId: string, workflowId: string | null) => {
    await supabase.from("architecture_components").update({ workflow_id: workflowId || null }).eq("id", compId);
    refetchComps();
  };

  const linkIntegration = async (compId: string, integrationId: string | null) => {
    await supabase.from("architecture_components").update({ integration_id: integrationId || null }).eq("id", compId);
    refetchComps();
  };

  const addRelationship = async () => {
    if (!relForm.source_component_id || !relForm.target_component_id) { toast.error("Select both components"); return; }
    if (relForm.source_component_id === relForm.target_component_id) { toast.error("Cannot link a component to itself"); return; }
    const { error } = await supabase.from("architecture_relationships").insert({
      architecture_id: id!,
      source_component_id: relForm.source_component_id,
      target_component_id: relForm.target_component_id,
      relationship_label: relForm.relationship_label.trim(),
    });
    if (error) { toast.error("Failed to add relationship"); return; }
    toast.success("Relationship added");
    setRelForm({ source_component_id: "", target_component_id: "", relationship_label: "" });
    setRelOpen(false);
    refetchRels();
  };

  const deleteRelationship = async (relId: string) => {
    await supabase.from("architecture_relationships").delete().eq("id", relId);
    toast.success("Relationship removed");
    refetchRels();
  };

  const agentComps = components.filter((c: any) => c.agent_id);
  const workflowComps = components.filter((c: any) => c.workflow_id);
  const integrationComps = components.filter((c: any) => c.integration_id);

  if (!arch) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  // Build visual diagram from relationships
  const buildDiagramLayers = () => {
    if (components.length === 0) return [];
    // Simple: show components ordered, with arrows between related ones
    const ordered = [...components].sort((a: any, b: any) => a.order_index - b.order_index);
    return ordered;
  };

  const diagramComponents = buildDiagramLayers();

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/architectures" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Architectures
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{arch.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {arch.client_organisation && <span>{arch.client_organisation}</span>}
              <Badge variant="outline" className="text-xs">{arch.system_type.replace(/_/g, " ")}</Badge>
            </div>
            {arch.system_purpose && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{arch.system_purpose}</p>}
          </div>
          <Badge variant="secondary" className={arch.status === "approved" ? "bg-green-500/20 text-green-400" : arch.status === "in_review" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"}>{arch.status.replace(/_/g, " ")}</Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Components", value: components.length, icon: Layers },
            { label: "AI Agents", value: agentComps.length, icon: Bot },
            { label: "Workflows", value: workflowComps.length, icon: Workflow },
            { label: "Integrations", value: integrationComps.length, icon: Plug },
            { label: "Relationships", value: relationships.length, icon: LinkIcon },
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

        {/* System Diagram */}
        {diagramComponents.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">System Diagram</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-1">
                {diagramComponents.map((comp: any, i: number) => {
                  const hasRelDown = relationships.some((r: any) => r.source_component_id === comp.id);
                  const hasRelUp = relationships.some((r: any) => r.target_component_id === comp.id);
                  return (
                    <div key={comp.id} className="flex flex-col items-center">
                      {i > 0 && (hasRelUp || hasRelDown || true) && (
                        <ArrowDown size={16} className="text-muted-foreground my-1" />
                      )}
                      <div className={`px-6 py-3 rounded-lg text-sm font-medium border ${typeColors[comp.component_type] || typeColors.custom} border-border/50 min-w-[200px] text-center`}>
                        {comp.name}
                        {comp.ai_agents?.name && <span className="block text-xs opacity-70 mt-0.5">{comp.ai_agents.name}</span>}
                        {comp.automation_workflows?.name && <span className="block text-xs opacity-70 mt-0.5">{comp.automation_workflows.name}</span>}
                        {comp.integrations?.name && <span className="block text-xs opacity-70 mt-0.5">{comp.integrations.name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Components */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">System Components</CardTitle>
              <Dialog open={compOpen} onOpenChange={setCompOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Component</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Component Name *</Label><Input value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} placeholder="e.g. Workflow Engine" /></div>
                    <div>
                      <Label>Component Type</Label>
                      <Select value={compForm.component_type} onValueChange={v => setCompForm({ ...compForm, component_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interface">Platform Interface</SelectItem>
                          <SelectItem value="agent">AI Agent</SelectItem>
                          <SelectItem value="workflow">Automation Workflow</SelectItem>
                          <SelectItem value="data_layer">Data Processing Layer</SelectItem>
                          <SelectItem value="integration">External Integration</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea value={compForm.description} onChange={e => setCompForm({ ...compForm, description: e.target.value })} /></div>
                    <Button onClick={addComponent} className="w-full">Add Component</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <p className="text-muted-foreground text-sm">No components defined yet.</p>
            ) : (
              <div className="space-y-4">
                {components.map((comp: any) => (
                  <div key={comp.id} className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={typeColors[comp.component_type] || typeColors.custom}>{comp.component_type.replace(/_/g, " ")}</Badge>
                          <p className="font-medium">{comp.name}</p>
                        </div>
                        {comp.description && <p className="text-sm text-muted-foreground mt-1">{comp.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteComponent(comp.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Linked Agent</Label>
                        <Select value={comp.agent_id || "none"} onValueChange={v => linkAgent(comp.id, v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Linked Workflow</Label>
                        <Select value={comp.workflow_id || "none"} onValueChange={v => linkWorkflow(comp.id, v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {workflows.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Linked Integration</Label>
                        <Select value={comp.integration_id || "none"} onValueChange={v => linkIntegration(comp.id, v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {integrations.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationships */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Component Relationships</CardTitle>
              <Dialog open={relOpen} onOpenChange={setRelOpen}>
                <DialogTrigger asChild><Button size="sm" disabled={components.length < 2}><Plus size={14} className="mr-1" /> Add Relationship</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Relationship</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Source Component</Label>
                      <Select value={relForm.source_component_id} onValueChange={v => setRelForm({ ...relForm, source_component_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{components.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target Component</Label>
                      <Select value={relForm.target_component_id} onValueChange={v => setRelForm({ ...relForm, target_component_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{components.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Label (optional)</Label><Input value={relForm.relationship_label} onChange={e => setRelForm({ ...relForm, relationship_label: e.target.value })} placeholder="e.g. sends data to" /></div>
                    <Button onClick={addRelationship} className="w-full">Add Relationship</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {relationships.length === 0 ? (
              <p className="text-muted-foreground text-sm">No relationships defined yet.</p>
            ) : (
              <div className="space-y-2">
                {relationships.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">{r.source?.name}</Badge>
                      <span className="text-muted-foreground">{r.relationship_label || "→"}</span>
                      <Badge variant="outline" className="text-xs">{r.target?.name}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteRelationship(r.id)}><Trash2 size={14} className="text-destructive" /></Button>
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

export default ArchitectureDetail;
