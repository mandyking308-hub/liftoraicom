import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

type Step = {
  step_key: string; step_label: string; step_order: number; status: string; count: number;
  blocker: string | null; next_action: string | null; route: string | null; owner_agent_key: string | null;
  external_action_risk: boolean; founder_approval_required: boolean;
};

export default function CustomerJourneyPositionPanel({ businessId }: { businessId?: string | null }) {
  const { data } = useQuery({
    queryKey: ['journey-position', businessId ?? null],
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
  const strongest = [...steps].filter(s => s.status === 'active').sort((a,b) => b.count - a.count)[0];
  const bottleneck = steps.find(s => s.status === 'blocked' || s.status === 'no_data');
  const nextApproval = steps.find(s => s.founder_approval_required && (s.status === 'no_data' || s.status === 'partial'));
  const nextRevenue = steps.find(s => ['proposal_ready','deal_ready','invoice_ready','invoice_sent_or_paid'].includes(s.step_key) && s.status !== 'active');
  const nextGate = steps.find(s => s.external_action_risk && s.status !== 'active');

  const Row = ({ label, step }: { label: string; step?: Step }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {step ? (
        <Link to={step.route ?? '#'} className="text-xs text-primary hover:underline">
          {step.step_label}
        </Link>
      ) : <span className="text-xs text-muted-foreground">—</span>}
    </div>
  );

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Compass size={14} className="text-primary" /> Where am I in the customer journey?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <Row label="Current strongest stage" step={strongest} />
        <Row label="Next bottleneck" step={bottleneck} />
        <Row label="Next founder approval" step={nextApproval} />
        <Row label="Next revenue step" step={nextRevenue} />
        <Row label="Next blocked external gate" step={nextGate} />
      </CardContent>
    </Card>
  );
}