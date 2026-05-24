import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, AlertTriangle, Calculator, Sparkles } from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";
import {
  calculateAIROI, generateRoiSnapshot, periodRange, roiByDimension,
  DEFAULT_ASSUMPTIONS, type PeriodType, type RoiAssumptions, type RoiStatus, type RoiResult,
} from "@/services/aiRoiEngine";

function statusColor(s: RoiStatus) {
  switch (s) {
    case "excellent": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "healthy": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "watch": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "poor": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "stop": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function RoiCard({ title, result }: { title: string; result: RoiResult }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className={statusColor(result.roi_status)}>
            {result.roi_status} · {result.roi_score}
          </Badge>
        </div>
        <CardDescription>
          {result.action_count} actions · {result.estimated_flag ? "Value partly estimated" : "Linked to real revenue/pipeline"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="AI spend" value={formatGBP(result.total_ai_spend)} />
        <Row label="Human cost saved (est.)" value={formatGBP(result.estimated_human_cost_saved)} muted={result.used_default_assumptions} />
        <Row label="Net saving" value={formatGBP(result.net_saving)} positive={result.net_saving > 0} negative={result.net_saving < 0} />
        <Row label="Revenue linked" value={formatGBP(result.revenue_linked)} />
        <Row label="Pipeline linked" value={formatGBP(result.pipeline_linked)} />
        <Row label="Time saved" value={`${result.time_saved_minutes} min`} />
        {result.warning && (
          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {result.warning}
          </div>
        )}
        {result.used_default_assumptions && (
          <div className="text-[10px] text-muted-foreground italic">
            Using default human-equivalent cost assumptions.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, muted, positive, negative }: { label: string; value: string; muted?: boolean; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}{muted ? " *" : ""}</span>
      <span className={positive ? "text-emerald-400" : negative ? "text-red-400" : ""}>{value}</span>
    </div>
  );
}

export default function AIROIEngine() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [businessId, setBusinessId] = useState<string>("all");
  const [assumptions, setAssumptions] = useState<RoiAssumptions>(DEFAULT_ASSUMPTIONS);
  const [editingAssumptions, setEditingAssumptions] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);

  const { data: businesses = [] } = useQuery({
    queryKey: ["roi-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const baseInput = useMemo(() => ({
    ...range,
    period_type: period,
    assumptions,
    business_id: businessId === "all" ? null : businessId,
  }), [range, period, assumptions, businessId]);

  const { data: overall, isLoading: loadingOverall, refetch: refetchOverall } = useQuery({
    queryKey: ["roi-overall", baseInput],
    queryFn: () => calculateAIROI(baseInput),
  });

  const { data: byBusiness = [] } = useQuery({
    queryKey: ["roi-by-business", range],
    queryFn: () => roiByDimension("business_id", range, assumptions),
  });
  const { data: byAgent = [] } = useQuery({
    queryKey: ["roi-by-agent", range, businessId],
    queryFn: () => roiByDimension("agent_id", range, assumptions),
  });
  const { data: byCampaign = [] } = useQuery({
    queryKey: ["roi-by-campaign", range],
    queryFn: () => roiByDimension("campaign_id", range, assumptions),
  });
  const { data: byCategory = [] } = useQuery({
    queryKey: ["roi-by-category", range],
    queryFn: () => roiByDimension("task_category", range, assumptions),
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["roi-snapshots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_roi_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async (t: PeriodType) => {
      const r = periodRange(t);
      return generateRoiSnapshot({
        ...r,
        period_type: t,
        assumptions,
        business_id: businessId === "all" ? null : businessId,
      });
    },
    onSuccess: (res) => {
      toast({ title: "Snapshot saved", description: `${res.period_type} · ${res.roi_status} · ${formatGBP(res.total_ai_spend)} spend` });
      qc.invalidateQueries({ queryKey: ["roi-snapshots"] });
    },
    onError: (e: any) => toast({ title: "Snapshot failed", description: e.message, variant: "destructive" }),
  });

  const businessName = (id: string | null) =>
    id ? businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8) : "Unassigned";

  return (
    <FounderLayout>
      <AICostBreadcrumb page="ROI Engine" description="Per-agent / per-business ROI calculated from linked value vs AI spend." /><div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> AI ROI Engine
            </h1>
            <p className="text-muted-foreground text-sm">
              Compare AI spend against human cost saved, pipeline and revenue. Estimated values flagged where revenue is not linked.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setEditingAssumptions((v) => !v)}>
              <Calculator className="h-4 w-4 mr-1" /> Assumptions
            </Button>
            <Button size="sm" onClick={() => snapshotMutation.mutate(period)} disabled={snapshotMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-1" /> Snapshot {period}
            </Button>
          </div>
        </div>

        {editingAssumptions && (
          <Card className="tech-card">
            <CardHeader>
              <CardTitle className="text-base">Human equivalent hourly cost (GBP)</CardTitle>
              <CardDescription>Used to estimate cost saved when ledger entries don't record it. Mark assumptions clearly when displayed.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(DEFAULT_ASSUMPTIONS) as (keyof RoiAssumptions)[]).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize">{k.replace(/_/g, " ")}</Label>
                  <Input
                    type="number"
                    value={assumptions[k]}
                    onChange={(e) => setAssumptions((a) => ({ ...a, [k]: Number(e.target.value) || 0 }))}
                  />
                </div>
              ))}
              <div className="col-span-full flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setAssumptions(DEFAULT_ASSUMPTIONS); refetchOverall(); }}>Reset defaults</Button>
                <Button size="sm" onClick={() => refetchOverall()}>Recalculate</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {overall && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoiCard title={`Overall · ${period}`} result={overall} />
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="text-base">Cost-efficiency snapshot</CardTitle>
                <CardDescription>Period: {new Date(range.period_start).toLocaleDateString()} – {new Date(range.period_end).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                <Row label="Cost / lead" value={overall.cost_per_lead !== null ? formatGBP(overall.cost_per_lead) : "—"} />
                <Row label="Cost / opportunity" value={overall.cost_per_opportunity !== null ? formatGBP(overall.cost_per_opportunity) : "—"} />
                <Row label="Cost / sale" value={overall.cost_per_sale !== null ? formatGBP(overall.cost_per_sale) : "—"} />
                <Row label="Cost / content asset" value={overall.cost_per_content_asset !== null ? formatGBP(overall.cost_per_content_asset) : "—"} />
                <Row label="Cost / interaction" value={overall.cost_per_customer_interaction !== null ? formatGBP(overall.cost_per_customer_interaction) : "—"} />
                <Row label="AI cost : revenue" value={overall.ai_cost_to_revenue_ratio !== null ? overall.ai_cost_to_revenue_ratio.toFixed(3) : "—"} />
                <Row label="AI cost : pipeline" value={overall.ai_cost_to_pipeline_ratio !== null ? overall.ai_cost_to_pipeline_ratio.toFixed(3) : "—"} />
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="business">
          <TabsList>
            <TabsTrigger value="business">By business</TabsTrigger>
            <TabsTrigger value="agent">By agent</TabsTrigger>
            <TabsTrigger value="campaign">By campaign</TabsTrigger>
            <TabsTrigger value="category">By task category</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <DimensionTable rows={byBusiness} keyLabel="Business" resolveKey={(k) => businessName(k)} />
          </TabsContent>
          <TabsContent value="agent">
            <DimensionTable rows={byAgent} keyLabel="Agent" resolveKey={(k) => k ? k.slice(0, 8) : "Unassigned"} />
          </TabsContent>
          <TabsContent value="campaign">
            <DimensionTable rows={byCampaign} keyLabel="Campaign" resolveKey={(k) => k ? k.slice(0, 8) : "Unassigned"} />
          </TabsContent>
          <TabsContent value="category">
            <DimensionTable rows={byCategory} keyLabel="Task category" resolveKey={(k) => k ?? "Uncategorised"} />
          </TabsContent>

          <TabsContent value="snapshots">
            <Card className="tech-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>Net saving</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{new Date(s.created_at).toLocaleString()}</TableCell>
                        <TableCell>{s.period_type}</TableCell>
                        <TableCell>{businessName(s.business_id)}</TableCell>
                        <TableCell>{formatGBP(Number(s.total_ai_spend ?? 0))}</TableCell>
                        <TableCell className={Number(s.net_saving ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}>{formatGBP(Number(s.net_saving ?? 0))}</TableCell>
                        <TableCell>{formatGBP(Number(s.revenue_linked ?? 0))}</TableCell>
                        <TableCell>{formatGBP(Number(s.pipeline_linked ?? 0))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor((s.roi_status ?? "watch") as RoiStatus)}>
                            {s.roi_status ?? "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {snapshots.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No snapshots yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loadingOverall && <p className="text-xs text-muted-foreground">Calculating…</p>}
      </div>
    </FounderLayout>
  );
}

function DimensionTable({
  rows, keyLabel, resolveKey,
}: {
  rows: Array<RoiResult & { key: string | null }>;
  keyLabel: string;
  resolveKey: (k: string | null) => string;
}) {
  return (
    <Card className="tech-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Human cost saved</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key ?? "null"}>
                <TableCell className="font-medium">{resolveKey(r.key)}</TableCell>
                <TableCell>{formatGBP(r.total_ai_spend)}</TableCell>
                <TableCell className={r.used_default_assumptions ? "text-muted-foreground" : ""}>
                  {formatGBP(r.estimated_human_cost_saved)}{r.used_default_assumptions ? " *" : ""}
                </TableCell>
                <TableCell className={r.net_saving >= 0 ? "text-emerald-400" : "text-red-400"}>{formatGBP(r.net_saving)}</TableCell>
                <TableCell>{formatGBP(r.revenue_linked)}</TableCell>
                <TableCell>{formatGBP(r.pipeline_linked)}</TableCell>
                <TableCell>{r.action_count}</TableCell>
                <TableCell>{r.roi_score}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor(r.roi_status)}>{r.roi_status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No data in period.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}