import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listFeatureRequests } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function VocFeatureRequests() {
  const { data: rows = [] } = useQuery({ queryKey: ["voc-features"], queryFn: listFeatureRequests });
  return (
    <FounderLayout>
      <VocLayout title="Feature Requests" subtitle="Detected and de-duplicated feature requests. Routed to Product / QA and Founder Reporting for prioritisation.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No feature requests detected.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-muted-foreground">{r.business_name ?? "—"}</span>
                      <TagBadge label={`${r.mention_count} mentions`} tone={r.mention_count >= 3 ? "warn" : "info"} />
                      <TagBadge label={`impact ${r.customer_impact}`} tone={r.customer_impact === "high" ? "warn" : "muted"} />
                      <TagBadge label={r.status} tone={r.status === "shipped" ? "ok" : r.status === "rejected" ? "muted" : "warn"} />
                      {r.requires_product_review && <TagBadge label="product review" tone="info" />}
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    {r.description && <p className="text-muted-foreground">{r.description}</p>}
                    {r.recommended_next_step && <p className="text-primary text-[11px]">Next: {r.recommended_next_step}</p>}
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