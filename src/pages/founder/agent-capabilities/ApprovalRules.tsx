import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAgents, listApprovalRequirements } from "@/lib/agentCapabilityEngine";

export default function ApprovalRulesPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["acr-agents-a"], queryFn: listAgents });
  const { data: rules = [] } = useQuery({ queryKey: ["acr-approvals"], queryFn: listApprovalRequirements });
  return (
    <FounderLayout>
      <AcrLayout title="Approval Rules" subtitle="Each agent action that requires explicit approval, plus pre-approved rules with defined limits.">
        <div className="space-y-3">
          {agents.map(a => {
            const items = rules.filter(r => r.agent_id === a.id);
            return (
              <Card key={a.id} className="tech-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{a.agent_name}</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1">
                  {items.map(r => (
                    <div key={r.id} className="flex items-start gap-2 border border-border/40 rounded p-2">
                      <TagBadge label={r.is_pre_approved ? "pre-approved" : "approval required"} tone={r.is_pre_approved ? "ok" : "warn"} />
                      <div className="flex-1">
                        <div className="font-medium">{r.action.replace(/_/g," ")} → {r.required_approver}</div>
                        {r.rule_summary && <div className="text-muted-foreground text-[11px]">{r.rule_summary}</div>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-muted-foreground">No approval rules defined.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AcrLayout>
    </FounderLayout>
  );
}