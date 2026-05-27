import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, Stat, TagBadge } from "./_shared";
import { summariseVoc, fmtMoney } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VocOverview() {
  const { data: s } = useQuery({ queryKey: ["voc-overview"], queryFn: summariseVoc, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <VocLayout title="Voice of Customer" subtitle="Liftor learns from every customer signal — support, calls, sales, complaints, delivery, onboarding. Reviews, testimonials and outbound asks never fire without founder approval.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Feedback captured" value={s?.feedbackTotal ?? 0} />
          <Stat label="Negative signals" value={s?.negativeCount ?? 0} tone={s?.negativeCount ? "warn" : "ok"} />
          <Stat label="Feature requests open" value={s?.featureRequestsOpen ?? 0} />
          <Stat label="Top mentions" value={s?.topFeatureMentions ?? 0} hint="single request" />
          <Stat label="Testimonials pending" value={s?.testimonialsPending ?? 0} tone={s?.testimonialsPending ? "warn" : "ok"} />
          <Stat label="Review drafts pending" value={s?.reviewsPending ?? 0} tone={s?.reviewsPending ? "warn" : "ok"} />
          <Stat label="Churn open" value={s?.churnOpen ?? 0} tone={s?.churnOpen ? "bad" : "ok"} />
          <Stat label="Churn impact" value={fmtMoney(s?.churnImpact ?? 0)} tone={s && s.churnImpact > 0 ? "bad" : "ok"} />
          <Stat label="PMF watch segments" value={s?.pmfWatch ?? 0} tone={s?.pmfWatch ? "warn" : "ok"} />
          <Stat label="Insights pending" value={s?.insightsPending ?? 0} tone={s?.insightsPending ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Voice-of-Customer posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">No watch items. Customer voice is being captured cleanly.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No auto-survey" tone="info" />
              <TagBadge label="No auto-review request" tone="info" />
              <TagBadge label="No auto-testimonial publish" tone="info" />
              <TagBadge label="No customer contact without approval" tone="info" />
            </div>
          </CardContent>
        </Card>
      </VocLayout>
    </FounderLayout>
  );
}