import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listFatigueWarnings } from "@/lib/attentionGuardEngine";

export default function DecisionsPage() {
  const { data: warnings = [] } = useQuery({ queryKey: ["att-fatigue"], queryFn: listFatigueWarnings });
  return (
    <FounderLayout>
      <AttLayout title="Decision Fatigue Warnings" subtitle="When founder-only items cluster or stack up, the Attention Agent flags fatigue risk and recommends grouping or delegation.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open warnings</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {warnings.length === 0 && <p className="text-muted-foreground">No fatigue warnings.</p>}
            {warnings.map(w => (
              <div key={w.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <TagBadge label={w.severity} tone={w.severity === "high" ? "bad" : "warn"} />
                  <TagBadge label={w.status} tone={w.status === "open" ? "bad" : "ok"} />
                  <span className="font-medium">{w.warning_type.replace(/_/g," ")}</span>
                </div>
                {w.detail && <p>{w.detail}</p>}
                {w.recommended_action && <p className="text-emerald-400">Recommended: {w.recommended_action}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}