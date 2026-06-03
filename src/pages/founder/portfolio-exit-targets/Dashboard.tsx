import { useEffect, useState } from "react";
import { PETLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  fetchTargets, fetchSettings, compute, summarisePortfolio, fmtMoney, STAGE_META,
  type PortfolioExitTarget, type Settings,
} from "@/lib/portfolioExitTargetEngine";

export default function PETDashboard() {
  const [targets, setTargets] = useState<PortfolioExitTarget[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => { fetchTargets().then(setTargets); fetchSettings().then(setSettings); }, []);
  if (!settings) return <PETLayout title="Portfolio Exit Targets"><p className="text-sm text-muted-foreground">Loading…</p></PETLayout>;

  const sum = summarisePortfolio(targets, settings);
  const rows = targets
    .map(t => ({ t, c: compute(t, settings) }))
    .sort((a, b) => b.c.progress_to_usd_percent - a.c.progress_to_usd_percent);

  return (
    <PETLayout title="Portfolio Exit Targets"
      subtitle={`FX £→$ ${settings.gbp_usd_rate}. Targets default $${(settings.default_target_arr_usd/1e6).toFixed(1)}m / £${(settings.default_target_arr_gbp/1e6).toFixed(1)}m ARR. Revenue alone is not sale-readiness.`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Portfolio MRR" value={fmtMoney(sum.total_mrr)} />
        <Stat label="Portfolio ARR" value={fmtMoney(sum.total_arr)} />
        <Stat label="Activated" value={`${sum.activated} / ${sum.total}`} />
        <Stat label="Revenue-generating" value={sum.revenue_generating} />
        <Stat label="In proof stage" value={sum.in_proof} />
        <Stat label="In exit prep" value={sum.in_exit_prep} />
        <Stat label="Near sale trigger (≥75%)" value={sum.near_sale_trigger} />
        <Stat label="Tracked businesses" value={sum.total} />
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portfolio leaderboard</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Stage</th>
                <th className="text-right p-2">Customers</th>
                <th className="text-right p-2">MRR</th>
                <th className="text-right p-2">ARR</th>
                <th className="text-left p-2">% of $5m</th>
                <th className="text-right p-2">Margin</th>
                <th className="text-right p-2">AI-op</th>
                <th className="text-right p-2">Readiness</th>
                <th className="text-left p-2">Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No businesses tracked yet. Add one from the Businesses tab.</td></tr>}
              {rows.map(({ t, c }) => (
                <tr key={t.id} className="border-b border-border/20 hover:bg-secondary/30">
                  <td className="p-2">
                    <Link to={`/founder/portfolio-exit-targets/${t.id}`} className="font-medium hover:text-primary">{t.business_name}</Link>
                    <div className="text-[10px] text-muted-foreground capitalize">{t.business_status} · {t.revenue_model.replace(/_/g, " ")}</div>
                  </td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${STAGE_META[c.derived_exit_stage].cls}`}>{STAGE_META[c.derived_exit_stage].label}</Badge></td>
                  <td className="p-2 text-right tabular-nums">{t.current_active_customers}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(c.mrr)}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(c.arr)}</td>
                  <td className="p-2 w-32"><Progress value={c.progress_to_usd_percent} className="h-2" /><span className="text-[10px] text-muted-foreground">{c.progress_to_usd_percent.toFixed(1)}%</span></td>
                  <td className="p-2 text-right tabular-nums">{t.gross_margin_percent ?? "—"}%</td>
                  <td className="p-2 text-right tabular-nums">{t.ai_operated_score ?? "—"}</td>
                  <td className={`p-2 text-right tabular-nums font-semibold ${c.sale_readiness_score >= 70 ? "text-emerald-400" : c.sale_readiness_score >= 40 ? "text-amber-300" : "text-muted-foreground"}`}>{c.sale_readiness_score}</td>
                  <td className="p-2 text-primary/90 max-w-[18ch] truncate" title={t.next_action ?? ""}>{t.next_action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <CalloutCard label="Highest potential" t={sum.highest_potential} />
        <CalloutCard label="Fastest moving toward target" t={sum.fastest_moving} />
        <CalloutCard label="Best AI-operated margin" t={sum.best_ai_margin} />
        <CalloutCard label="Needs founder attention" t={sum.needs_attention} accent="amber" />
      </div>
    </PETLayout>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="tech-card">
      <CardContent className="p-3">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function CalloutCard({ label, t, accent }: { label: string; t: PortfolioExitTarget | null; accent?: "amber" }) {
  return (
    <Card className="tech-card">
      <CardContent className="p-3">
        <p className={`text-[10px] uppercase ${accent === "amber" ? "text-amber-300" : "text-muted-foreground"}`}>{label}</p>
        {t ? (
          <Link to={`/founder/portfolio-exit-targets/${t.id}`} className="text-sm font-semibold hover:text-primary">{t.business_name}</Link>
        ) : <p className="text-sm text-muted-foreground">—</p>}
      </CardContent>
    </Card>
  );
}