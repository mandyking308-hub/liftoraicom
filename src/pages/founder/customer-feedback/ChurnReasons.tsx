import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listChurnReasons, fmtMoney } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function VocChurnReasons() {
  const { data: rows = [] } = useQuery({ queryKey: ["voc-churn"], queryFn: listChurnReasons });
  return (
    <FounderLayout>
      <VocLayout title="Churn & Lost-Deal Reasons" subtitle="Why customers leave and why deals are lost. Feeds Relationship Health, Sales Coaching and Founder Reporting.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No churn reasons captured.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.customer_label ?? "Unknown"} · {r.business_name ?? "—"}</span>
                      <TagBadge label={r.reason_category} tone="warn" />
                      <TagBadge label={r.primary_cause} />
                      <TagBadge label={r.status} tone={r.status === "won_back" ? "ok" : r.status === "lost" ? "bad" : "warn"} />
                      {r.recoverable && <TagBadge label="recoverable" tone="info" />}
                      <span className="ml-auto tabular-nums">{fmtMoney(Number(r.revenue_impact), r.currency)}</span>
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    {r.detail && <p className="text-muted-foreground">{r.detail}</p>}
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