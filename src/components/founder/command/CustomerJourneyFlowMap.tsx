import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, Workflow } from "lucide-react";

type Step = {
  step_key: string; step_label: string; step_order: number; journey_stage_group: string;
  owner_agent_key: string | null; route: string | null; command_centre_anchor: string | null;
  external_action_risk: boolean; founder_approval_required: boolean;
  status: string; count: number; blocker: string | null; next_action: string | null;
};

const toneFor = (status: string) => {
  if (status === 'active') return 'border-green-500/40 text-green-300 bg-green-500/10';
  if (status === 'partial') return 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10';
  if (status === 'blocked') return 'border-destructive/40 text-destructive bg-destructive/10';
  if (status === 'no_data') return 'border-border/50 text-muted-foreground bg-secondary/40';
  return 'border-border/50 text-muted-foreground bg-secondary/30';
};

export default function CustomerJourneyFlowMap({ businessId }: { businessId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-journey-flow-status', businessId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('customer-journey-flow-status', {
        body: { business_id: businessId ?? null },
      });
      if (error) throw error;
      return data as { steps: Step[] };
    },
    staleTime: 30_000,
  });

  const steps = data?.steps ?? [];

  return (
    <Card className="bg-card border-border/50" id="sec-customer-journey">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Workflow size={14} className="text-primary" /> Customer Journey Flow</span>
          <span className="text-[10px] text-muted-foreground">Lead → CRM → Outreach → Reply → AI → Approval → Proposal → Demo → Deal → Invoice → Supplier → Learning</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading journey…</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {steps.map((s) => (
              <a
                key={s.step_key}
                href={s.command_centre_anchor ? `#${s.command_centre_anchor}` : '#'}
                className={`min-w-[180px] shrink-0 rounded-lg border p-3 text-xs hover:opacity-80 transition ${toneFor(s.status)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] opacity-70">#{s.step_order}</span>
                  {s.external_action_risk && <Lock size={10} className="opacity-70" />}
                </div>
                <div className="font-medium leading-tight mb-1">{s.step_label}</div>
                <div className="flex items-center justify-between text-[10px] opacity-80">
                  <span>{s.count} items</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{s.status}</Badge>
                </div>
                {s.next_action && <div className="text-[10px] mt-1 opacity-70">→ {s.next_action}</div>}
                {s.route && (
                  <Link to={s.route} className="text-[10px] mt-1 inline-flex items-center gap-1 underline opacity-80">
                    Open page <ArrowRight size={8} />
                  </Link>
                )}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}