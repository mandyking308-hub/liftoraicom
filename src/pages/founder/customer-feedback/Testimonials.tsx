import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listTestimonials } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function VocTestimonials() {
  const { data: rows = [] } = useQuery({ queryKey: ["voc-testimonials"], queryFn: listTestimonials });
  return (
    <FounderLayout>
      <VocLayout title="Testimonial Candidates" subtitle="High-praise quotes detected from customer interactions. Liftor never contacts customers or publishes testimonials without founder approval.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No testimonial candidates yet.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.customer_label ?? "Unknown"} · {r.business_name ?? "—"}</span>
                      <TagBadge label={`strength ${r.strength_score}`} tone={r.strength_score >= 8 ? "ok" : "info"} />
                      <TagBadge label={r.ask_status} tone={r.ask_status === "received" ? "ok" : r.ask_status === "declined" ? "muted" : "warn"} />
                      {r.founder_decision && <TagBadge label={`founder: ${r.founder_decision}`} tone="info" />}
                      {r.requires_external_ask && <TagBadge label="external ask gated" tone="info" />}
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    <p className="italic">"{r.quote}"</p>
                    {r.context && <p className="text-muted-foreground">{r.context}</p>}
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