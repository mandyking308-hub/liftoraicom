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
import { ArrowLeft, Plus, Network, Bot, Workflow, FileText, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const classificationColors: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  automatable: "bg-yellow-500/20 text-yellow-400",
  ai_agent: "bg-primary/20 text-primary",
  workflow_automation: "bg-green-500/20 text-green-400",
};

const ProcessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [stepOpen, setStepOpen] = useState(false);
  const [stepForm, setStepForm] = useState({ name: "", description: "", responsible_role: "", classification: "manual" });

  const { data: process, refetch: refetchProcess } = useQuery({
    queryKey: ["process", id],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: steps = [], refetch: refetchSteps } = useQuery({
    queryKey: ["process-steps", id],
    queryFn: async () => {
      const { data } = await supabase.from("process_steps")
        .select("*, ai_agents(name), automation_workflows(name)")
        .eq("process_id", id!)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, name");
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["all-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("id, name");
      return data ?? [];
    },
  });

  const addStep = async () => {
    if (!stepForm.name.trim()) { toast.error("Step name required"); return; }
    const { error } = await supabase.from("process_steps").insert({
      process_id: id!,
      name: stepForm.name.trim(),
      description: stepForm.description.trim(),
      responsible_role: stepForm.responsible_role.trim(),
      classification: stepForm.classification,
      order_index: steps.length,
    });
    if (error) { toast.error("Failed to add step"); return; }
    toast.success("Step added");
    setStepForm({ name: "", description: "", responsible_role: "", classification: "manual" });
    setStepOpen(false);
    refetchSteps();
    updateAutomationStatus();
  };

  const updateStepClassification = async (stepId: string, classification: string) => {
    await supabase.from("process_steps").update({ classification }).eq("id", stepId);
    refetchSteps();
    updateAutomationStatus();
  };

  const assignAgent = async (stepId: string, agentId: string | null) => {
    await supabase.from("process_steps").update({ agent_id: agentId || null }).eq("id", stepId);
    refetchSteps();
  };

  const linkWorkflow = async (stepId: string, workflowId: string | null) => {
    await supabase.from("process_steps").update({ workflow_id: workflowId || null }).eq("id", stepId);
    refetchSteps();
  };

  const deleteStep = async (stepId: string) => {
    await supabase.from("process_steps").delete().eq("id", stepId);
    toast.success("Step removed");
    refetchSteps();
    updateAutomationStatus();
  };

  const updateAutomationStatus = async () => {
    const { data: currentSteps } = await supabase.from("process_steps").select("classification").eq("process_id", id!);
    if (!currentSteps || currentSteps.length === 0) {
      await supabase.from("processes").update({ automation_status: "not_started" }).eq("id", id!);
    } else {
      const automated = currentSteps.filter(s => s.classification !== "manual").length;
      const status = automated === 0 ? "not_started" : automated === currentSteps.length ? "fully_automated" : "partially_automated";
      await supabase.from("processes").update({ automation_status: status }).eq("id", id!);
    }
    refetchProcess();
  };

  const totalSteps = steps.length;
  const manualSteps = steps.filter((s: any) => s.classification === "manual").length;
  const automatedSteps = steps.filter((s: any) => s.classification === "automatable" || s.classification === "workflow_automation").length;
  const agentSteps = steps.filter((s: any) => s.classification === "ai_agent").length;

  if (!process) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder/processes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Processes
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{process.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {process.client_organisation && <span>{process.client_organisation}</span>}
              {process.department && <span>· {process.department}</span>}
            </div>
            {process.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{process.description}</p>}
          </div>
          <Badge variant="secondary" className={classificationColors[process.automation_status] || "bg-muted text-muted-foreground"}>{process.automation_status.replace(/_/g, " ")}</Badge>
        </div>

        {/* Automation Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Steps", value: totalSteps, icon: Network },
            { label: "Manual Steps", value: manualSteps, icon: GripVertical },
            { label: "Automated Steps", value: automatedSteps, icon: Workflow },
            { label: "AI Agent Steps", value: agentSteps, icon: Bot },
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

        {/* Process Flow Visualization */}
        {steps.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Process Flow</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <div className="shrink-0 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium">Start</div>
                {steps.map((step: any, i: number) => (
                  <div key={step.id} className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">→</span>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${classificationColors[step.classification]}`}>
                      {i + 1}. {step.name}
                    </div>
                  </div>
                ))}
                <span className="text-muted-foreground shrink-0">→</span>
                <div className="shrink-0 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium">End</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Process Steps</CardTitle>
              <Dialog open={stepOpen} onOpenChange={setStepOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Step</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Process Step</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Step Name *</Label><Input value={stepForm.name} onChange={e => setStepForm({ ...stepForm, name: e.target.value })} placeholder="e.g. Data Collection" /></div>
                    <div><Label>Description</Label><Textarea value={stepForm.description} onChange={e => setStepForm({ ...stepForm, description: e.target.value })} /></div>
                    <div><Label>Responsible Role</Label><Input value={stepForm.responsible_role} onChange={e => setStepForm({ ...stepForm, responsible_role: e.target.value })} placeholder="e.g. Analyst" /></div>
                    <div>
                      <Label>Classification</Label>
                      <Select value={stepForm.classification} onValueChange={v => setStepForm({ ...stepForm, classification: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Task</SelectItem>
                          <SelectItem value="automatable">Automatable Task</SelectItem>
                          <SelectItem value="ai_agent">AI Agent Task</SelectItem>
                          <SelectItem value="workflow_automation">Workflow Automation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addStep} className="w-full">Add Step</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-muted-foreground text-sm">No steps defined yet.</p>
            ) : (
              <div className="space-y-4">
                {steps.map((step: any, i: number) => (
                  <div key={step.id} className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">Step {i + 1} — {step.name}</p>
                        {step.description && <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>}
                        {step.responsible_role && <p className="text-xs text-muted-foreground mt-1">Role: {step.responsible_role}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteStep(step.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Classification</Label>
                        <Select value={step.classification} onValueChange={v => updateStepClassification(step.id, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual Task</SelectItem>
                            <SelectItem value="automatable">Automatable Task</SelectItem>
                            <SelectItem value="ai_agent">AI Agent Task</SelectItem>
                            <SelectItem value="workflow_automation">Workflow Automation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Assigned Agent</Label>
                        <Select value={step.agent_id || "none"} onValueChange={v => assignAgent(step.id, v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Linked Workflow</Label>
                        <Select value={step.workflow_id || "none"} onValueChange={v => linkWorkflow(step.id, v === "none" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {workflows.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className={classificationColors[step.classification]}>{step.classification.replace(/_/g, " ")}</Badge>
                      {step.ai_agents?.name && <Badge variant="outline" className="text-xs"><Bot size={12} className="mr-1" />{step.ai_agents.name}</Badge>}
                      {step.automation_workflows?.name && <Badge variant="outline" className="text-xs"><Workflow size={12} className="mr-1" />{step.automation_workflows.name}</Badge>}
                    </div>
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

export default ProcessDetail;
