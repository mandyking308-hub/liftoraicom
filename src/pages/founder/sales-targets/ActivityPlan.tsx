import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { reverseEngineerActivity } from "@/lib/salesTargetMath";

export default function ActivityPlan() {
  const sb: any = supabase as any;
  const { data: targets = [] } = useQuery({
    queryKey: ["st-activity"],
    queryFn: async () => (await sb.from("sales_revenue_targets").select("*, sales_activity_targets(*)").eq("active", true)).data ?? [],
  });

  return (
    <STLayout title="Activity Plan" subtitle="The exact daily/weekly activity required to hit each active revenue target.">
      {targets.length === 0 ? <STEmpty title="No active targets" hint="Set a target in Business Targets to populate this plan." /> :
        targets.map((t: any) => {
          const ap = t.sales_activity_targets?.[0];
          const a = ap ?? { assumed_lead_to_call_rate: 0.3, assumed_call_to_proposal_rate: 0.4, assumed_proposal_to_close_rate: 0.2, assumed_average_order_value: 500 };
          const req = reverseEngineerActivity(Number(t.target_revenue_amount || 0), a, t.target_start_date, t.target_end_date);
          return (
            <STSection key={t.id} title={t.target_name} description={`${t.target_period} · ${t.target_start_date} → ${t.target_end_date}`}
              actions={<Badge variant="outline">AOV {a.assumed_average_order_value}</Badge>}>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left p-2">Stage</th><th className="text-right p-2">Total</th><th className="text-right p-2">Per week</th><th className="text-right p-2">Per day</th><th className="text-left p-2">Owner agent</th></tr>
                </thead>
                <tbody>
                  <Row stage="Leads" total={req.required_leads} weekly={Math.ceil(req.required_leads / Math.max(1, req.days_in_period / 7))} daily={Math.ceil(req.required_leads / req.days_in_period)} owner="Apollo Qualifier" />
                  <Row stage="Calls" total={req.required_calls} weekly={req.weekly_calls} daily={req.daily_calls} owner="Outbound Call Agent" />
                  <Row stage="Conversations" total={req.required_conversations} weekly={req.weekly_calls} daily={req.daily_calls} owner="Sales Conversation Agent" />
                  <Row stage="Proposals" total={req.required_proposals} weekly={req.weekly_proposals} daily={req.daily_proposals} owner="Proposal Generator" />
                  <Row stage="Follow-ups" total={req.required_followups} weekly={Math.ceil(req.required_followups / Math.max(1, req.days_in_period / 7))} daily={Math.ceil(req.required_followups / req.days_in_period)} owner="Follow-Up Agent" />
                  <Row stage="Closes" total={req.required_closes} weekly={req.weekly_closes} daily={req.daily_closes} owner="Close Preparation Agent" highlight />
                  <Row stage="Upgrades" total={req.required_upgrades} weekly={Math.ceil(req.required_upgrades / Math.max(1, req.days_in_period / 7))} daily={Math.ceil(req.required_upgrades / req.days_in_period)} owner="Customer Success" />
                </tbody>
              </table>
            </STSection>
          );
        })}
    </STLayout>
  );
}

function Row({ stage, total, weekly, daily, owner, highlight }: any) {
  return (
    <tr className={`border-t border-border/40 ${highlight ? "bg-primary/5" : ""}`}>
      <td className="p-2 font-medium">{stage}</td>
      <td className="p-2 text-right">{total}</td>
      <td className="p-2 text-right">{weekly}</td>
      <td className="p-2 text-right">{daily}</td>
      <td className="p-2 text-muted-foreground">{owner}</td>
    </tr>
  );
}