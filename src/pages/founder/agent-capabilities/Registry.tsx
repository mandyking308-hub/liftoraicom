import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AcrLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAgents, listCapabilities, listModulePermissions } from "@/lib/agentCapabilityEngine";

export default function AgentRegistryPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["acr-agents"], queryFn: listAgents });
  const { data: caps = [] } = useQuery({ queryKey: ["acr-caps"], queryFn: listCapabilities });
  const { data: mods = [] } = useQuery({ queryKey: ["acr-mods"], queryFn: listModulePermissions });
  return (
    <FounderLayout>
      <AcrLayout title="Agent Registry" subtitle="Every registered agent with scope, model tier, cost cap, required context, capabilities and module permissions.">
        <div className="space-y-3">
          {agents.map(a => {
            const c = caps.filter(x => x.agent_id === a.id);
            const m = mods.filter(x => x.agent_id === a.id);
            return (
              <Card key={a.id} className="tech-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {a.agent_name}
                    <TagBadge label={a.status} tone={a.status === "active" ? "ok" : "muted"} />
                    <TagBadge label={a.allowed_model_tier} tone="info" />
                    <span className="text-[10px] text-muted-foreground ml-auto">max ${a.max_ai_cost_usd.toFixed(2)}/run</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  {a.description && <p className="text-muted-foreground">{a.description}</p>}
                  <div className="grid md:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Module scope</p>
                      <div className="flex flex-wrap gap-1">{a.module_scope.map(s => <TagBadge key={s} label={s} tone="info" />)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Required context</p>
                      <div className="flex flex-wrap gap-1">{a.required_context_fields.map(s => <TagBadge key={s} label={s} />)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Failure behaviour</p>
                      <TagBadge label={a.failure_behaviour} tone="warn" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {c.map(x => <TagBadge key={x.id} label={`${x.capability} · ${x.mode}`} tone={x.mode === "autonomous" ? "ok" : "warn"} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Module permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {m.map(x => <TagBadge key={x.id} label={`${x.module}:${x.permission}`} tone={x.permission === "write" ? "warn" : "muted"} />)}
                    </div>
                  </div>
                  {a.human_handoff_rule && <p className="text-[11px] text-yellow-300">Handoff: {a.human_handoff_rule}</p>}
                </CardContent>
              </Card>
            );
          })}
          {agents.length === 0 && <p className="text-xs text-muted-foreground">No agents registered yet.</p>}
        </div>
      </AcrLayout>
    </FounderLayout>
  );
}