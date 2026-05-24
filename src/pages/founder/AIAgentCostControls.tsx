import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Bot, Pencil, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatGBP } from "@/services/aiUsageLogger";
import {
  CONSERVATIVE_AGENT_DEFAULTS, TIER_ORDER, ensureAgentCostControl,
  getAgentSpend, type AgentSpend, type AgentStatus,
} from "@/services/aiAgentCostService";

type Agent = { id: string; name: string; agent_function: string; status: string };

function statusColor(s: AgentStatus) {
  switch (s) {
    case "healthy": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "watch": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "expensive": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "over_limit": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "paused": return "bg-muted text-muted-foreground border-border";
    case "human_approval_required": return "bg-violet-500/15 text-violet-400 border-violet-500/30";
  }
}

export default function AIAgentCostControls() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);

  const agentsQ = useQuery({
    queryKey: ["cost-control-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents").select("id,name,agent_function,status").order("name");
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });

  const controlsQ = useQuery({
    queryKey: ["agent-cost-controls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agent_cost_controls").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const spendQ = useQuery({
    queryKey: ["agent-spend", agentsQ.data?.map((a) => a.id).join(",")],
    enabled: !!agentsQ.data?.length,
    queryFn: async () => {
      const result: Record<string, AgentSpend> = {};
      await Promise.all((agentsQ.data ?? []).map(async (a) => {
        try { result[a.id] = await getAgentSpend(a.id); } catch {}
      }));
      return result;
    },
  });

  const ensureMutation = useMutation({
    mutationFn: async (agent_id: string) => (await ensureAgentCostControl(agent_id)).row,
    onSuccess: () => {
      toast({ title: "Conservative controls applied" });
      qc.invalidateQueries({ queryKey: ["agent-cost-controls"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await supabase.from("ai_agent_cost_controls").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_agent_cost_controls").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Controls saved" });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["agent-cost-controls"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const controlsByAgent = new Map<string, any>(
    (controlsQ.data ?? []).map((c: any) => [c.agent_id, c]),
  );

  function openEdit(agent_id: string) {
    const existing = controlsByAgent.get(agent_id);
    setEditing(existing ?? { agent_id, ...CONSERVATIVE_AGENT_DEFAULTS });
  }

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> Agent Cost Controls
          </h1>
          <p className="text-sm text-muted-foreground">
            Per-agent model, spend, retry and category limits. Restricted categories always
            require human approval and cannot be bypassed.
          </p>
        </header>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(agentsQ.data ?? []).map((a) => {
            const cfg = controlsByAgent.get(a.id);
            const spend = spendQ.data?.[a.id];
            const dailyCap = cfg?.daily_spend_cap;
            const dailyPct = dailyCap ? ((spend?.spend_today ?? 0) / dailyCap) * 100 : 0;
            return (
              <Card key={a.id} className="tech-card">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="text-xs">{a.agent_function}</span>
                      {!cfg && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                          Not configured
                        </Badge>
                      )}
                      {spend && (
                        <Badge className={statusColor(spend.status)}>
                          {spend.status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {!cfg && (
                    <Button size="sm" variant="outline" onClick={() => ensureMutation.mutate(a.id)}>
                      Apply conservative controls
                    </Button>
                  )}
                  {spend && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Today</span>
                          <span>
                            {formatGBP(spend.spend_today)}
                            {dailyCap != null && <span className="text-muted-foreground"> / {formatGBP(dailyCap)}</span>}
                          </span>
                        </div>
                        <Progress value={Math.min(100, dailyPct)} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div>Week: <span className="text-foreground">{formatGBP(spend.spend_week)}</span></div>
                        <div>Month: <span className="text-foreground">{formatGBP(spend.spend_month)}</span></div>
                        <div>Actions today: <span className="text-foreground">{spend.actions_today}</span></div>
                        <div>Failed: <span className="text-foreground">{spend.failed_actions}</span></div>
                        <div>Retries: <span className="text-foreground">{spend.retry_count}</span></div>
                        <div>Human review: <span className="text-foreground">{spend.human_review_required}</span></div>
                        <div>Avg/action: <span className="text-foreground">{formatGBP(spend.avg_cost_per_action)}</span></div>
                        <div>ROI: <span className="text-foreground">{spend.roi_score != null ? spend.roi_score.toFixed(2) : "—"}</span></div>
                      </div>
                      {cfg && (
                        <div className="text-xs text-muted-foreground border-t border-border pt-2">
                          Tiers: {(cfg.allowed_model_tiers ?? []).join(", ") || "—"} · default {cfg.default_model_tier ?? "—"}
                          {cfg.requires_human_approval && " · human approval"}
                        </div>
                      )}
                      {spend.status_reason && (
                        <div className="text-xs flex items-start gap-2 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 mt-0.5" />
                          {spend.status_reason}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!agentsQ.isLoading && (agentsQ.data ?? []).length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No agents found.</CardContent></Card>
          )}
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit agent cost controls</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Allowed model tiers (comma separated)</Label>
                  <Input
                    value={(editing.allowed_model_tiers ?? []).join(",")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        allowed_model_tiers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder={TIER_ORDER.join(", ")}
                  />
                </div>
                <div>
                  <Label>Default model tier</Label>
                  <Input
                    value={editing.default_model_tier ?? ""}
                    onChange={(e) => setEditing({ ...editing, default_model_tier: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max retries</Label>
                  <Input
                    type="number" value={editing.max_retries ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_retries: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Daily £ cap</Label>
                  <Input
                    type="number" step="0.01" value={editing.daily_spend_cap ?? ""}
                    onChange={(e) => setEditing({ ...editing, daily_spend_cap: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Weekly £ cap</Label>
                  <Input
                    type="number" step="0.01" value={editing.weekly_spend_cap ?? ""}
                    onChange={(e) => setEditing({ ...editing, weekly_spend_cap: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Monthly £ cap</Label>
                  <Input
                    type="number" step="0.01" value={editing.monthly_spend_cap ?? ""}
                    onChange={(e) => setEditing({ ...editing, monthly_spend_cap: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max actions / hour</Label>
                  <Input
                    type="number" value={editing.max_actions_per_hour ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_actions_per_hour: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Allowed task categories (comma; blank = all)</Label>
                  <Input
                    value={(editing.allowed_task_categories ?? []).join(",")}
                    onChange={(e) => {
                      const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setEditing({ ...editing, allowed_task_categories: arr.length ? arr : null });
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Blocked task categories (comma)</Label>
                  <Input
                    value={(editing.blocked_task_categories ?? []).join(",")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        blocked_task_categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editing.requires_human_approval}
                    onCheckedChange={(v) => setEditing({ ...editing, requires_human_approval: v })}
                  />
                  <Label>Requires human approval</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active !== false}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                Save controls
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}