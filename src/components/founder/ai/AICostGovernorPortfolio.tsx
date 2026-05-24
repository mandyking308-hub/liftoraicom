import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, ShieldCheck, ShieldAlert, Siren, PoundSterling, TrendingUp,
  Bot, Route as RouteIcon, Sparkles, BookOpen,
} from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";
import {
  calculateAIROI, roiByDimension, periodRange, type RoiStatus,
} from "@/services/aiRoiEngine";
import { getBusinessBudgetUsage } from "@/services/aiBudgetService";

const NAV = [
  { label: "AI Cost Overview", to: "/founder/command-centre#ai-cost", icon: Activity, primary: true },
  { label: "Usage Ledger", to: "/founder/ai-cost/ledger", icon: Activity },
  { label: "Model Router", to: "/founder/ai-cost/routing", icon: RouteIcon },
  { label: "Business Budgets", to: "/founder/ai-cost/budgets", icon: PoundSterling },
  { label: "Agent Controls", to: "/founder/ai-cost/agent-controls", icon: Bot },
  { label: "Cost Alerts", to: "/founder/ai-cost/alerts", icon: Siren },
  { label: "ROI Engine", to: "/founder/ai-cost/roi", icon: TrendingUp },
  { label: "Prompt Templates", to: "/founder/ai-cost/templates", icon: Sparkles },
  { label: "Cached Context", to: "/founder/ai-cost/context", icon: BookOpen },
  { label: "Human Approval Queue", to: "/founder/ai-cost/approvals", icon: ShieldCheck },
];

