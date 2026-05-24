import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Workflow, Lock, AlertTriangle, ArrowUpRight, ShieldCheck, ClipboardList,
  Send, Inbox, FileText, Users, Database, UserCheck, Megaphone, BarChart3,
  Sparkles, RefreshCw,
} from "lucide-react";

type Asset = {
  id: string;
  asset_name: string;
  status: string;
  current_monthly_revenue: number | null;
  current_monthly_profit: number | null;
  current_pipeline_value: number | null;
  current_annual_revenue: number | null;
  target_exit_value_base: number | null;
  liftor_operability_score: number | null;
  founder_dependency_score: number | null;
  data_room_readiness_score: number | null;
  exit_readiness_score: number | null;
  next_decision: string | null;
  next_action: string | null;
};

type ExecTarget = {
  id: string;
  portfolio_asset_id: string;
  exit_target_id: string | null;
  target_period_start: string | null;
  target_period_end: string | null;
  monthly_revenue_target: number | null;
  monthly_profit_target: number | null;
  pipeline_target: number | null;
  qualified_leads_target: number | null;
  outreach_target: number | null;
  content_output_target: number | null;
  buyer_warmup_target: number | null;
  crm_opportunity_target: number | null;
  inbox_response_sla: string | null;
  assigned_agent: string | null;
  status: string;
  notes: string | null;
};

type BuyerMatch = {
  id: string;
  portfolio_asset_id: string;
  buyer_company_id: string;
  buyer_type: string;
  fit_score: number | null;
  strategic_reason: string | null;
  buyer_warmth_status: string;
  warm_route: string | null;
  decision_makers_notes: string | null;
  next_warmup_action: string | null;
  last_contacted_at: string | null;
  next_contact_due_at: string | null;
  risk_notes: string | null;
};

type DataRoomItem = {
  id: string;
  portfolio_asset_id: string;
  item_category: string;
  item_name: string;
  status: string;
  storage_location: string | null;
  owner: string | null;
  due_date: string | null;
  notes: string | null;
};

type ExitTarget = {
  id: string;
  portfolio_asset_id: string;
  target_value_base: number | null;
  timeline_months: number | null;
  required_monthly_revenue: number | null;
  required_monthly_profit: number | null;
  required_pipeline: number | null;
};

const AGENT_META: Record<string, { label: string; icon: any }> = {
  outreach: { label: "Outreach Agent", icon: Send },
  crm: { label: "CRM Agent", icon: Users },
  inbox: { label: "Inbox Agent", icon: Inbox },
  content: { label: "Content Agent", icon: FileText },
  reporting: { label: "Reporting Agent", icon: BarChart3 },
  compliance: { label: "Compliance Agent", icon: ShieldCheck },
  buyer_warmup: { label: "Buyer Warm-Up Agent", icon: Megaphone },
  data_room: { label: "Data Room Agent", icon: Database },
  founder_approval: { label: "Founder Approval Agent", icon: UserCheck },
};

const WARMTH_ORDER = ["cold", "aware", "engaged", "warm", "strategic_conversation", "exit_ready"];
const WARMTH_VARIANT: Record<string, string> = {
  cold: "bg-muted text-muted-foreground border-border",
  aware: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  engaged: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  warm: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  strategic_conversation: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  exit_ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};
const DR_VARIANT: Record<string, string> = {
  missing: "bg-destructive/10 text-destructive border-destructive/30",
  requested: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  needs_review: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
};
const TARGET_STATUS_VARIANT: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  active: "bg-cyan-500/10 text-cyan-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  missed: "bg-destructive/10 text-destructive",
  revised: "bg-amber-500/10 text-amber-400",
};

