import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ExpLayout, TagBadge } from "./_shared";
import { listLearnings } from "@/lib/experimentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LearningLibrary() {
  const { data: learnings = [] } = useQuery({ queryKey: ["exp-learnings"], queryFn: listLearnings });
  return (
    <FounderLayout>
      <ExpLayout title="Growth learning library" subtitle="Persistent learnings fed into Channel Strategy, Sales Coaching, Product Catalogue and Portfolio Prioritisation.">
        <div className="space-y-2">
          {learnings.length === 0 && <p className="text-xs text-muted-foreground">No learnings recorded yet.</p>}
          {learnings.map(l => (
            <Card key={l.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{l.topic}</span>
                  <TagBadge label={`conf ${(l.confidence*100).toFixed(0)}%`} tone="info" />
                  <TagBadge label={l.applied ? "applied" : "pending"} tone={l.applied ? "ok" : "warn"} />
                  {l.feeds_into && <TagBadge label={`→ ${l.feeds_into}`} tone="info" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <p>{l.learning}</p>
                {l.applies_to && <p className="text-muted-foreground">Applies to: {l.applies_to}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </ExpLayout>
    </FounderLayout>
  );
}