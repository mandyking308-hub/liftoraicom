import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAgents, listProhibited } from "@/lib/agentCapabilityEngine";

export default function BoundariesPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["acr-agents-b"], queryFn: listAgents });
  const { data: prohibited = [] } = useQuery({ queryKey: ["acr-prohibited"], queryFn: listProhibited });
  return (
    <FounderLayout>
      <AcrLayout title="Agent Boundaries" subtitle="Prohibited actions per agent. These actions are hard-blocked unless re-permissioned by founder.">
        <div className="space-y-3">
          {agents.map(a => {
            const items = prohibited.filter(p => p.agent_id === a.id);
            return (
              <Card key={a.id} className="tech-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {a.agent_name}
                    <span className="text-[10px] text-muted-foreground">{items.length} prohibited action(s)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {items.map(p => (
                    <div key={p.id} className="flex items-start gap-2 border border-border/40 rounded p-2">
                      <TagBadge label={p.severity} tone={p.severity === "high" ? "bad" : "warn"} />
                      <div className="flex-1">
                        <div className="font-medium">{p.action.replace(/_/g," ")}</div>
                        {p.reason && <div className="text-muted-foreground text-[11px]">{p.reason}</div>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-muted-foreground">No prohibited actions defined — capability gap.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AcrLayout>
    </FounderLayout>
  );
}