import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import IntelligenceOrchestratorPanel from "@/components/founder/portfolio/IntelligenceOrchestratorPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  TrendingUp,
  Target,
  ShieldCheck,
  Search,
  AlertCircle,
  ArrowUpRight,
  Lock,
} from "lucide-react";

type Asset = {
  id: string;
  asset_name: string;
  asset_type: string;
  status: string;
  current_monthly_revenue: number | null;
  current_annual_revenue: number | null;
  current_pipeline_value: number | null;
  target_exit_value_base: number | null;
  liftor_operability_score: number | null;
  founder_dependency_score: number | null;
  data_room_readiness_score: number | null;
  exit_readiness_score: number | null;
  next_decision: string | null;
  next_action: string | null;
  needs_review: boolean | null;
  updated_at: string;
};

const decisionVariant: Record<string, string> = {
  build: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  scale: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  iterate: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  park: "bg-muted text-muted-foreground border-border",
  warm_buyers: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  sell: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  kill: "bg-destructive/10 text-destructive border-destructive/30",
  adviser_review: "bg-violet-500/10 text-violet-400 border-violet-500/30",
};

const statusVariant: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  validating: "bg-cyan-500/10 text-cyan-400",
  building: "bg-blue-500/10 text-blue-400",
  active: "bg-emerald-500/10 text-emerald-400",
  scaling: "bg-emerald-500/10 text-emerald-400",
  parked: "bg-muted text-muted-foreground",
  exit_warmup: "bg-amber-500/10 text-amber-400",
  sale_process: "bg-fuchsia-500/10 text-fuchsia-400",
  sold: "bg-primary/10 text-primary",
  killed: "bg-destructive/10 text-destructive",
};