function roiColor(s: RoiStatus | string | null | undefined) {
  switch (s) {
    case "excellent": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "healthy": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "watch": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "poor": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "stop": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
function sevColor(s: string) {
  switch (s) {
    case "critical": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "warning": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default: return "bg-sky-500/15 text-sky-400 border-sky-500/30";
  }
}

export default function AICostGovernorPortfolio() {
  const range = useMemo(() => periodRange("monthly"), []);

  const { data: overall } = useQuery({
    queryKey: ["cc-roi-overall", range],
    queryFn: () => calculateAIROI({ ...range, period_type: "monthly" }),
    refetchInterval: 60_000,
  });

  const { data: byBusiness = [] } = useQuery({
    queryKey: ["cc-roi-business", range],
    queryFn: () => roiByDimension("business_id", range),
  });
  const { data: byAgent = [] } = useQuery({
    queryKey: ["cc-roi-agent", range],
    queryFn: () => roiByDimension("agent_id", range),
  });
  const { data: byCategory = [] } = useQuery({
    queryKey: ["cc-roi-category", range],
    queryFn: () => roiByDimension("task_category", range),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["cc-businesses-min"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const businessName = (id: string | null) => id ? businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8) : "Unassigned";

  const { data: approvalsCount = 0 } = useQuery({
    queryKey: ["cc-approvals-pending"],
    queryFn: async () => {
      const { count } = await supabase
        .from("founder_approval_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("source_system", "ai_cost_governor");
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const { data: openAlerts = [] } = useQuery({
    queryKey: ["cc-cost-alerts-open"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_cost_alerts")
        .select("id,alert_type,severity,recommended_action,business_id,agent_id,created_at,resolved_at")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    },
    refetchInterval: 60_000,
  });

  const { data: agentsPaused = 0 } = useQuery({
    queryKey: ["cc-agents-paused"],
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_agent_cost_controls")
        .select("id", { count: "exact", head: true })
        .eq("active", false);
      return count ?? 0;
    },
  });

  // Budget usage per business
  const { data: budgetUsage = [] } = useQuery({
    queryKey: ["cc-business-budget-usage", businesses.map((b) => b.id).join(",")],
    enabled: businesses.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        businesses.map(async (b) => {
          try {
            const u = await getBusinessBudgetUsage(b.id);
            return { id: b.id, name: b.name, usage: u };
          } catch { return { id: b.id, name: b.name, usage: null }; }
        }),
      );
      return rows;
    },
  });
  const businessesOverBudget = budgetUsage.filter(
    (r) => r.usage && ["exceeded", "blocked"].includes(r.usage.status),
  ).length;

  const severityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of openAlerts) m[a.severity ?? "info"] = (m[a.severity ?? "info"] ?? 0) + 1;
    return m;
  }, [openAlerts]);

  const highestCost = [...byAgent].sort((a, b) => b.total_ai_spend - a.total_ai_spend).slice(0, 5);
  const highestRoi = [...byAgent].filter((a) => a.roi_score > 0).sort((a, b) => b.roi_score - a.roi_score).slice(0, 5);
  const lowestRoi = [...byAgent].sort((a, b) => a.roi_score - b.roi_score).slice(0, 5);

  return (
    <section id="ai-cost" className="space-y-4 max-w-7xl mx-auto px-4 pt-4 scroll-mt-20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> AI Cost Governor & ROI
          </h2>
          <p className="text-xs text-muted-foreground">
            Portfolio-wide view of AI spend, value created and governance. Values marked “estimated” are model-derived where no real revenue is linked.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {NAV.map((n) => (
            <Button key={n.to} asChild size="sm" variant={n.primary ? "secondary" : "outline"} className="h-8">
              <Link to={n.to}><n.icon className="h-3.5 w-3.5 mr-1" />{n.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="AI spend (month)" value={overall ? formatGBP(overall.total_ai_spend) : "—"} />
        <Stat label="Human cost saved (est.)" value={overall ? formatGBP(overall.estimated_human_cost_saved) : "—"} muted />
        <Stat label="Net saving" value={overall ? formatGBP(overall.net_saving) : "—"} positive={(overall?.net_saving ?? 0) > 0} negative={(overall?.net_saving ?? 0) < 0} />
        <Stat label="Pipeline linked" value={overall ? formatGBP(overall.pipeline_linked) : "—"} />
        <Stat label="Revenue linked" value={overall ? formatGBP(overall.revenue_linked) : "—"} />
        <Stat label="Approvals pending" value={approvalsCount} link="/founder/ai-cost/approvals" />
        <Stat label="Open cost alerts" value={openAlerts.length} link="/founder/ai-cost/alerts" />
        <Stat label="Agents paused/blocked" value={agentsPaused} link="/founder/ai-cost/agent-controls" />
        <Stat label="Businesses over budget" value={businessesOverBudget} link="/founder/ai-cost/budgets" />
        <Stat
          label="Portfolio ROI"
          value={overall ? `${overall.roi_score} · ${overall.roi_status}` : "—"}
          badgeClass={roiColor(overall?.roi_status)}
          link="/founder/ai-cost/roi"
        />
      </div>

      {/* Plain-English explainer if anything red */}
      {(openAlerts.some((a) => ["critical", "high"].includes(a.severity)) || businessesOverBudget > 0 || (overall?.warning ?? null)) && (
        <Card className="tech-card border-amber-500/30">
          <CardContent className="pt-4 text-sm space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-medium"><ShieldAlert className="h-4 w-4" /> Founder attention recommended</div>
            <ul className="text-xs text-muted-foreground list-disc ml-5 space-y-0.5">
              {openAlerts.some((a) => a.severity === "critical") && <li>Critical cost alerts are open. Liftor recommends reviewing them and pausing the affected agents or campaigns until cleared.</li>}
              {businessesOverBudget > 0 && <li>{businessesOverBudget} business(es) have exceeded their AI budget this period. Liftor recommends raising the budget, downgrading model tier, or pausing low-ROI tasks.</li>}
              {overall?.warning && <li>{overall.warning}</li>}
              {approvalsCount > 25 && <li>Human approval queue is large ({approvalsCount}). Liftor recommends triaging high-risk items first or reducing approval-generating workflows.</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">By business</TabsTrigger>
          <TabsTrigger value="agent">Agents</TabsTrigger>
          <TabsTrigger value="category">Task category</TabsTrigger>
          <TabsTrigger value="budgets">Budget usage</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <DimTable rows={byBusiness} keyLabel="Business" resolveKey={(k) => businessName(k)} />
        </TabsContent>

        <TabsContent value="agent">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <MiniList title="Highest cost agents" rows={highestCost} metric="spend" />
            <MiniList title="Best ROI agents" rows={highestRoi} metric="roi" />
            <MiniList title="Lowest ROI agents" rows={lowestRoi} metric="roi" />
          </div>
        </TabsContent>

        <TabsContent value="category">
          <DimTable rows={byCategory} keyLabel="Task category" resolveKey={(k) => k ?? "Uncategorised"} />
        </TabsContent>

        <TabsContent value="budgets">
          <Card className="tech-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Monthly used</TableHead><TableHead>Status</TableHead><TableHead>Top agent</TableHead></TableRow></TableHeader>
                <TableBody>
                  {budgetUsage.map((r) => {
                    const pct = r.usage?.monthly_pct ?? 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, pct)} className="w-24 h-2" />
                            <span className="text-xs">{Math.round(pct)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            r.usage?.status === "blocked" || r.usage?.status === "exceeded" ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : r.usage?.status === "near_limit" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : r.usage?.status === "watch" ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          }>{r.usage?.status ?? "unknown"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.usage?.top_spending_agent ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {budgetUsage.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No businesses.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {["critical", "high", "warning", "info"].map((sev) => (
              <Card key={sev} className="tech-card">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground capitalize">{sev}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={sevColor(sev)}>{severityCounts[sev] ?? 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="tech-card mt-3">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Recommended action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {openAlerts.slice(0, 10).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{a.alert_type}</TableCell>
                      <TableCell><Badge variant="outline" className={sevColor(a.severity ?? "info")}>{a.severity ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{a.recommended_action ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {openAlerts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No open alerts.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground italic">
        * Human-cost-saved values are estimated using configurable hourly assumptions unless ledger entries record real costs. This dashboard is monitoring/governance only — no external actions are sent from here.
      </p>
    </section>
  );
}

function Stat({
  label, value, link, badgeClass, muted, positive, negative,
}: {
  label: string;
  value: React.ReactNode;
  link?: string;
  badgeClass?: string;
  muted?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  const body = (
    <Card className="tech-card h-full">
      <CardContent className="pt-4">
        <div className="text-[11px] uppercase text-muted-foreground tracking-wide">{label}{muted ? " *" : ""}</div>
        {badgeClass
          ? <Badge variant="outline" className={`${badgeClass} mt-1 text-base`}>{value}</Badge>
          : <div className={`text-xl font-semibold mt-1 ${positive ? "text-emerald-400" : negative ? "text-red-400" : ""}`}>{value}</div>}
      </CardContent>
    </Card>
  );
  return link ? <Link to={link} className="hover:opacity-90">{body}</Link> : body;
}

function DimTable({
  rows, keyLabel, resolveKey,
}: {
  rows: any[]; keyLabel: string; resolveKey: (k: string | null) => string;
}) {
  return (
    <Card className="tech-card">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Net saving</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 12).map((r) => (
              <TableRow key={(r.key ?? "null") + r.total_ai_spend}>
                <TableCell className="font-medium">{resolveKey(r.key)}</TableCell>
                <TableCell>{formatGBP(r.total_ai_spend)}</TableCell>
                <TableCell className={r.net_saving >= 0 ? "text-emerald-400" : "text-red-400"}>{formatGBP(r.net_saving)}</TableCell>
                <TableCell>{formatGBP(r.revenue_linked)}</TableCell>
                <TableCell>{formatGBP(r.pipeline_linked)}</TableCell>
                <TableCell>{r.roi_score}</TableCell>
                <TableCell><Badge variant="outline" className={roiColor(r.roi_status)}>{r.roi_status}</Badge></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No data this period.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MiniList({ title, rows, metric }: { title: string; rows: any[]; metric: "spend" | "roi" }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {rows.map((r) => (
          <div key={r.key ?? Math.random()} className="flex justify-between border-b border-border/40 py-1">
            <span className="font-mono text-xs truncate mr-2">{r.key ? r.key.slice(0, 10) : "Unassigned"}</span>
            <span className={metric === "roi"
              ? (r.roi_score >= 0 ? "text-emerald-400" : "text-red-400")
              : ""}>
              {metric === "spend" ? formatGBP(r.total_ai_spend) : `${r.roi_score} · ${r.roi_status}`}
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
      </CardContent>
    </Card>
  );
}