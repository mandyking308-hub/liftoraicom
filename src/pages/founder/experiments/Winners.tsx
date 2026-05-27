import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ExpLayout, TagBadge } from "./_shared";
import { listWinners } from "@/lib/experimentEngine";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentWinners() {
  const { data: winners = [] } = useQuery({ queryKey: ["exp-winners"], queryFn: listWinners });
  return (
    <FounderLayout>
      <ExpLayout title="Winning hypotheses" subtitle="Validated winners ready for founder decision: keep, scale, retest or retire. External rollouts remain gated.">
        <div className="space-y-2">
          {winners.length === 0 && <p className="text-xs text-muted-foreground">No winners yet.</p>}
          {winners.map(w => (
            <Card key={w.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{w.winning_hypothesis}</span>
                  <TagBadge label={w.recommendation} tone={w.recommendation === "scale" ? "ok" : w.recommendation === "retire" ? "bad" : "warn"} />
                  <TagBadge label={`conf ${(w.confidence*100).toFixed(0)}%`} tone="info" />
                  {w.requires_external_rollout && !w.founder_decision && <TagBadge label="awaiting founder approval" tone="warn" />}
                  {w.founder_decision && <TagBadge label={w.founder_decision} tone="ok" />}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </ExpLayout>
    </FounderLayout>
  );
}