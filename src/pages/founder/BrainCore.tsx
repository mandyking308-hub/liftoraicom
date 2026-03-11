import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Activity, Zap, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, BarChart3, Bot, Workflow, Globe, Building2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BrainCore = () => {
  const [insightOpen, setInsightOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);

  // Platform signal queries
  const { data: workflows } = useQuery({
    queryKey: ["brain-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("id, status, success_count, failure_count");
      return data || [];
    },
  });

  const { data: agents } = useQuery({
    queryKey: ["brain-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, status, tasks_completed_total, tasks_pending");
      return data || [];
    },
  });

  const { data: systems } = useQuery({
    queryKey: ["brain-systems"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, status");
      return data || [];
    },
  });

  const { data: organisations } = useQuery({
    queryKey: ["brain-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("id");
      return data || [];
    },
  });

  const { data: insights, refetch: refetchInsights } = useQuery({
    queryKey: ["brain-insights"],
    queryFn: async () => {
      const { data } = await supabase.from("brain_insights").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: learnings, refetch: refetchLearnings } = useQuery({
    queryKey: ["brain-learnings"],
    queryFn: async () => {
      const { data } = await supabase.from("brain_learning_records").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: recommendations, refetch: refetchRecs } = useQuery({
    queryKey: ["brain-recommendations"],
    queryFn: async () => {
      const { data } = await supabase.from("brain_recommendations").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Computed metrics
  const totalWorkflows = workflows?.length || 0;
  const activeWorkflows = workflows?.filter((w) => w.status === "active").length || 0;
  const totalSuccess = workflows?.reduce((a, w) => a + (w.success_count || 0), 0) || 0;
  const totalFailure = workflows?.reduce((a, w) => a + (w.failure_count || 0), 0) || 0;
  const automationScore = totalSuccess + totalFailure > 0 ? Math.round((totalSuccess / (totalSuccess + totalFailure)) * 100) : 100;

  const totalAgents = agents?.length || 0;
  const activeAgents = agents?.filter((a) => a.status === "active").length || 0;
  const agentEfficiency = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;

  const operationalSystems = systems?.filter((s) => s.status === "operational").length || 0;
  const totalSystems = systems?.length || 0;
  const systemHealth = totalSystems > 0 ? Math.round((operationalSystems / totalSystems) * 100) : 100;

  const platformScore = Math.round((automationScore + agentEfficiency + systemHealth) / 3);

  const priorityColor = (p: string) => {
    if (p === "critical") return "destructive";
    if (p === "high") return "default";
    return "secondary";
  };

  const handleAddInsight = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("brain_insights").insert({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      insight_type: fd.get("insight_type") as string,
      system_affected: fd.get("system_affected") as string,
      priority: fd.get("priority") as string,
    });
    if (error) { toast.error("Failed to add insight"); return; }
    toast.success("Insight added");
    setInsightOpen(false);
    refetchInsights();
  };

  const handleAddLearning = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("brain_learning_records").insert({
      pattern_description: fd.get("pattern_description") as string,
      source_system: fd.get("source_system") as string,
      confidence_level: fd.get("confidence_level") as string,
      category: fd.get("category") as string,
    });
    if (error) { toast.error("Failed to add learning"); return; }
    toast.success("Learning recorded");
    setLearningOpen(false);
    refetchLearnings();
  };

  const handleAddRecommendation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("brain_recommendations").insert({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      affected_system: fd.get("affected_system") as string,
      priority: fd.get("priority") as string,
    });
    if (error) { toast.error("Failed to add recommendation"); return; }
    toast.success("Recommendation added");
    setRecOpen(false);
    refetchRecs();
  };

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="text-primary" size={32} />
            AI Brain Core
          </h1>
          <p className="text-muted-foreground mt-1">Central intelligence layer — platform analysis & strategic insights</p>
        </div>

        {/* Platform Intelligence Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Platform Intelligence</p>
                  <p className="text-3xl font-bold">{platformScore}%</p>
                </div>
                <Brain className="text-primary" size={28} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <p className="text-3xl font-bold">{systemHealth}%</p>
                </div>
                <Activity className="text-emerald-500" size={28} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Automation Score</p>
                  <p className="text-3xl font-bold">{automationScore}%</p>
                </div>
                <Zap className="text-amber-500" size={28} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent Efficiency</p>
                  <p className="text-3xl font-bold">{agentEfficiency}%</p>
                </div>
                <Bot className="text-primary" size={28} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Observation Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe size={20} /> Platform Observation Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Workflow size={20} className="mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{activeWorkflows}/{totalWorkflows}</p>
                <p className="text-xs text-muted-foreground">Active Workflows</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Bot size={20} className="mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{activeAgents}/{totalAgents}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Activity size={20} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{operationalSystems}/{totalSystems}</p>
                <p className="text-xs text-muted-foreground">Operational Systems</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Building2 size={20} className="mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{organisations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Organisations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="insights">
          <TabsList>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="learnings">Learning Records</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          {/* Insights */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Intelligence Insights</h3>
              <Dialog open={insightOpen} onOpenChange={setInsightOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Lightbulb size={16} className="mr-2" /> Add Insight</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Insight</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddInsight} className="space-y-4">
                    <Input name="title" placeholder="Insight title" required />
                    <Textarea name="description" placeholder="Description" />
                    <Select name="insight_type" defaultValue="performance">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="bottleneck">Bottleneck</SelectItem>
                        <SelectItem value="anomaly">Anomaly</SelectItem>
                        <SelectItem value="opportunity">Opportunity</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input name="system_affected" placeholder="System affected" />
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" className="w-full">Save Insight</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {insights?.length === 0 && <p className="text-muted-foreground text-sm">No insights recorded yet.</p>}
            <div className="space-y-3">
              {insights?.map((i) => (
                <Card key={i.id}>
                  <CardContent className="pt-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{i.title}</p>
                        <Badge variant={priorityColor(i.priority)}>{i.priority}</Badge>
                        <Badge variant="outline">{i.insight_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{i.description}</p>
                      {i.system_affected && <p className="text-xs text-muted-foreground mt-1">System: {i.system_affected}</p>}
                    </div>
                    <Badge variant="secondary">{i.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Learnings */}
          <TabsContent value="learnings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AI Learning Records</h3>
              <Dialog open={learningOpen} onOpenChange={setLearningOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><CheckCircle2 size={16} className="mr-2" /> Record Learning</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Learning Pattern</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddLearning} className="space-y-4">
                    <Textarea name="pattern_description" placeholder="Pattern description" required />
                    <Input name="source_system" placeholder="Source system" />
                    <Select name="confidence_level" defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select name="category" defaultValue="automation">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automation">Automation</SelectItem>
                        <SelectItem value="workflow">Workflow</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="deployment">Deployment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" className="w-full">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {learnings?.length === 0 && <p className="text-muted-foreground text-sm">No learning records yet.</p>}
            <div className="space-y-3">
              {learnings?.map((l) => (
                <Card key={l.id}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{l.pattern_description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{l.category}</Badge>
                      <Badge variant="secondary">Confidence: {l.confidence_level}</Badge>
                      {l.source_system && <Badge variant="secondary">{l.source_system}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Improvement Recommendations</h3>
              <Dialog open={recOpen} onOpenChange={setRecOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><TrendingUp size={16} className="mr-2" /> Add Recommendation</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Recommendation</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddRecommendation} className="space-y-4">
                    <Input name="title" placeholder="Recommendation title" required />
                    <Textarea name="description" placeholder="Description" />
                    <Input name="affected_system" placeholder="Affected system" />
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" className="w-full">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {recommendations?.length === 0 && <p className="text-muted-foreground text-sm">No recommendations yet.</p>}
            <div className="space-y-3">
              {recommendations?.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{r.title}</p>
                        <Badge variant={priorityColor(r.priority)}>{r.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                      {r.affected_system && <p className="text-xs text-muted-foreground mt-1">System: {r.affected_system}</p>}
                    </div>
                    <Badge variant="secondary">{r.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Strategy */}
          <TabsContent value="strategy" className="space-y-4">
            <h3 className="text-lg font-semibold">Strategic Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Cross-Organisation Patterns</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Total Organisations</span>
                      <span className="font-bold">{organisations?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Active Systems</span>
                      <span className="font-bold">{operationalSystems}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Running Automations</span>
                      <span className="font-bold">{activeWorkflows}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Platform Health Indicators</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Automation Reliability</span>
                      <span className="font-bold">{automationScore}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Agent Efficiency</span>
                      <span className="font-bold">{agentEfficiency}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Workflow Stability</span>
                      <span className="font-bold">{systemHealth}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default BrainCore;
