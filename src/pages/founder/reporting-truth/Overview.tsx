import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { RTLayout, RTStat } from "./_shared";
import { fetchConflicts, fetchKpiDefinitions, fetchTruthRules, fetchSnapshots, summarize, SEVERITY_META, type TruthSummary } from "@/lib/reportingTruthEngine";

export default function ReportingTruthOverview() {
  const [sum, setSum] = useState<TruthSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchConflicts(), fetchKpiDefinitions(), fetchTruthRules(), fetchSnapshots()])
      .then(([c,k,r,s]) => setSum(summarize(c,k,r,s)))
      .catch(() => setSum(null));
  }, []);
  return (
    <RTLayout title="Reporting Truth Overview" subtitle="One shared definition of revenue, pipeline, customer, AI cost and portfolio KPIs. Dashboards must not disagree — when they do, conflicts surface here.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <RTStat label="KPIs defined" value={sum?.total_kpis ?? "—"} />
        <RTStat label="Active rules" value={sum?.active_rules ?? "—"} />
        <RTStat label="Open conflicts" value={sum?.open_conflicts ?? "—"} tone={(sum?.open_conflicts ?? 0) > 0 ? "warn" : "ok"} />
        <RTStat label="High severity" value={sum?.high_severity ?? "—"} tone={(sum?.high_severity ?? 0) > 0 ? "bad" : "ok"} />
        <RTStat label="Test data leaks" value={sum?.test_data_leaks ?? "—"} tone={(sum?.test_data_leaks ?? 0) > 0 ? "bad" : "ok"} />
        <RTStat label="Snapshots" value={sum?.recent_snapshots ?? "—"} />
      </div>
      {sum?.top_conflict && (
        <Card className="tech-card border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top conflict to review</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[sum.top_conflict.severity].cls}`}>{SEVERITY_META[sum.top_conflict.severity].label}</Badge>
              <Badge variant="outline" className="text-[10px]">{sum.top_conflict.conflict_type.replace(/_/g," ")}</Badge>
            </div>
            <p className="text-sm font-medium">{sum.top_conflict.conflict_summary}</p>
            {sum.top_conflict.recommended_fix && <p className="text-primary/90">Fix: {sum.top_conflict.recommended_fix}</p>}
            <Link to="/founder/reporting-truth/conflicts" className="text-primary hover:underline">Review all conflicts →</Link>
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Source-of-truth map</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">Confirmed revenue:</span> invoices (paid) → contracts (signed) → manual confirmation</p>
          <p><span className="text-foreground font-medium">Estimated pipeline:</span> opportunities, leads — never blended with revenue</p>
          <p><span className="text-foreground font-medium">AI cost:</span> ai_usage_ledger.cost_amount labelled by cost_basis (actual vs estimated)</p>
          <p><span className="text-foreground font-medium">Marketplace:</span> GMV ≠ platform revenue ≠ seller payouts (always separated)</p>
          <p><span className="text-foreground font-medium">Test data:</span> excluded everywhere via is_test_data or audit_metadata.label = LIVE_INTERNAL_TEST</p>
        </CardContent>
      </Card>
    </RTLayout>
  );
}