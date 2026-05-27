import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ExpLayout, TagBadge } from "./_shared";
import { listPlans, listVariants, listMetrics } from "@/lib/experimentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentPlans() {
  const { data: plans = [] } = useQuery({ queryKey: ["exp-plans"], queryFn: listPlans });
  const { data: variants = [] } = useQuery({ queryKey: ["exp-variants"], queryFn: listVariants });
  const { data: metrics = [] } = useQuery({ queryKey: ["exp-metrics"], queryFn: listMetrics });
  return (
    <FounderLayout>
      <ExpLayout title="Experiment plans" subtitle="Hypothesis, metric, audience, risk and variants for every planned test.">
        <div className="space-y-3">
          {plans.length === 0 && <p className="text-xs text-muted-foreground">No plans yet.</p>}
          {plans.map(p => {
            const vs = variants.filter(v => v.plan_id === p.id);
            const ms = metrics.filter(m => m.plan_id === p.id);
            return (
              <Card key={p.id} className="tech-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                    <span>{p.business_name ?? "—"}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{p.channel ?? "channel?"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{p.product_or_offer ?? "—"}</span>
                    <TagBadge label={p.status} tone={p.status === "running" ? "ok" : p.status === "blocked" ? "bad" : "muted"} />
                    <TagBadge label={`risk ${p.risk_level}`} tone={p.risk_level === "high" ? "bad" : p.risk_level === "med" ? "warn" : "muted"} />
                    <TagBadge label={p.approval_status} tone={p.approval_status === "approved" ? "ok" : p.approval_status === "rejected" ? "bad" : "warn"} />
                    {p.is_test_data && <TagBadge label="LIVE_INTERNAL_TEST" tone="info" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p><span className="text-muted-foreground">Hypothesis:</span> {p.hypothesis}</p>
                  <p><span className="text-muted-foreground">Success metric:</span> {p.success_metric}</p>
                  <p><span className="text-muted-foreground">Audience:</span> {p.audience ?? "—"}</p>
                  {vs.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Variants</p>
                      <ul className="space-y-1">
                        {vs.map(v => <li key={v.id}>• <b>{v.label}</b>{v.is_control ? " (control)" : ""} — {v.description ?? "—"} <span className="text-muted-foreground">[{v.traffic_split}%]</span></li>)}
                      </ul>
                    </div>
                  )}
                  {ms.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Metrics</p>
                      <ul className="space-y-1">
                        {ms.map(m => <li key={m.id}>• {m.metric_name} ({m.metric_type}) target {m.target_value ?? "—"}{m.unit ?? ""}</li>)}
                      </ul>
                    </div>
                  )}
                  {p.requires_external_launch && <TagBadge label="external launch requires founder approval" tone="warn" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ExpLayout>
    </FounderLayout>
  );
}