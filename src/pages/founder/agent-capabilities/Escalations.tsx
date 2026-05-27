import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAgents, listEscalations } from "@/lib/agentCapabilityEngine";

export default function EscalationsPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["acr-agents-e"], queryFn: listAgents });
  const { data: triggers = [] } = useQuery({ queryKey: ["acr-escalations"], queryFn: listEscalations });
  return (
    <FounderLayout>
      <AcrLayout title="Escalation Triggers" subtitle="When agents must hand off to a human. Missing escalation rules show as capability gaps.">
        <div className="space-y-3">
          {agents.map(a => {
            const items = triggers.filter(t => t.agent_id === a.id);
            return (
              <Card key={a.id} className="tech-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{a.agent_name}</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1">
                  {items.map(t => (
                    <div key={t.id} className="flex items-start gap-2 border border-border/40 rounded p-2">
                      <TagBadge label={t.escalate_to} tone="warn" />
                      <div className="flex-1">
                        <div className="font-medium">{t.trigger_type.replace(/_/g," ")}{t.threshold ? ` · ${t.threshold}` : ""}</div>
                        {t.notes && <div className="text-muted-foreground text-[11px]">{t.notes}</div>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-yellow-300">No escalation triggers — capability gap.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AcrLayout>
    </FounderLayout>
  );
}