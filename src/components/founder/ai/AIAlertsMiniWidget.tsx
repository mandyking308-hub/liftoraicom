import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Siren, ShieldAlert, PauseCircle, PoundSterling } from "lucide-react";

export default function AIAlertsMiniWidget() {
  const q = useQuery({
    queryKey: ["ai-alerts-mini"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [openAll, crit, high, pauseAgents, overBudget] = await Promise.all([
        supabase.from("ai_cost_alerts").select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase.from("ai_cost_alerts").select("id", { count: "exact", head: true })
          .eq("status", "open").eq("severity", "critical"),
        supabase.from("ai_cost_alerts").select("id", { count: "exact", head: true })
          .eq("status", "open").eq("severity", "high"),
        supabase.from("ai_cost_alerts").select("agent_id")
          .is("resolved_at", null).gte("created_at", since24h)
          .in("alert_type", [
            "agent_spend_cap_exceeded", "excessive_retries", "repeated_failed_outputs",
            "prompt_loop_detected", "high_risk_without_approval",
          ]),
        supabase.from("ai_cost_alerts").select("business_id")
          .is("resolved_at", null)
          .in("alert_type", [
            "daily_budget_exceeded", "weekly_budget_exceeded",
            "monthly_budget_exceeded", "campaign_budget_exceeded", "budget_exceeded",
          ]),
      ]);
      const pausedAgentSet = new Set(
        (pauseAgents.data ?? []).map((r: any) => r.agent_id).filter(Boolean),
      );
      const overBudgetSet = new Set(
        (overBudget.data ?? []).map((r: any) => r.business_id).filter(Boolean),
      );
      return {
        open: openAll.count ?? 0,
        critical: crit.count ?? 0,
        high: high.count ?? 0,
        pausedAgents: pausedAgentSet.size,
        overBudget: overBudgetSet.size,
      };
    },
    refetchInterval: 60_000,
  });

  const d = q.data;
  return (
    <Card className="tech-card">
      <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Siren className="h-5 w-5 text-primary" />
          <div>
            <Link to="/founder/ai-cost/alerts" className="font-medium hover:underline">
              AI Cost Alerts
            </Link>
            <div className="text-xs text-muted-foreground">Stop-loss & budget signals</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
            Critical {d?.critical ?? 0}
          </Badge>
          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">
            High {d?.high ?? 0}
          </Badge>
          <Badge variant="outline">Open {d?.open ?? 0}</Badge>
          <Badge variant="outline" className="gap-1">
            <PauseCircle className="h-3 w-3" /> Agents flagged {d?.pausedAgents ?? 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <PoundSterling className="h-3 w-3" /> Over budget {d?.overBudget ?? 0}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}