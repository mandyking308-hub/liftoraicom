import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Rocket, ArrowLeft, Building2, LayoutTemplate, CheckCircle2, Activity,
  Bot, Workflow, Plug, Layers,
} from "lucide-react";

const statusClass = (s: string) => {
  if (s === "active") return "bg-green-500/20 text-green-400";
  if (s === "pending") return "bg-yellow-500/20 text-yellow-400";
  if (s === "configuring") return "bg-blue-500/20 text-blue-400";
  return "bg-muted text-muted-foreground";
};

const PlatformLaunchDetail = () => {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: platform } = useQuery({
    queryKey: ["launched-platform", id],
    queryFn: async () => {
      const { data } = await supabase.from("launched_platforms").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["launch-checklist", id],
    queryFn: async () => {
      const { data } = await supabase.from("launch_checklist").select("*").eq("platform_id", id!).order("order_index");
      return data ?? [];
    },
    enabled: !!id,
  });

  // Fetch template components if template linked
  const { data: templateComponents = [] } = useQuery({
    queryKey: ["template-components-preview", platform?.template_id],
    queryFn: async () => {
      const { data } = await supabase.from("template_components").select("*").eq("template_id", platform!.template_id!).order("order_index");
      return data ?? [];
    },
    enabled: !!platform?.template_id,
  });

  const toggleChecklist = async (itemId: string, completed: boolean) => {
    await supabase.from("launch_checklist").update({
      completed: !completed,
      completed_at: !completed ? new Date().toISOString() : null,
    }).eq("id", itemId);
    qc.invalidateQueries({ queryKey: ["launch-checklist", id] });
  };

  const handleActivate = async () => {
    const allDone = checklist.every((c: any) => c.completed);
    if (!allDone) { toast.error("Complete all checklist items before activation"); return; }
    await supabase.from("launched_platforms").update({
      status: "active", launched_at: new Date().toISOString(),
    }).eq("id", id!);
    toast.success("Platform activated!");
    qc.invalidateQueries({ queryKey: ["launched-platform", id] });
  };

  const allComplete = checklist.length > 0 && checklist.every((c: any) => c.completed);
  const workflows = templateComponents.filter((c: any) => c.component_type === "workflow");
  const agents = templateComponents.filter((c: any) => c.component_type === "agent");
  const integrations = templateComponents.filter((c: any) => c.component_type === "integration");
  const interfaces = templateComponents.filter((c: any) => !["workflow", "agent", "integration"].includes(c.component_type));

  if (!platform) return <FounderLayout><p className="text-muted-foreground">Loading...</p></FounderLayout>;

  return (
    <FounderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/founder/expansion"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket size={24} className="text-primary" /> {platform.name}</h1>
            <p className="text-muted-foreground text-sm">{platform.platform_purpose || "No description"}</p>
          </div>
          <Badge variant="secondary" className={statusClass(platform.status)}>{platform.status}</Badge>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <Building2 size={16} className="text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Organisation</p>
              <p className="font-medium text-sm">{platform.organisation_name || "—"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <Activity size={16} className="text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Industry</p>
              <p className="font-medium text-sm">{platform.industry || "—"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <LayoutTemplate size={16} className="text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="font-medium text-sm">{platform.template_name || "None"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <CheckCircle2 size={16} className="text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Launched</p>
              <p className="font-medium text-sm">{platform.launched_at ? format(new Date(platform.launched_at), "MMM d, yyyy") : "Not yet"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Components from template */}
        {templateComponents.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Platform Components (from template)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Layers size={14} /> Interfaces ({interfaces.length})</p>
                  {interfaces.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : interfaces.map((c: any) => (
                    <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                  ))}
                  <p className="text-sm font-medium mt-3 mb-2 flex items-center gap-1"><Workflow size={14} /> Workflows ({workflows.length})</p>
                  {workflows.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : workflows.map((c: any) => (
                    <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Bot size={14} /> AI Agents ({agents.length})</p>
                  {agents.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : agents.map((c: any) => (
                    <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                  ))}
                  <p className="text-sm font-medium mt-3 mb-2 flex items-center gap-1"><Plug size={14} /> Integrations ({integrations.length})</p>
                  {integrations.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : integrations.map((c: any) => (
                    <p key={c.id} className="text-xs text-muted-foreground">• {c.name}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch Checklist */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Launch Readiness Checklist</CardTitle>
              <span className="text-xs text-muted-foreground">{checklist.filter((c: any) => c.completed).length}/{checklist.length} complete</span>
            </div>
          </CardHeader>
          <CardContent>
            {checklist.length === 0 ? (
              <p className="text-muted-foreground text-sm">No checklist items.</p>
            ) : (
              <div className="space-y-3">
                {checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklist(item.id, item.completed)}
                      disabled={platform.status === "active"}
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.item}</p>
                      {item.completed_at && <p className="text-xs text-muted-foreground">Completed {format(new Date(item.completed_at), "MMM d, yyyy HH:mm")}</p>}
                    </div>
                    {item.completed ? <CheckCircle2 size={16} className="text-green-400" /> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activate */}
        {platform.status !== "active" && (
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Platform Activation</p>
                  <p className="text-sm text-muted-foreground">
                    {allComplete ? "All checklist items complete. Ready to activate." : "Complete all checklist items to activate this platform."}
                  </p>
                </div>
                <Button onClick={handleActivate} disabled={!allComplete}>
                  <Rocket size={16} className="mr-2" /> Activate Platform
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
};

export default PlatformLaunchDetail;
