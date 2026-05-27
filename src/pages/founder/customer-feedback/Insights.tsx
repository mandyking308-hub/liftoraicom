import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listInsights, listPmfSignals } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VocInsights() {
  const { data: insights = [] } = useQuery({ queryKey: ["voc-insights"], queryFn: listInsights });
  const { data: pmf = [] } = useQuery({ queryKey: ["voc-pmf"], queryFn: listPmfSignals });
  return (
    <FounderLayout>
      <VocLayout title="VoC Insights & PMF Signals" subtitle="Aggregated insights from the Voice-of-Customer Agent plus product-market-fit measurements. Recommendations require founder decision.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aggregated insights</CardTitle></CardHeader>
          <CardContent className="p-0">
            {insights.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No insights yet.</p> : (
              <div className="divide-y divide-border/40">
                {insights.map(i => (
                  <div key={i.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{i.topic}</span>
                      <span className="text-muted-foreground">{i.business_name ?? "—"}</span>
                      <TagBadge label={`confidence ${(Number(i.confidence)*100).toFixed(0)}%`} tone={i.confidence >= 0.7 ? "ok" : "warn"} />
                      <TagBadge label={`${i.source_count} sources`} />
                      <TagBadge label={i.founder_decision ?? "pending"} tone={i.founder_decision === "approve" ? "ok" : i.founder_decision === "reject" ? "muted" : "warn"} />
                      {!i.applied && <TagBadge label="not applied" tone="info" />}
                      {i.is_test_data && <TagBadge label={`test:${i.trace_id ?? ""}`} tone="info" />}
                    </div>
                    <p>{i.insight}</p>
                    {i.recommendation && <p className="text-primary text-[11px]">Recommendation: {i.recommendation}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Product-market-fit signals</CardTitle></CardHeader>
          <CardContent className="p-0">
            {pmf.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No PMF signals recorded.</p> : (
              <div className="divide-y divide-border/40">
                {pmf.map(p => (
                  <div key={p.id} className="p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{p.segment ?? "All"}</span>
                    <span className="text-muted-foreground">{p.business_name ?? "—"}</span>
                    <TagBadge label={p.signal_type} tone="info" />
                    {p.very_disappointed_pct !== null && <TagBadge label={`very-disappointed ${Number(p.very_disappointed_pct).toFixed(0)}%`} tone={Number(p.very_disappointed_pct) < 40 ? "warn" : "ok"} />}
                    {p.nps_score !== null && <TagBadge label={`NPS ${Number(p.nps_score).toFixed(0)}`} />}
                    <TagBadge label={`n=${p.sample_size}`} />
                    {p.watch && <TagBadge label="watch" tone="warn" />}
                    {p.notes && <span className="text-muted-foreground ml-2">{p.notes}</span>}
                    {p.is_test_data && <TagBadge label={`test:${p.trace_id ?? ""}`} tone="info" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </VocLayout>
    </FounderLayout>
  );
}