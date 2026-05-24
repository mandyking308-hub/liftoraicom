import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Bot, FileText, Layers, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGBP } from "@/services/aiUsageLogger";
import AIQualityFeedbackDialog from "@/components/founder/ai/AIQualityFeedbackDialog";
import {
  rollupByAgent, rollupByTemplate, rollupByModelTier, generateRecommendations,
  type QualityRollup, type ModelTierRollup, type QualityRecommendation,
} from "@/services/aiQualityScores";

function QualityBadge({ avg }: { avg: number | null }) {
  if (avg == null) return <Badge variant="outline">no feedback</Badge>;
  const cls = avg >= 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : avg >= 3 ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
    : avg >= 2 ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";
  return <Badge variant="outline" className={cls}>{avg.toFixed(2)} / 5</Badge>;
}

function sevColor(s: QualityRecommendation["severity"]) {
  return s === "high" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "warning" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-sky-500/15 text-sky-400 border-sky-500/30";
}

export default function AIQualityScoring() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeLedgerId, setActiveLedgerId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");

  const { data: pendingRows = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ["ai-quality", "pending-feedback"],
    queryFn: async () => {
      // Recent ledger rows without a quality_feedback record yet.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ledger, error } = await supabase
        .from("ai_usage_ledger")
        .select("id,task_category,agent_id,model_tier,estimated_cost,created_at,output_summary,action_type,status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (ledger ?? []).map((l) => l.id);
      if (ids.length === 0) return [];
      const { data: scores } = await supabase
        .from("ai_quality_scores")
        .select("ai_usage_ledger_id")
        .in("ai_usage_ledger_id", ids);
      const rated = new Set((scores ?? []).map((s: any) => s.ai_usage_ledger_id));
      return (ledger ?? []).filter((l) => !rated.has(l.id));
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["ai-quality", "agents"],
    queryFn: () => rollupByAgent(),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["ai-quality", "templates"],
    queryFn: () => rollupByTemplate(),
  });
  const { data: tiers = [] } = useQuery({
    queryKey: ["ai-quality", "tiers"],
    queryFn: () => rollupByModelTier(),
  });
  const { data: recs = [] } = useQuery({
    queryKey: ["ai-quality", "recommendations"],
    queryFn: () => generateRecommendations(),
  });

  const { data: templateNames = {} } = useQuery({
    queryKey: ["ai-quality", "template-names", templates.map((t) => t.key).join(",")],
    enabled: templates.length > 0,
    queryFn: async () => {
      const ids = templates.map((t) => t.key).filter((k): k is string => !!k);
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("ai_prompt_templates")
        .select("id,name")
        .in("id", ids);
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[(r as any).id] = (r as any).name;
      return m;
    },
  });

  const openFeedback = (id: string, title: string) => {
    setActiveLedgerId(id);
    setActiveTitle(title);
    setFeedbackOpen(true);
  };

  const totals = useMemo(() => {
    const all = agents;
    const count = all.reduce((s, a) => s + a.count, 0);
    const rejected = all.reduce((s, a) => s + a.rejected_count, 0);
    const approved = all.reduce((s, a) => s + a.approved_count + a.edited_count, 0);
    const spend = all.reduce((s, a) => s + a.total_spend, 0);
    const weighted = all.reduce((s, a) => s + (a.avg_quality ?? 0) * a.count, 0);
    return {
      count,
      rejection_rate: count > 0 ? rejected / count : 0,
      approval_rate: count > 0 ? approved / count : 0,
      avg_quality: count > 0 ? weighted / count : 0,
      spend,
    };
  }, [agents]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Quality Scoring &amp; Feedback Loop
          </h1>
          <p className="text-muted-foreground text-sm">
            Cheap AI is only valuable if the output is good enough. ROI is quality-adjusted using founder feedback so low-quality output never looks like a win.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Feedback entries (90d)" value={totals.count.toString()} />
          <Stat label="Avg quality" value={totals.avg_quality > 0 ? `${totals.avg_quality.toFixed(2)} / 5` : "—"} />
          <Stat label="Approval rate" value={`${(totals.approval_rate * 100).toFixed(0)}%`} />
          <Stat label="Rejection rate" value={`${(totals.rejection_rate * 100).toFixed(0)}%`} />
          <Stat label="Spend on rated output" value={formatGBP(totals.spend)} />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Awaiting feedback ({pendingRows.length})</TabsTrigger>
            <TabsTrigger value="agents"><Bot className="h-3 w-3 mr-1 inline" /> Agents</TabsTrigger>
            <TabsTrigger value="templates"><FileText className="h-3 w-3 mr-1 inline" /> Templates</TabsTrigger>
            <TabsTrigger value="tiers"><Layers className="h-3 w-3 mr-1 inline" /> Model tiers</TabsTrigger>
            <TabsTrigger value="recs"><Lightbulb className="h-3 w-3 mr-1 inline" /> Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="tech-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{r.task_category ?? r.action_type ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{r.agent_id ? String(r.agent_id).slice(0, 8) : "—"}</TableCell>
                        <TableCell className="text-xs">{r.model_tier ?? "—"}</TableCell>
                        <TableCell>{formatGBP(Number(r.estimated_cost ?? 0))}</TableCell>
                        <TableCell><Badge variant="outline">{r.status ?? "—"}</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openFeedback(r.id, r.output_summary ?? r.task_category ?? "AI output")}>
                            Rate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingRows.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        {loadingPending ? "Loading…" : "Nothing waiting for feedback in the last 30 days."}
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <RollupTable
              rows={agents}
              keyLabel="Agent"
              resolveKey={(k) => k ? String(k).slice(0, 8) : "Unassigned"}
            />
          </TabsContent>

          <TabsContent value="templates">
            <RollupTable
              rows={templates}
              keyLabel="Prompt template"
              resolveKey={(k) => k ? (templateNames as any)[k] ?? String(k).slice(0, 8) : "—"}
              extraColumn={{
                header: "Recommendation",
                render: (r) => {
                  const rec = (r.avg_quality ?? 5) < 2.5 ? "Retire"
                    : (r.avg_quality ?? 5) < 3.5 || r.rejection_rate >= 0.25 ? "Improve"
                    : "Keep";
                  const cls = rec === "Retire" ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : rec === "Improve" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                  return <Badge variant="outline" className={cls}>{rec}</Badge>;
                },
              }}
            />
          </TabsContent>

          <TabsContent value="tiers">
            <Card className="tech-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task category</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Avg quality</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Avg cost / approved</TableHead>
                      <TableHead>Total spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tiers as ModelTierRollup[]).map((t) => (
                      <TableRow key={t.key ?? ""}>
                        <TableCell>{t.task_category ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{t.model_tier ?? "—"}</Badge></TableCell>
                        <TableCell>{t.count}</TableCell>
                        <TableCell><QualityBadge avg={t.avg_quality} /></TableCell>
                        <TableCell>{(t.approval_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell>{t.cost_per_approved != null ? formatGBP(t.cost_per_approved) : "—"}</TableCell>
                        <TableCell>{formatGBP(t.total_spend)}</TableCell>
                      </TableRow>
                    ))}
                    {tiers.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No feedback yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recs">
            <div className="space-y-2">
              {recs.map((r, i) => (
                <Card key={i} className="tech-card">
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className={sevColor(r.severity)}>{r.severity}</Badge>
                        {r.action}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{r.scope}: <span className="font-mono">{r.scope === "agent" || r.scope === "template" ? r.key.slice(0, 8) : r.key}</span></span>
                    </div>
                    <CardDescription className="text-xs">{r.reason}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
              {recs.length === 0 && <p className="text-sm text-muted-foreground">No recommendations yet — collect more feedback to unlock guidance.</p>}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground italic">
          Quality data is used to dampen ROI for cheap-but-bad outputs. Low-quality AI output never proceeds to external action without human approval.
        </p>
      </div>

      <AIQualityFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        ai_usage_ledger_id={activeLedgerId}
        context_title={activeTitle}
        onRecorded={() => refetchPending()}
      />
    </FounderLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="tech-card">
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function RollupTable({
  rows, keyLabel, resolveKey, extraColumn,
}: {
  rows: QualityRollup[];
  keyLabel: string;
  resolveKey: (k: string | null) => string;
  extraColumn?: { header: string; render: (r: QualityRollup) => React.ReactNode };
}) {
  return (
    <Card className="tech-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Avg quality</TableHead>
              <TableHead>Approval rate</TableHead>
              <TableHead>Edit rate</TableHead>
              <TableHead>Rejection rate</TableHead>
              <TableHead>Cost / approved</TableHead>
              <TableHead>Cost / rejected</TableHead>
              <TableHead>Total spend</TableHead>
              {extraColumn && <TableHead>{extraColumn.header}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key ?? "null"}>
                <TableCell className="font-medium">{resolveKey(r.key)}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell><QualityBadge avg={r.avg_quality} /></TableCell>
                <TableCell>{(r.approval_rate * 100).toFixed(0)}%</TableCell>
                <TableCell>{(r.edit_rate * 100).toFixed(0)}%</TableCell>
                <TableCell className={r.rejection_rate >= 0.25 ? "text-red-400" : ""}>{(r.rejection_rate * 100).toFixed(0)}%</TableCell>
                <TableCell>{r.cost_per_approved != null ? formatGBP(r.cost_per_approved) : "—"}</TableCell>
                <TableCell>{r.cost_per_rejected != null ? formatGBP(r.cost_per_rejected) : "—"}</TableCell>
                <TableCell>{formatGBP(r.total_spend)}</TableCell>
                {extraColumn && <TableCell>{extraColumn.render(r)}</TableCell>}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={extraColumn ? 10 : 9} className="text-center text-muted-foreground py-6">No feedback yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}