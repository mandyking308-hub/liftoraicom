import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";

type AgentRow = {
  agent_key: string;
  agent_name: string;
  agent_category: string;
  primary_module: string | null;
  risk_level: string;
  founder_approval_required: boolean;
  auto_action_allowed: boolean;
  can_send_email: boolean;
  guardrails: Record<string, unknown>;
  status: string;
  health: string;
  no_send_status: boolean;
  readiness: "ready" | "partial" | "blocked" | "not_configured";
  blockers: string[];
  allowed_actions: string[];
  forbidden_actions: string[];
};

const readinessClass: Record<string, string> = {
  ready: "bg-green-500/15 text-green-400 border-green-500/30",
  partial: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  not_configured: "bg-muted text-muted-foreground border-border",
};

const riskClass: Record<string, string> = {
  low: "bg-green-500/10 text-green-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  high: "bg-red-500/10 text-red-400",
};

export default function AIAgentOperatingModelPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ai-agent-operating-model"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-agent-status-preview", { body: {} });
      if (error) throw error;
      return data as { ok: boolean; crm_ready: boolean; outbound_configured: boolean; agents: AgentRow[] };
    },
  });

  const agents = data?.agents ?? [];

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot size={18} className="text-primary" /> AI Agent Operating Model
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Apollo · No-Smartlead-POST
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading agent operating model…</p>}
        {!isLoading && agents.length === 0 && (
          <p className="text-sm text-muted-foreground">No agents registered.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {agents.map((a) => (
            <div key={a.agent_key} className="rounded-md border border-border/50 p-3 bg-card/40 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{a.agent_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.agent_category} · {a.primary_module ?? "—"} · {a.agent_key}
                  </p>
                </div>
                <Badge className={`${readinessClass[a.readiness]} text-[10px] uppercase`}>{a.readiness}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <Badge className={`${riskClass[a.risk_level] ?? riskClass.medium}`}>risk: {a.risk_level}</Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">status: {a.status}</Badge>
                {a.no_send_status && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">no-send</Badge>
                )}
                {a.founder_approval_required && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    founder approval
                  </Badge>
                )}
                {!a.auto_action_allowed && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">auto-action off</Badge>
                )}
              </div>
              {a.blockers.length > 0 && (
                <div className="flex items-start gap-1 text-[11px] text-red-400">
                  <ShieldAlert size={12} className="mt-0.5" />
                  <span>Blockers: {a.blockers.join(", ")}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-muted-foreground mb-0.5">Allowed</p>
                  <div className="flex flex-wrap gap-0.5">
                    {a.allowed_actions.length === 0 && <span className="text-muted-foreground">—</span>}
                    {a.allowed_actions.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">{p}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Forbidden</p>
                  <div className="flex flex-wrap gap-0.5">
                    {a.forbidden_actions.length === 0 && <span className="text-muted-foreground">—</span>}
                    {a.forbidden_actions.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {data && (
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/30 flex flex-wrap gap-3">
            <span>CRM ready: {data.crm_ready ? "yes" : "no"}</span>
            <span>Outbound configured: {data.outbound_configured ? "yes" : "no"}</span>
            <span>Next: enable agents one-by-one via founder approval phrase only.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}