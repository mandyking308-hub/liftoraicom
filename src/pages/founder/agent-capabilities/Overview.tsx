import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, Stat, TagBadge } from "./_shared";
import { summariseAgentRegistry } from "@/lib/agentCapabilityEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentRegistryOverview() {
  const { data: s } = useQuery({ queryKey: ["acr-overview"], queryFn: summariseAgentRegistry, refetchInterval: 60000 });
  return (
    <FounderLayout>
      <AcrLayout title="Agent Capability Registry" subtitle="Every Liftor agent has explicit capabilities, prohibited actions, approval rules and escalation triggers. The Agent Governance Agent monitors boundaries; nothing external happens without approval.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Agents" value={s?.agents ?? 0} />
          <Stat label="Active" value={s?.activeAgents ?? 0} tone="ok" />
          <Stat label="Capabilities" value={s?.capabilities ?? 0} />
          <Stat label="Prohibited actions" value={s?.prohibitedActions ?? 0} tone="info" as any />
          <Stat label="Approval required" value={s?.approvalRequired ?? 0} tone={s?.approvalRequired ? "warn" : "ok"} />
          <Stat label="Pre-approved rules" value={s?.preApprovedRules ?? 0} tone="ok" />
          <Stat label="Escalation triggers" value={s?.escalationTriggers ?? 0} />
          <Stat label="Open violations" value={s?.openViolations ?? 0} tone={s?.openViolations ? "bad" : "ok"} />
          <Stat label="Capability gaps" value={s?.capabilityGaps ?? 0} tone={s?.capabilityGaps ? "warn" : "ok"} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Governance posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">• {w}</div>))
              : <p className="text-muted-foreground">All agents have capabilities, escalation triggers and clean violation log.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="No autonomous external action" tone="info" />
              <TagBadge label="No customer contact without approval" tone="info" />
              <TagBadge label="Boundary violations → audit + work item" tone="info" />
              <TagBadge label="Human handoff required on failure" tone="info" />
            </div>
          </CardContent>
        </Card>
      </AcrLayout>
    </FounderLayout>
  );
}