const fmtMoney = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Number(n).toFixed(0)}`;
};
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const pct = (have: number, need: number) =>
  !need ? 0 : Math.max(0, Math.min(100, Math.round((have / need) * 100)));

const isOverdue = (t: ExecTarget) =>
  t.target_period_end && new Date(t.target_period_end) < new Date() &&
  !["completed", "revised"].includes(t.status);

export default function ExecutionHandoff() {
  const qc = useQueryClient();
  const [assetFilter, setAssetFilter] = useState<string>("all");

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["eh_assets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_portfolio_assets").select("*").order("asset_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: execTargets = [] } = useQuery<ExecTarget[]>({
    queryKey: ["eh_exec_targets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_execution_targets").select("*").order("target_period_end", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: exitTargets = [] } = useQuery<ExitTarget[]>({
    queryKey: ["eh_exit_targets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_exit_targets").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: buyerMatches = [] } = useQuery<BuyerMatch[]>({
    queryKey: ["eh_buyer_matches"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_buyer_matches").select("*").order("next_contact_due_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: buyerCompanies = [] } = useQuery<any[]>({
    queryKey: ["eh_buyer_companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_companies").select("id,company_name");
      if (error) return [];
      return data ?? [];
    },
  });
  const { data: dataRoom = [] } = useQuery<DataRoomItem[]>({
    queryKey: ["eh_data_room"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ma_data_room_items").select("*").order("item_category");
      if (error) throw error;
      return data ?? [];
    },
  });

  const companyName = (id: string) =>
    buyerCompanies.find((c) => c.id === id)?.company_name ?? "—";

  const visibleAssets = assetFilter === "all"
    ? assets
    : assets.filter((a) => a.id === assetFilter);

  const activeExitByAsset = useMemo(() => {
    const map: Record<string, ExitTarget> = {};
    for (const t of exitTargets) {
      const prev = map[t.portfolio_asset_id];
      if (!prev || Number(t.target_value_base ?? 0) > Number(prev.target_value_base ?? 0)) {
        map[t.portfolio_asset_id] = t;
      }
    }
    return map;
  }, [exitTargets]);

  const targetsByAsset = useMemo(() => {
    const map: Record<string, ExecTarget[]> = {};
    for (const t of execTargets) {
      (map[t.portfolio_asset_id] ||= []).push(t);
    }
    return map;
  }, [execTargets]);

  const generateDefaultDataRoom = async (assetId: string) => {
    const { data, error } = await (supabase as any).rpc("ma_generate_default_data_room", {
      _asset_id: assetId,
    });
    if (error) return toast.error(error.message);
    toast.success(`Added ${data ?? 0} default data room items`);
    qc.invalidateQueries({ queryKey: ["eh_data_room"] });
  };

  const setBuyerWarmth = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("ma_buyer_matches").update({ buyer_warmth_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Warmth updated — change logged.");
    qc.invalidateQueries({ queryKey: ["eh_buyer_matches"] });
  };

  const setDRStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("ma_data_room_items").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Data room item updated.");
    qc.invalidateQueries({ queryKey: ["eh_data_room"] });
  };

  const setTargetStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("ma_execution_targets").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Target status updated.");
    qc.invalidateQueries({ queryKey: ["eh_exec_targets"] });
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Workflow className="h-7 w-7 text-primary" />
              Execution Handoff &amp; Exit Readiness
            </h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Translates exit valuation targets into agent-level activity, buyer warm-up cadence
              and data room readiness. Every action is audited; no external messages are sent
              from this module.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Outreach LOCKED — founder approval required
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link to="/founder/portfolio-exit">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Back to Command Centre
              </Link>
            </Button>
          </div>
        </div>

        <Card className="tech-card">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Filter:</span>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="handoff">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="handoff">Handoff Dashboard</TabsTrigger>
            <TabsTrigger value="agents">Agent Targets</TabsTrigger>
            <TabsTrigger value="warmup">Buyer Warm-Up</TabsTrigger>
            <TabsTrigger value="dataroom">Data Room</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Exit Review</TabsTrigger>
          </TabsList>

          {/* ===== HANDOFF DASHBOARD ===== */}
          <TabsContent value="handoff" className="space-y-4 mt-4">
            {visibleAssets.length === 0 ? (
              <EmptyState title="No portfolio assets yet" hint="Add an asset in the Portfolio & Exit Command Centre to begin handoff." />
            ) : visibleAssets.map((a) => {
              const exit = activeExitByAsset[a.id];
              const targets = (targetsByAsset[a.id] ?? []).filter((t) =>
                ["planned", "active"].includes(t.status));
              const tot = (k: keyof ExecTarget) =>
                targets.reduce((s, t) => s + Number((t as any)[k] ?? 0), 0);
              const reqRev = exit?.required_monthly_revenue ?? tot("monthly_revenue_target");
              const reqPipe = exit?.required_pipeline ?? tot("pipeline_target");
              const haveRev = Number(a.current_monthly_revenue ?? 0);
              const havePipe = Number(a.current_pipeline_value ?? 0);
              const drForAsset = dataRoom.filter((d) => d.portfolio_asset_id === a.id);
              const drComplete = drForAsset.filter((d) => d.status === "complete").length;
              const buyersForAsset = buyerMatches.filter((b) => b.portfolio_asset_id === a.id);
              const warmCount = buyersForAsset.filter((b) =>
                ["warm", "strategic_conversation", "exit_ready"].includes(b.buyer_warmth_status)).length;
              const missed = (targetsByAsset[a.id] ?? []).filter(isOverdue);
              const assignedAgents = Array.from(new Set(targets.map((t) => t.assigned_agent).filter(Boolean))) as string[];

              return (
                <Card key={a.id} className="tech-card">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {a.asset_name}
                        <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {targets.length} active target{targets.length === 1 ? "" : "s"} ·
                        {" "}{assignedAgents.length} agents engaged
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/founder/portfolio-exit/${a.id}`}>
                        Open asset <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Metric label="Target exit (base)" value={fmtMoney(a.target_exit_value_base)} />
                      <Metric label="Required MRR" value={fmtMoney(reqRev)} sub={`have ${fmtMoney(haveRev)}`} />
                      <Metric label="Required pipeline" value={fmtMoney(reqPipe)} sub={`have ${fmtMoney(havePipe)}`} />
                      <Metric label="Required leads / mo" value={tot("qualified_leads_target") || "—"} />
                      <Metric label="Required outreach / mo" value={tot("outreach_target") || "—"} />
                      <Metric label="Required content / mo" value={tot("content_output_target") || "—"} />
                      <Metric label="Buyer warm-up actions" value={tot("buyer_warmup_target") || "—"} sub={`${warmCount} warm buyers`} />
                      <Metric label="Data room items" value={`${drComplete}/${drForAsset.length}`} sub={`${a.data_room_readiness_score ?? 0}% ready`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ProgressBlock label="Revenue progress" have={haveRev} need={reqRev} />
                      <ProgressBlock label="Pipeline progress" have={havePipe} need={reqPipe} />
                    </div>

                    {assignedAgents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Assigned agents:</span>
                        {assignedAgents.map((ag) => {
                          const meta = AGENT_META[ag];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <Badge key={ag} variant="outline" className="gap-1">
                              <Icon className="h-3 w-3" /> {meta.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {missed.length > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="text-xs text-destructive">
                          {missed.length} overdue target{missed.length === 1 ? "" : "s"} — review and mark missed or revise.
                        </div>
                      </div>
                    )}

                    {a.next_action && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Next action:</span> {a.next_action}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ===== AGENT TARGET VIEWS ===== */}
          <TabsContent value="agents" className="space-y-4 mt-4">
            {Object.entries(AGENT_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const rows = execTargets.filter((t) =>
                t.assigned_agent === key &&
                (assetFilter === "all" || t.portfolio_asset_id === assetFilter));
              return (
                <Card key={key} className="tech-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" /> {meta.label}
                      <Badge variant="outline" className="ml-2">{rows.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No targets assigned to this agent yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Asset</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Key target</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((t) => {
                              const a = assets.find((x) => x.id === t.portfolio_asset_id);
                              const overdue = isOverdue(t);
                              const primary =
                                key === "outreach" ? `${t.outreach_target ?? 0} contacts` :
                                key === "crm" ? `${t.crm_opportunity_target ?? 0} opps · ${t.qualified_leads_target ?? 0} leads` :
                                key === "inbox" ? `SLA ${t.inbox_response_sla ?? "—"}` :
                                key === "content" ? `${t.content_output_target ?? 0} assets` :
                                key === "reporting" ? `${fmtMoney(t.monthly_revenue_target)} MRR · ${fmtMoney(t.monthly_profit_target)} profit` :
                                key === "compliance" ? "Compliance evidence" :
                                key === "buyer_warmup" ? `${t.buyer_warmup_target ?? 0} warm-up actions` :
                                key === "data_room" ? "Data room population" :
                                "Founder approval gate";
                              return (
                                <TableRow key={t.id}>
                                  <TableCell className="text-sm">
                                    {a ? (
                                      <Link to={`/founder/portfolio-exit/${a.id}`} className="hover:text-primary">
                                        {a.asset_name}
                                      </Link>
                                    ) : "—"}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {fmtDate(t.target_period_start)} → {fmtDate(t.target_period_end)}
                                    {overdue && (
                                      <Badge variant="outline" className="ml-2 border-destructive/40 text-destructive text-[10px]">
                                        overdue
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">{primary}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${TARGET_STATUS_VARIANT[t.status] ?? ""}`}>
                                      {t.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[260px] truncate" title={t.notes ?? ""}>
                                    {t.notes ?? "—"}
                                  </TableCell>
                                  <TableCell>
                                    <Select value={t.status} onValueChange={(v) => setTargetStatus(t.id, v)}>
                                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {["planned","active","completed","missed","revised"].map((s) => (
                                          <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ===== BUYER WARM-UP ===== */}
          <TabsContent value="warmup" className="space-y-4 mt-4">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" /> Buyer Warm-Up Tracker
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  No emails are sent from here. All outreach requires founder approval through the existing gated flow.
                </p>
              </CardHeader>
              <CardContent>
                {buyerMatches.filter((b) => assetFilter === "all" || b.portfolio_asset_id === assetFilter).length === 0 ? (
                  <EmptyState title="No buyer matches yet" hint="Add buyer companies and matches in the M&A Intelligence Workspace." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Warmth</TableHead>
                          <TableHead>Warm route</TableHead>
                          <TableHead>Next action</TableHead>
                          <TableHead>Last contact</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Decision-makers</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buyerMatches
                          .filter((b) => assetFilter === "all" || b.portfolio_asset_id === assetFilter)
                          .map((b) => {
                            const a = assets.find((x) => x.id === b.portfolio_asset_id);
                            const overdue = b.next_contact_due_at && new Date(b.next_contact_due_at) < new Date();
                            return (
                              <TableRow key={b.id}>
                                <TableCell className="font-medium text-sm">{companyName(b.buyer_company_id)}</TableCell>
                                <TableCell className="text-xs">{a?.asset_name ?? "—"}</TableCell>
                                <TableCell className="text-xs">{b.buyer_type}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-0.5 rounded text-[10px] border ${WARMTH_VARIANT[b.buyer_warmth_status] ?? ""}`}>
                                    {b.buyer_warmth_status.replace("_", " ")}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={b.warm_route ?? ""}>{b.warm_route ?? "—"}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={b.next_warmup_action ?? ""}>{b.next_warmup_action ?? "—"}</TableCell>
                                <TableCell className="text-xs">{fmtDate(b.last_contacted_at)}</TableCell>
                                <TableCell className="text-xs">
                                  {fmtDate(b.next_contact_due_at)}
                                  {overdue && (
                                    <Badge variant="outline" className="ml-1 border-destructive/40 text-destructive text-[10px]">due</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs max-w-[160px] truncate" title={b.decision_makers_notes ?? ""}>{b.decision_makers_notes ?? "—"}</TableCell>
                                <TableCell className="text-xs max-w-[160px] truncate text-amber-400" title={b.risk_notes ?? ""}>{b.risk_notes ?? "—"}</TableCell>
                                <TableCell>
                                  <Select value={b.buyer_warmth_status} onValueChange={(v) => setBuyerWarmth(b.id, v)}>
                                    <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {WARMTH_ORDER.map((s) => (
                                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DATA ROOM ===== */}
          <TabsContent value="dataroom" className="space-y-4 mt-4">
            {visibleAssets.length === 0 ? (
              <EmptyState title="No portfolio assets" hint="Add an asset to generate its data room checklist." />
            ) : visibleAssets.map((a) => {
              const items = dataRoom.filter((d) => d.portfolio_asset_id === a.id);
              const byCat: Record<string, DataRoomItem[]> = {};
              for (const it of items) (byCat[it.item_category] ||= []).push(it);
              const complete = items.filter((i) => i.status === "complete").length;
              return (
                <Card key={a.id} className="tech-card">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>{a.asset_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {complete}/{items.length} items complete · {a.data_room_readiness_score ?? 0}% readiness score
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => generateDefaultDataRoom(a.id)}>
                      <Sparkles className="h-4 w-4 mr-1" /> Generate default checklist
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.length === 0 ? (
                      <EmptyState title="Checklist empty" hint="Generate the default 15-item checklist or add items manually." />
                    ) : (
                      Object.keys(byCat).sort().map((cat) => (
                        <div key={cat}>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h4>
                          <div className="space-y-1.5">
                            {byCat[cat].map((it) => (
                              <div key={it.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border/40 hover:border-primary/30">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">{it.item_name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {it.owner ? `Owner: ${it.owner}` : "No owner"} ·
                                    {" "}Due {fmtDate(it.due_date)}
                                    {it.storage_location ? ` · ${it.storage_location}` : ""}
                                    {it.notes ? ` · ${it.notes}` : ""}
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] border ${DR_VARIANT[it.status] ?? ""}`}>
                                  {it.status.replace("_", " ")}
                                </span>
                                <Select value={it.status} onValueChange={(v) => setDRStatus(it.id, v)}>
                                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {["missing","requested","in_progress","complete","needs_review"].map((s) => (
                                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ===== MONTHLY EXIT REVIEW ===== */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            {visibleAssets.length === 0 ? (
              <EmptyState title="No assets to review" hint="Add a portfolio asset to generate a monthly exit review." />
            ) : visibleAssets.map((a) => {
              const exit = activeExitByAsset[a.id];
              const drForAsset = dataRoom.filter((d) => d.portfolio_asset_id === a.id);
              const drScore = drForAsset.length
                ? Math.round((drForAsset.filter((d) => d.status === "complete").length / drForAsset.length) * 100)
                : (a.data_room_readiness_score ?? 0);
              const buyersForAsset = buyerMatches.filter((b) => b.portfolio_asset_id === a.id);
              const warmIdx = buyersForAsset.length
                ? Math.round(
                    (buyersForAsset.reduce((s, b) => s + WARMTH_ORDER.indexOf(b.buyer_warmth_status), 0) /
                      buyersForAsset.length) * (100 / (WARMTH_ORDER.length - 1)))
                : 0;
              const reqRev = exit?.required_monthly_revenue ?? 0;
              const reqProfit = exit?.required_monthly_profit ?? 0;
              const reqPipe = exit?.required_pipeline ?? 0;
              const haveRev = Number(a.current_monthly_revenue ?? 0);
              const haveProfit = Number(a.current_monthly_profit ?? 0);
              const havePipe = Number(a.current_pipeline_value ?? 0);
              const operability = a.liftor_operability_score ?? 0;
              const founderDep = a.founder_dependency_score ?? 0;

              // Recommendation logic
              const gapPct = pct(haveRev, reqRev);
              let recommendation = "iterate";
              let recColor = "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
              if (!exit) { recommendation = "set exit target"; recColor = "text-muted-foreground border-border bg-muted"; }
              else if (gapPct >= 90 && drScore >= 80 && warmIdx >= 60) { recommendation = "sell"; recColor = "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10"; }
              else if (gapPct >= 70 && drScore >= 60) { recommendation = "warm buyers"; recColor = "text-amber-400 border-amber-500/30 bg-amber-500/10"; }
              else if (gapPct >= 50) { recommendation = "scale"; recColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"; }
              else if (gapPct >= 20) { recommendation = "iterate"; }
              else if (operability < 30 || founderDep > 70) { recommendation = "adviser review"; recColor = "text-violet-400 border-violet-500/30 bg-violet-500/10"; }
              else if (gapPct < 10 && (a.status === "parked" || a.status === "idea")) { recommendation = "kill"; recColor = "text-destructive border-destructive/30 bg-destructive/10"; }
              else { recommendation = "park"; recColor = "text-muted-foreground border-border bg-muted"; }

              return (
                <Card key={a.id} className="tech-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {a.asset_name}
                      <Badge variant="outline" className="text-[10px]">monthly review</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Value position</h4>
                        <Metric label="Current monthly revenue" value={fmtMoney(haveRev)} />
                        <Metric label="Current pipeline" value={fmtMoney(havePipe)} />
                        <Metric label="Target exit value (base)" value={fmtMoney(a.target_exit_value_base)} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Readiness</h4>
                        <ProgressBlock label="Data room readiness" have={drScore} need={100} unit="%" />
                        <ProgressBlock label="Buyer warmth index" have={warmIdx} need={100} unit="%" />
                        <ProgressBlock label="Liftor operability" have={operability} need={100} unit="%" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Gap analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <GapTile label="Revenue gap" gap={Math.max(0, reqRev - haveRev)} fmt={fmtMoney} />
                        <GapTile label="Profit gap" gap={Math.max(0, reqProfit - haveProfit)} fmt={fmtMoney} />
                        <GapTile label="Pipeline gap" gap={Math.max(0, reqPipe - havePipe)} fmt={fmtMoney} />
                        <GapTile label="Data room gap" gap={Math.max(0, 100 - drScore)} fmt={(n) => `${n}%`} />
                        <GapTile label="Buyer warmth gap" gap={Math.max(0, 100 - warmIdx)} fmt={(n) => `${n}%`} />
                        <GapTile label="Founder dependency gap" gap={founderDep} fmt={(n) => `${n}%`} hint="lower is better" />
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/50 bg-secondary/30">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">Recommended decision</div>
                        <span className={`inline-block mt-1 px-2 py-1 rounded border text-xs font-semibold ${recColor}`}>
                          {recommendation}
                        </span>
                      </div>
                      <div className="flex-1 max-w-xl text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Next 30-day plan:</span>{" "}
                        {a.next_action ?? "Define next 30-day plan from asset detail page."}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic">
                      Planning estimate only — not financial advice. All recommended actions require founder approval before external execution.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Metric({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressBlock({ label, have, need, unit }: { label: string; have: number; need: number; unit?: string }) {
  const p = pct(have, need);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{unit === "%" ? `${have}%` : fmtMoney(have)} / {unit === "%" ? `${need}%` : fmtMoney(need)}</span>
      </div>
      <Progress value={p} className="h-1.5" />
    </div>
  );
}

function GapTile({ label, gap, fmt, hint }: { label: string; gap: number; fmt: (n: number) => string; hint?: string }) {
  const color = gap === 0 ? "text-emerald-400" : gap > 50 ? "text-destructive" : "text-amber-400";
  return (
    <div className="rounded-md border border-border/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${color}`}>{fmt(gap)}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-10 border border-dashed border-border rounded-md">
      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}