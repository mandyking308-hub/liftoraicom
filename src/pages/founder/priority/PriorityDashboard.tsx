import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import CRMCustomerLifecyclePanel from "@/components/founder/crm/CRMCustomerLifecyclePanel";
import AIAgentOrchestratorPanel from "@/components/founder/agents/AIAgentOrchestratorPanel";
import FounderApprovalConsole from "@/components/founder/approvals/FounderApprovalConsole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, ListChecks, AlertTriangle, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Score = {
  id: string; entity_type: string; entity_id: string; business_name: string;
  score: number; priority_level: "low"|"medium"|"high"|"critical";
  factors: Record<string, unknown>; last_updated: string;
};
type Task = {
  id: string; entity_type: string; entity_id: string; business_name: string;
  task_type: "follow_up"|"review"|"escalate"; priority_score: number;
  reason: string; status: string; created_at: string;
};

const LEVEL_VARIANT: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
  low: "outline", medium: "secondary", high: "default", critical: "destructive",
};

const PriorityDashboard = () => {
  const qc = useQueryClient();

  const { data: scores = [] } = useQuery({
    queryKey: ["priority_scores_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("priority_scores" as never)
        .select("id, entity_type, entity_id, business_name, score, priority_level, factors, last_updated")
        .order("score", { ascending: false }).limit(200);
      if (error) throw error;
      return (data as unknown as Score[]) ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["system_tasks_open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_tasks" as never)
        .select("id, entity_type, entity_id, business_name, task_type, priority_score, reason, status, created_at")
        .eq("status", "pending")
        .order("priority_score", { ascending: false }).limit(100);
      if (error) throw error;
      return (data as unknown as Task[]) ?? [];
    },
  });

  const filterBy = (t: string) => scores.filter((s) => s.entity_type === t).slice(0, 10);
  const topDeals = filterBy("deal");
  const topContacts = filterBy("contact");
  const topAssignments = filterBy("assignment");
  const topConvs = filterBy("conversation");

  async function completeTask(id: string) {
    const { error } = await supabase
      .from("system_tasks" as never)
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task completed");
    qc.invalidateQueries({ queryKey: ["system_tasks_open"] });
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Priority Engine</h1>
          <p className="text-muted-foreground mt-1">
            Rules-based scoring across leads, conversations, deals, and assignments. Real-time, transparent, non-blocking.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Flame className="h-5 w-5 text-destructive" />} label="Critical" value={scores.filter(s => s.priority_level === "critical").length} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="High priority" value={scores.filter(s => s.priority_level === "high").length} />
          <StatCard icon={<ListChecks className="h-5 w-5" />} label="Open tasks" value={tasks.length} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Scored entities" value={scores.length} />
        </div>

        <Tabs defaultValue="deals">
          <TabsList>
            <TabsTrigger value="deals">Top Deals</TabsTrigger>
            <TabsTrigger value="contacts">Top Contacts</TabsTrigger>
            <TabsTrigger value="assignments">At-Risk Assignments</TabsTrigger>
            <TabsTrigger value="conversations">Hot Conversations</TabsTrigger>
            <TabsTrigger value="tasks">System Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="deals"><ScoreTable rows={topDeals} /></TabsContent>
          <TabsContent value="contacts"><ScoreTable rows={topContacts} /></TabsContent>
          <TabsContent value="assignments"><ScoreTable rows={topAssignments} /></TabsContent>
          <TabsContent value="conversations"><ScoreTable rows={topConvs} /></TabsContent>
          <TabsContent value="tasks">
            <Card><CardContent className="pt-6">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open system tasks.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead><TableHead>Entity</TableHead>
                    <TableHead>Business</TableHead><TableHead>Score</TableHead>
                    <TableHead>Reason</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell><Badge variant={t.task_type === "escalate" ? "destructive" : "default"}>{t.task_type}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.entity_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.business_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{t.priority_score}</Badge></TableCell>
                        <TableCell className="text-xs">{t.reason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM HH:mm")}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => completeTask(t.id)}>Complete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
        <CRMCustomerLifecyclePanel />
        <AIAgentOrchestratorPanel />
        <FounderApprovalConsole />
      </div>
    </FounderLayout>
  );
};

const ScoreTable = ({ rows }: { rows: Score[] }) => (
  <Card><CardContent className="pt-6">
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">No entities scored yet.</p>
    ) : (
      <Table>
        <TableHeader><TableRow>
          <TableHead>Score</TableHead><TableHead>Level</TableHead>
          <TableHead>Business</TableHead><TableHead>Entity ID</TableHead>
          <TableHead>Factors</TableHead><TableHead>Updated</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => {
            const f = r.factors as Record<string, number | string | boolean>;
            return (
              <TableRow key={r.id}>
                <TableCell><Badge variant={LEVEL_VARIANT[r.priority_level]}>{r.score}</Badge></TableCell>
                <TableCell><Badge variant={LEVEL_VARIANT[r.priority_level]}>{r.priority_level}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.business_name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  R:{f.revenue} · P:{f.probability} · U:{f.urgency} · E:{f.engagement} · −Risk:{f.risk}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(r.last_updated), "dd MMM HH:mm")}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )}
  </CardContent></Card>
);

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card><CardContent className="pt-6 flex items-center gap-3">
    <div className="text-muted-foreground">{icon}</div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </CardContent></Card>
);

export default PriorityDashboard;
