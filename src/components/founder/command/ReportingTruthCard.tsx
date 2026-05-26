import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchConflicts, fetchKpiDefinitions, fetchTruthRules, fetchSnapshots, summarize, SEVERITY_META, type TruthSummary } from "@/lib/reportingTruthEngine";

export default function ReportingTruthCard() {
  const [sum, setSum] = useState<TruthSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchConflicts(), fetchKpiDefinitions(), fetchTruthRules(), fetchSnapshots()])
      .then(([c,k,r,s]) => setSum(summarize(c,k,r,s)))
      .catch(() => setSum(null));
  }, []);
  const tone = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale size={14} className="text-primary" />
          Global Reporting Truth Layer
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> External gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">One source of truth for revenue, pipeline, customer, AI cost and portfolio KPIs across every dashboard. Conflicts surface for founder review — never auto-corrected.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/reporting-truth/kpi-dictionary" label="KPIs"          value={sum?.total_kpis} />
          <Tile to="/founder/reporting-truth/definitions"    label="Rules"         value={sum?.active_rules} />
          <Tile to="/founder/reporting-truth/conflicts"      label="Open"          value={sum?.open_conflicts}   cls={tone(sum?.open_conflicts ?? 0)} />
          <Tile to="/founder/reporting-truth/conflicts"      label="High severity" value={sum?.high_severity}    cls={bad(sum?.high_severity ?? 0)} />
          <Tile to="/founder/reporting-truth/conflicts"      label="Test leaks"    value={sum?.test_data_leaks}  cls={bad(sum?.test_data_leaks ?? 0)} />
          <Tile to="/founder/reporting-truth/reconciliation" label="Snapshots"     value={sum?.recent_snapshots} />
        </div>
        {sum?.top_conflict && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[sum.top_conflict.severity].cls}`}>{SEVERITY_META[sum.top_conflict.severity].label}</Badge>
              <p className="text-[10px] uppercase text-muted-foreground">Top conflict</p>
            </div>
            <p className="text-sm font-medium">{sum.top_conflict.conflict_summary}</p>
            {sum.top_conflict.recommended_fix && <p className="text-[11px] text-primary/90">Fix: {sum.top_conflict.recommended_fix}</p>}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/reporting-truth" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/reporting-truth/kpi-dictionary" className="text-primary hover:underline">KPI dictionary</Link>
          <Link to="/founder/reporting-truth/conflicts" className="text-primary hover:underline">Conflicts</Link>
          <Link to="/founder/reporting-truth/reconciliation" className="text-primary hover:underline">Reconciliation</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}