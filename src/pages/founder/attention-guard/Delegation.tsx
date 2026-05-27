import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDelegationItems } from "@/lib/attentionGuardEngine";

export default function DelegationPage() {
  const { data: items = [] } = useQuery({ queryKey: ["att-deleg"], queryFn: listDelegationItems });
  return (
    <FounderLayout>
      <AttLayout title="Delegation & Deferral" subtitle="Items the Attention Agent recommends Mandy delegate or defer. Recommendations only - founder approves the handoff.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recommendations ({items.length})</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {items.length === 0 && <p className="text-muted-foreground">No delegation/defer recommendations.</p>}
            {items.map(d => (
              <div key={d.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <TagBadge label={d.recommended_action} tone={d.recommended_action === "delegate" ? "info" : "warn"} />
                  <span className="font-medium flex-1">{d.title}</span>
                  <TagBadge label={d.status} tone={d.status === "recommended" ? "warn" : "ok"} />
                </div>
                <div className="text-[10px] text-muted-foreground flex gap-3">
                  <span>{d.source_module}{d.source_ref ? ` - ${d.source_ref}` : ""}</span>
                  {d.recommended_owner && <span>-> {d.recommended_owner}</span>}
                  {d.defer_until && <span>until {d.defer_until}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}