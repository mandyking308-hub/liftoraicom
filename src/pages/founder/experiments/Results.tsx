import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ExpLayout, TagBadge } from "./_shared";
import { listResults, listFailures } from "@/lib/experimentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentResults() {
  const { data: results = [] } = useQuery({ queryKey: ["exp-results"], queryFn: listResults });
  const { data: failures = [] } = useQuery({ queryKey: ["exp-failures"], queryFn: listFailures });
  return (
    <FounderLayout>
      <ExpLayout title="Experiment results" subtitle="Observed metrics from attribution, sales and feedback. Failures captured so they are not retested blindly.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Observed results</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {results.length === 0 && <p className="text-muted-foreground">No results yet.</p>}
            {results.map(r => (
              <div key={r.id} className="border border-border/40 rounded p-2">
                <p className="font-mono">{r.metric_name}: <b>{r.observed_value}</b> {r.lift_pct != null && <span className={r.lift_pct >= 0 ? "text-emerald-400" : "text-red-300"}>({r.lift_pct >= 0 ? "+" : ""}{r.lift_pct}%)</span>} <span className="text-muted-foreground">n={r.sample_size}</span> {r.significance != null && <span className="text-muted-foreground">p={r.significance}</span>}</p>
                {r.notes && <p className="text-muted-foreground mt-1">{r.notes}</p>}
                {r.source && <TagBadge label={r.source} tone="info" />}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Failed experiments</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {failures.length === 0 && <p className="text-muted-foreground">No failures logged.</p>}
            {failures.map(f => (
              <div key={f.id} className="border border-red-500/30 rounded p-2">
                <p><b>{f.failure_reason}</b> <TagBadge label={f.recommendation} tone="warn" /></p>
                {f.detail && <p className="text-muted-foreground mt-1">{f.detail}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </ExpLayout>
    </FounderLayout>
  );
}