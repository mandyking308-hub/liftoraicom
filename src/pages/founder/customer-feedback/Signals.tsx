import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listFeedback, sentimentTone } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function VocSignals() {
  const { data: rows = [] } = useQuery({ queryKey: ["voc-feedback"], queryFn: listFeedback });
  return (
    <FounderLayout>
      <VocLayout title="Customer Signals" subtitle="Raw feedback pulled from support, sales calls, onboarding, complaints, delivery and customer communications.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No feedback captured yet.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.customer_label ?? "Unknown"} · {r.business_name ?? "—"}</span>
                      <TagBadge label={r.source} tone="info" />
                      {r.channel && <TagBadge label={r.channel} />}
                      {r.theme && <TagBadge label={r.theme} />}
                      <TagBadge label={r.sentiment} tone={sentimentTone(r.sentiment)} />
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    <p>{r.summary}</p>
                    {r.raw_excerpt && <p className="text-muted-foreground italic">{r.raw_excerpt}</p>}
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