const fmtMoney = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Number(n).toFixed(0)}`;
};

export default function PortfolioExitCommandCentre() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [minExit, setMinExit] = useState(0);
  const [minDataRoom, setMinDataRoom] = useState(0);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["ma_portfolio_assets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_portfolio_assets")
        .select("*")
        .order("asset_name");
      if (error) throw error;
      return (data as Asset[]) ?? [];
    },
  });

  // Buyer warmth aggregate per asset (max warmth)
  const { data: warmthByAsset = {} } = useQuery<Record<string, string>>({
    queryKey: ["ma_buyer_warmth_by_asset"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_buyer_matches")
        .select("portfolio_asset_id, buyer_warmth_status, fit_score");
      if (error) return {};
      const order = ["cold", "aware", "engaged", "warm", "strategic_conversation", "exit_ready"];
      const out: Record<string, string> = {};
      for (const row of (data as any[]) ?? []) {
        const cur = out[row.portfolio_asset_id];
        if (!cur || order.indexOf(row.buyer_warmth_status) > order.indexOf(cur)) {
          out[row.portfolio_asset_id] = row.buyer_warmth_status;
        }
      }
      return out;
    },
  });

  const { data: bestFitByAsset = {} } = useQuery<Record<string, number>>({
    queryKey: ["ma_best_fit_by_asset"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_buyer_matches")
        .select("portfolio_asset_id, fit_score");
      if (error) return {};
      const out: Record<string, number> = {};
      for (const row of (data as any[]) ?? []) {
        const s = Number(row.fit_score ?? 0);
        if (!out[row.portfolio_asset_id] || s > out[row.portfolio_asset_id]) {
          out[row.portfolio_asset_id] = s;
        }
      }
      return out;
    },
  });

  const { data: targetByAsset = {} } = useQuery<Record<string, number>>({
    queryKey: ["ma_target_monthly_by_asset"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_execution_targets")
        .select("portfolio_asset_id, monthly_revenue_target, status")
        .in("status", ["planned", "active"]);
      if (error) return {};
      const out: Record<string, number> = {};
      for (const row of (data as any[]) ?? []) {
        const v = Number(row.monthly_revenue_target ?? 0);
        if (!out[row.portfolio_asset_id] || v > out[row.portfolio_asset_id]) {
          out[row.portfolio_asset_id] = v;
        }
      }
      return out;
    },
  });

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
      if (decisionFilter !== "all" && a.next_decision !== decisionFilter) return false;
      if ((a.exit_readiness_score ?? 0) < minExit) return false;
      if ((a.data_room_readiness_score ?? 0) < minDataRoom) return false;
      if (search && !a.asset_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [assets, statusFilter, typeFilter, decisionFilter, minExit, minDataRoom, search]);

  const stats = useMemo(() => {
    const sum = (k: keyof Asset) =>
      assets.reduce((s, a) => s + Number((a[k] as number) ?? 0), 0);
    const avg = (k: keyof Asset) => {
      const vals = assets
        .map((a) => Number((a[k] as number) ?? 0))
        .filter((v) => v > 0);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    };
    return {
      total: assets.length,
      active: assets.filter((a) => ["active", "scaling"].includes(a.status)).length,
      building: assets.filter((a) => ["building", "validating", "idea"].includes(a.status)).length,
      scaling: assets.filter((a) => a.status === "scaling").length,
      parked: assets.filter((a) => a.status === "parked").length,
      warmup: assets.filter((a) => ["exit_warmup", "sale_process"].includes(a.status)).length,
      killed: assets.filter((a) => a.status === "killed").length,
      monthlyRevenue: sum("current_monthly_revenue"),
      pipeline: sum("current_pipeline_value"),
      exitBase: sum("target_exit_value_base"),
      avgExitReadiness: avg("exit_readiness_score"),
      avgDataRoom: avg("data_room_readiness_score"),
    };
  }, [assets]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-primary" />
              Portfolio & Exit Command Centre
            </h1>
            <p className="text-muted-foreground mt-1">
              Single cockpit for every Liftor brand, asset and exit path. Data lives in the
              isolated M&amp;A schema; visibility is unified here.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/intelligence">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Open M&amp;A Intelligence Workspace
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/valuation">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Open Exit Valuation Engine
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/build-selector">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Open Quarterly Build Selector
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/execution-handoff">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Open Execution Handoff
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/manual">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Manual &amp; Technical Docs
              </Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link to="/founder/portfolio-exit/controls">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Carrier-Grade Controls
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit/ingestion">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Open Data Ingestion Centre
              </Link>
            </Button>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> External outreach LOCKED_BY_DESIGN
            </Badge>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total assets" value={stats.total} icon={<Briefcase className="h-4 w-4" />} />
          <StatCard label="Active" value={stats.active} accent="emerald" />
          <StatCard label="Building / Validating" value={stats.building} accent="blue" />
          <StatCard label="Scaling" value={stats.scaling} accent="emerald" />
          <StatCard label="Parked" value={stats.parked} accent="muted" />
          <StatCard label="Buyer warm-up" value={stats.warmup} accent="amber" />
          <StatCard label="Killed" value={stats.killed} accent="destructive" />
          <StatCard label="Monthly revenue" value={fmtMoney(stats.monthlyRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="Pipeline value" value={fmtMoney(stats.pipeline)} />
          <StatCard label="Target exit (base)" value={fmtMoney(stats.exitBase)} icon={<Target className="h-4 w-4" />} />
          <StatCard label="Avg exit readiness" value={`${stats.avgExitReadiness}%`} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatCard label="Avg data room" value={`${stats.avgDataRoom}%`} />
        </div>

        {/* AI Intelligence Orchestrator */}
        <IntelligenceOrchestratorPanel />

        {/* Filters */}
        <Card className="tech-card">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["idea","validating","building","active","scaling","parked","exit_warmup","sale_process","sold","killed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Asset type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {["brand","SaaS","service_business","media_ip","ecommerce","marketplace","ai_tool","other"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={decisionFilter} onValueChange={setDecisionFilter}>
              <SelectTrigger><SelectValue placeholder="Next decision" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                {Object.keys(decisionVariant).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Exit ≥</span>
              <Input
                type="number" min={0} max={100}
                value={minExit}
                onChange={(e) => setMinExit(Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">DR ≥</span>
              <Input
                type="number" min={0} max={100}
                value={minDataRoom}
                onChange={(e) => setMinDataRoom(Number(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead className="text-right">Target MRR</TableHead>
                      <TableHead className="text-right">Exit (base)</TableHead>
                      <TableHead>Buyer fit</TableHead>
                      <TableHead>Operability</TableHead>
                      <TableHead>Data room</TableHead>
                      <TableHead>Founder dep.</TableHead>
                      <TableHead>Buyer warmth</TableHead>
                      <TableHead>Next decision</TableHead>
                      <TableHead>Next action</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id} className="hover:bg-secondary/30">
                        <TableCell>
                          <Link to={`/founder/portfolio-exit/${a.id}`} className="font-medium hover:text-primary">
                            {a.asset_name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{a.asset_type}</div>
                          {a.needs_review && (
                            <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/40 text-amber-400">
                              needs review
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs ${statusVariant[a.status] ?? ""}`}>
                            {a.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{fmtMoney(a.current_monthly_revenue)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(targetByAsset[a.id] ?? null)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(a.target_exit_value_base)}</TableCell>
                        <TableCell><ScoreBar value={bestFitByAsset[a.id] ?? 0} /></TableCell>
                        <TableCell><ScoreBar value={a.liftor_operability_score ?? 0} /></TableCell>
                        <TableCell><ScoreBar value={a.data_room_readiness_score ?? 0} /></TableCell>
                        <TableCell><ScoreBar value={a.founder_dependency_score ?? 0} invert /></TableCell>
                        <TableCell className="text-xs">{warmthByAsset[a.id] ?? "—"}</TableCell>
                        <TableCell>
                          {a.next_decision ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${decisionVariant[a.next_decision] ?? ""}`}>
                              {a.next_decision.replace("_", " ")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate" title={a.next_action ?? ""}>
                          {a.next_action ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(a.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/founder/portfolio-exit/${a.id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: "emerald" | "blue" | "amber" | "destructive" | "muted";
}) {
  const accentClass =
    accent === "emerald" ? "text-emerald-400"
    : accent === "blue" ? "text-blue-400"
    : accent === "amber" ? "text-amber-400"
    : accent === "destructive" ? "text-destructive"
    : accent === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <Card className="tech-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${accentClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ value, invert }: { value: number; invert?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  // For invert (founder dependency), low is good
  const tone =
    invert
      ? v <= 30 ? "bg-emerald-500" : v <= 60 ? "bg-amber-500" : "bg-destructive"
      : v >= 70 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="w-24">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{v}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 border border-dashed border-border/60 rounded-lg">
      <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">No portfolio assets match the current filters.</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add records via the M&amp;A schema or clear filters. No fake data shown.
      </p>
    </div>
  );
}
