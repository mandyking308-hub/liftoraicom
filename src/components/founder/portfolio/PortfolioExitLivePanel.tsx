import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target, Briefcase, Radar, Calculator, Trophy, Handshake, FileInput,
  BookOpenCheck, ShieldCheck, Activity, Lock, AlertCircle,
} from "lucide-react";

type AssetRow = {
  id: string;
  asset_name: string;
  status: string | null;
  current_monthly_revenue: number | null;
  current_pipeline_value: number | null;
  target_exit_value_base: number | null;
  exit_readiness_score: number | null;
  data_room_readiness_score: number | null;
};

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);

function useCount(table: string, filter?: (q: any) => any) {
  return useQuery({
    queryKey: ["pe_count", table, filter?.toString() ?? ""],
    queryFn: async () => {
      let q: any = supabase.from(table as never).select("id", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export default function PortfolioExitLivePanel() {
  const { data: assets = [] } = useQuery({
    queryKey: ["pe_assets_live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_portfolio_assets")
        .select("id,asset_name,status,current_monthly_revenue,current_pipeline_value,target_exit_value_base,exit_readiness_score,data_room_readiness_score")
        .order("updated_at", { ascending: false });
      if (error) return [] as AssetRow[];
      return (data ?? []) as AssetRow[];
    },
  });

  const { data: buyersCount = 0 } = useCount("ma_buyer_matches");
  const { data: targetsCount = 0 } = useCount("ma_exit_targets");
  const { data: dataRoomCount = 0 } = useCount("ma_data_room_items");
  const { data: executionCount = 0 } = useCount("ma_execution_targets");
  const { data: buildCount = 0 } = useCount("ma_build_candidates");
  const { data: approvalsCount = 0 } = useCount("ai_action_queue", (q) => q.eq("status", "requires_approval"));

  const totals = assets.reduce(
    (acc, a) => ({
      monthly: acc.monthly + (Number(a.current_monthly_revenue) || 0),
      pipeline: acc.pipeline + (Number(a.current_pipeline_value) || 0),
      target: acc.target + (Number(a.target_exit_value_base) || 0),
      exit: acc.exit + (Number(a.exit_readiness_score) || 0),
      dr: acc.dr + (Number(a.data_room_readiness_score) || 0),
      n: acc.n + 1,
      build: acc.build + (a.status === "build" || a.status === "validation" ? 1 : 0),
      scale: acc.scale + (a.status === "scale" || a.status === "scaling" ? 1 : 0),
      parked: acc.parked + (a.status === "parked" ? 1 : 0),
    }),
    { monthly: 0, pipeline: 0, target: 0, exit: 0, dr: 0, n: 0, build: 0, scale: 0, parked: 0 },
  );
  const avgExit = totals.n ? Math.round(totals.exit / totals.n) : 0;
  const avgDr = totals.n ? Math.round(totals.dr / totals.n) : 0;

  const tiles: Array<[string, string | number, string]> = [
    ["Active assets", totals.n, "live"],
    ["Build / validation", totals.build, "live"],
    ["Scaling", totals.scale, "live"],
    ["Parked", totals.parked, "live"],
    ["Combined target exit", fmtGBP(totals.target), totals.target ? "live" : "needs data"],
    ["Monthly revenue", fmtGBP(totals.monthly), totals.monthly ? "live" : "needs data"],
    ["Pipeline value", fmtGBP(totals.pipeline), totals.pipeline ? "live" : "needs data"],
    ["Avg exit readiness", `${avgExit}%`, totals.n ? "live" : "needs data"],
    ["Avg data-room", `${avgDr}%`, totals.n ? "live" : "needs data"],
    ["Buyer records", buyersCount, buyersCount ? "live" : "needs data"],
    ["Valuation targets", targetsCount, targetsCount ? "live" : "create one"],
    ["Data-room items", dataRoomCount, dataRoomCount ? "live" : "generate checklist"],
    ["Execution targets", executionCount, executionCount ? "live" : "generate from exit target"],
    ["Build candidates", buildCount, buildCount ? "live" : "run build selector"],
    ["Open approvals", approvalsCount, approvalsCount ? "action required" : "none"],
  ];

  const quickLinks = [
    { label: "Command Centre", to: "/founder/portfolio-exit", icon: Target, primary: true },
    { label: "Exit Valuation", to: "/founder/portfolio-exit/valuation", icon: Calculator },
    { label: "Quarterly Build Selector", to: "/founder/portfolio-exit/build-selector", icon: Trophy },
    { label: "M&A Intelligence", to: "/founder/portfolio-exit/intelligence", icon: Radar },
    { label: "Execution Handoff", to: "/founder/portfolio-exit/execution-handoff", icon: Handshake },
    { label: "Data Ingestion", to: "/founder/portfolio-exit/ingestion", icon: FileInput },
    { label: "Operating Status", to: "/founder/portfolio-exit/release-gate", icon: Activity },
    { label: "Controls", to: "/founder/portfolio-exit/controls", icon: ShieldCheck },
    { label: "Hardening", to: "/founder/portfolio-exit/hardening", icon: Lock },
  ];

  const manualLinks = [
    { label: "User Manual", to: "/founder/manual#ai-cost-governor-command-centre" },
    { label: "Portfolio Manual", to: "/founder/portfolio-exit/manual" },
    { label: "Technical Manual", to: "/founder/manual" },
    { label: "Founder Approval Rules", to: "/founder/portfolio-exit/controls" },
    { label: "Data Source Governance", to: "/founder/portfolio-exit/ingestion" },
    { label: "Data Room Policy", to: "/founder/portfolio-exit/manual" },
  ];

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio &amp; Exit Command Centre
            <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Live — Healthy
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((l) => (
              <Button
                key={l.to}
                asChild
                size="sm"
                variant={l.primary ? "default" : "outline"}
                className="h-7 text-xs"
              >
                <Link to={l.to}>
                  <l.icon className="h-3 w-3 mr-1" />
                  {l.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tiles.map(([label, value, state]) => (
            <div key={label} className="rounded-lg border border-border bg-card/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold text-foreground">{value}</div>
              <div className={`text-[10px] mt-0.5 ${
                state === "live" ? "text-emerald-400" :
                state === "action required" ? "text-amber-400" :
                state === "none" ? "text-muted-foreground" : "text-muted-foreground"
              }`}>{state}</div>
            </div>
          ))}
        </div>

        {assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            No portfolio assets yet. Add one in the Command Centre to start tracking progress against exit target.
            <Button asChild size="sm" variant="link" className="ml-auto h-auto p-0 text-xs">
              <Link to="/founder/portfolio-exit">Open</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Asset</th>
                  <th className="text-left px-3 py-2">Stage</th>
                  <th className="text-right px-3 py-2">Monthly</th>
                  <th className="text-right px-3 py-2">Pipeline</th>
                  <th className="text-right px-3 py-2">Target exit</th>
                  <th className="text-right px-3 py-2">Exit ready</th>
                  <th className="text-right px-3 py-2">Data room</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 8).map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <Link to={`/founder/portfolio-exit/${a.id}`} className="text-primary hover:underline">
                        {a.asset_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{a.status ?? "—"}</Badge></td>
                    <td className="px-3 py-2 text-right">{fmtGBP(Number(a.current_monthly_revenue) || 0)}</td>
                    <td className="px-3 py-2 text-right">{fmtGBP(Number(a.current_pipeline_value) || 0)}</td>
                    <td className="px-3 py-2 text-right">{fmtGBP(Number(a.target_exit_value_base) || 0)}</td>
                    <td className="px-3 py-2 text-right">{Math.round(Number(a.exit_readiness_score) || 0)}%</td>
                    <td className="px-3 py-2 text-right">{Math.round(Number(a.data_room_readiness_score) || 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          <BookOpenCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Manuals &amp; policies:</span>
          {manualLinks.map((l) => (
            <Link
              key={l.to + l.label}
              to={l.to}
              className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-primary/40 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Live by default. Founder approval is required only for external sending, buyer/investor/adviser contact, paid API activation, data exports, spend commitments, legal/tax/entity changes, sale process start, kill decisions and sharing buyer packs.
        </div>
      </CardContent>
    </Card>
  );
}