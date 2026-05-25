import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, RefreshCw, TrendingUp } from "lucide-react";
import {
  buildFinancePack, financePackToCSV, downloadCSV, currentMonth,
  type Bucket, type BusinessUE, type Decision,
} from "@/services/aiFinancePack";
import { formatGBP } from "@/services/aiUsageLogger";
import CostConfidenceBadge from "@/components/founder/ai/CostConfidenceBadge";

const DECISION_VARIANT: Record<Decision, "default" | "secondary" | "destructive" | "outline"> = {
  scale: "default",
  keep: "secondary",
  watch: "outline",
  reduce: "outline",
  pause: "destructive",
  retire: "destructive",
};

export default function AIFinancePack() {
  const [month, setMonth] = useState(currentMonth());

  const q = useQuery({
    queryKey: ["ai_finance_pack", month],
    queryFn: () => buildFinancePack(month),
  });

  const pack = q.data;

  const exportCSV = () => {
    if (!pack) return;
    downloadCSV(`liftor-ai-finance-${month}.csv`, financePackToCSV(pack));
  };

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Monthly AI Finance Pack" description="Monthly unit economics, ROI, scale/keep/watch/reduce decisions." /><div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Monthly AI Finance Pack
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Portfolio-level finance, unit economics and decision recommendations for AI spend.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={() => q.refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={exportCSV} disabled={!pack}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {q.isLoading && <p className="text-sm text-muted-foreground">Building finance pack…</p>}
        {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}

        {pack && (
          <>
            {/* Founder summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Founder summary — {pack.range.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {pack.founder_summary.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <p className="text-xs text-muted-foreground italic pt-2 border-t mt-3">
                  {pack.estimates_disclaimer} <Badge variant="outline" className="ml-1">estimates</Badge>
                </p>
              </CardContent>
            </Card>

            {/* Top totals */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              <StatCard label="AI spend" value={formatGBP(pack.totals.ai_spend)} />
              <StatCard label="Actual known cost" value={formatGBP(pack.totals.actual_known_cost)} tone="good" />
              <StatCard label="Estimated cost" value={formatGBP(pack.totals.estimated_cost)} />
              <StatCard label="Pricing missing rows" value={String(pack.totals.pricing_missing_rows)} tone={pack.totals.pricing_missing_rows > 0 ? "destructive" : undefined} />
              <StatCard label="Est. human cost saved" value={formatGBP(pack.totals.human_cost_saved)} />
              <StatCard label="Net saving" value={formatGBP(pack.totals.net_saving)} tone={pack.totals.net_saving >= 0 ? "good" : "destructive"} />
              <StatCard label="Revenue confirmed" value={formatGBP(pack.totals.revenue_confirmed)} tone="good" />
              <StatCard label="Revenue estimated" value={formatGBP(pack.totals.revenue_estimated)} />
              <StatCard label="Pipeline confirmed" value={formatGBP(pack.totals.pipeline_confirmed)} tone="good" />
              <StatCard label="Pipeline estimated" value={formatGBP(pack.totals.pipeline_estimated)} />
              <StatCard label="Quality-adj. ROI" value={`${pack.totals.quality_adjusted_roi.toFixed(2)}×`} />
              <StatCard label="Approval rate" value={`${(pack.totals.approval_rate * 100).toFixed(0)}%`} />
              <StatCard label="Rejection rate" value={`${(pack.totals.rejection_rate * 100).toFixed(0)}%`} tone={pack.totals.rejection_rate > 0.2 ? "destructive" : undefined} />
              <StatCard label="Edit rate" value={`${(pack.totals.edit_rate * 100).toFixed(0)}%`} />
              <StatCard label="Cost / lead" value={fmtOpt(pack.totals.cost_per_lead)} />
              <StatCard label="Cost / opportunity" value={fmtOpt(pack.totals.cost_per_opportunity)} />
              <StatCard label="Cost / sale" value={fmtOpt(pack.totals.cost_per_sale)} />
              <StatCard label="Cost / content asset" value={fmtOpt(pack.totals.cost_per_content_asset)} />
              <StatCard label="Cost / interaction" value={fmtOpt(pack.totals.cost_per_customer_interaction)} />
              <StatCard label="Actions" value={String(pack.totals.actions)} />
            </div>

            <Card>
              <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium">Cost confidence legend:</span>
                <CostConfidenceBadge cost_basis="actual_tokens" actual_cost_gbp={1} pricing_confidence="verified" />
                <CostConfidenceBadge cost_basis="actual_tokens" actual_cost_gbp={1} pricing_confidence="estimated" />
                <CostConfidenceBadge cost_basis="streaming_estimate" estimated_cost={1} />
                <CostConfidenceBadge cost_basis="manual_estimate" estimated_cost={1} />
                <CostConfidenceBadge pricing_missing />
                <span className="text-muted-foreground">
                  Currency: GBP. USD/EUR rows are converted at a conservative fixed rate and shown as approximate.
                </span>
              </CardContent>
            </Card>

            {/* Breakdown tabs */}
            <Tabs defaultValue="business">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="agent">Agent</TabsTrigger>
                <TabsTrigger value="campaign">Campaign</TabsTrigger>
                <TabsTrigger value="category">Task category</TabsTrigger>
                <TabsTrigger value="ue">Business unit economics</TabsTrigger>
              </TabsList>
              <TabsContent value="business"><BucketTable rows={pack.by_business} keyLabel="Business" /></TabsContent>
              <TabsContent value="agent"><BucketTable rows={pack.by_agent} keyLabel="Agent" /></TabsContent>
              <TabsContent value="campaign"><BucketTable rows={pack.by_campaign} keyLabel="Campaign" /></TabsContent>
              <TabsContent value="category"><BucketTable rows={pack.by_category} keyLabel="Task category" /></TabsContent>
              <TabsContent value="ue"><BusinessUETable rows={pack.business_unit_economics} /></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </FounderLayout>
  );
}

function fmtOpt(v: number | null) {
  return v == null ? "—" : formatGBP(v);
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "destructive" | "good" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "good" ? "text-primary" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function BucketTable({ rows, keyLabel }: { rows: Bucket[]; keyLabel: string }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead className="text-right">AI spend</TableHead>
              <TableHead className="text-right">Human saved</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Rev</TableHead>
              <TableHead className="text-right">Pipe</TableHead>
              <TableHead className="text-right">Actions</TableHead>
              <TableHead className="text-right">Appr%</TableHead>
              <TableHead className="text-right">Rej%</TableHead>
              <TableHead className="text-right">QROI</TableHead>
              <TableHead className="text-right">£/approved</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.key}>
                <TableCell className="font-mono text-xs">{b.key}</TableCell>
                <TableCell className="text-right">{formatGBP(b.ai_spend)}</TableCell>
                <TableCell className="text-right">{formatGBP(b.human_cost_saved)}</TableCell>
                <TableCell className={`text-right ${b.net_saving < 0 ? "text-destructive" : ""}`}>{formatGBP(b.net_saving)}</TableCell>
                <TableCell className="text-right">{formatGBP(b.revenue_linked)}</TableCell>
                <TableCell className="text-right">{formatGBP(b.pipeline_linked)}</TableCell>
                <TableCell className="text-right">{b.actions}</TableCell>
                <TableCell className="text-right">{(b.approval_rate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right">{(b.rejection_rate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right">{b.quality_adjusted_roi.toFixed(2)}×</TableCell>
                <TableCell className="text-right">{b.cost_per_approved == null ? "—" : formatGBP(b.cost_per_approved)}</TableCell>
                <TableCell><Badge variant={DECISION_VARIANT[b.decision]}>{b.decision.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs">{b.decision_reason}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">No data for this month.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BusinessUETable({ rows }: { rows: BusinessUE[] }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead className="text-right">AI spend</TableHead>
              <TableHead className="text-right">% of revenue</TableHead>
              <TableHead className="text-right">% of pipeline</TableHead>
              <TableHead className="text-right">Active campaigns</TableHead>
              <TableHead className="text-right">£/campaign</TableHead>
              <TableHead className="text-right">Interactions</TableHead>
              <TableHead className="text-right">£/interaction</TableHead>
              <TableHead className="text-right">£/approved</TableHead>
              <TableHead className="text-right">£/rejected</TableHead>
              <TableHead className="text-right">Budget left</TableHead>
              <TableHead className="text-right">Rec. next month</TableHead>
              <TableHead className="text-right">Payback (mo)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.business_id}>
                <TableCell className="font-mono text-xs">{u.business_id}</TableCell>
                <TableCell className="text-right">{formatGBP(u.ai_spend)}</TableCell>
                <TableCell className="text-right">{u.ai_spend_pct_revenue == null ? "—" : `${u.ai_spend_pct_revenue}%`}</TableCell>
                <TableCell className="text-right">{u.ai_spend_pct_pipeline == null ? "—" : `${u.ai_spend_pct_pipeline}%`}</TableCell>
                <TableCell className="text-right">{u.active_campaigns}</TableCell>
                <TableCell className="text-right">{u.ai_spend_per_campaign == null ? "—" : formatGBP(u.ai_spend_per_campaign)}</TableCell>
                <TableCell className="text-right">{u.customer_interactions}</TableCell>
                <TableCell className="text-right">{u.ai_spend_per_interaction == null ? "—" : formatGBP(u.ai_spend_per_interaction)}</TableCell>
                <TableCell className="text-right">{u.ai_spend_per_approved == null ? "—" : formatGBP(u.ai_spend_per_approved)}</TableCell>
                <TableCell className="text-right">{u.ai_spend_per_rejected == null ? "—" : formatGBP(u.ai_spend_per_rejected)}</TableCell>
                <TableCell className={`text-right ${u.budget_remaining != null && u.budget_remaining < 0 ? "text-destructive" : ""}`}>
                  {u.budget_remaining == null ? "—" : formatGBP(u.budget_remaining)}
                </TableCell>
                <TableCell className="text-right">{formatGBP(u.recommended_monthly_budget)}</TableCell>
                <TableCell className="text-right">{u.estimated_payback_months ?? "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">No business activity this month.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}