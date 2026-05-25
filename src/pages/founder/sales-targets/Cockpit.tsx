import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, STATUS_TONE, fmtMoney } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Phone, ClipboardCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { reverseEngineerActivity, gapStatus, recommendedAction, pctElapsed, daysBetween } from "@/lib/salesTargetMath";

export default function SalesTargetsCockpit() {
  const sb: any = supabase as any;

  const { data } = useQuery({
    queryKey: ["st-cockpit"],
    refetchInterval: 60000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [targets, activity, progress, closes, convos, calls, follow] = await Promise.all([
        sb.from("sales_revenue_targets").select("*").eq("active", true).lte("target_start_date", today).gte("target_end_date", today).order("created_at", { ascending: false }),
        sb.from("sales_activity_targets").select("*"),
        sb.from("sales_target_progress").select("*").order("created_at", { ascending: false }),
        sb.from("customer_sales_close_actions").select("id,action_status,approval_status,estimated_pipeline_value,created_at"),
        sb.from("customer_sales_conversations").select("id,call_outcome,close_probability,conversation_status,started_at"),
        sb.from("customer_sales_call_logs").select("id,started_at"),
        sb.from("customer_sales_follow_up_tasks").select("id,task_status,approval_status,due_at"),
      ].map((p: any) => p.catch(() => ({ data: [] }))));
      return {
        targets: targets.data ?? [],
        activity: activity.data ?? [],
        progress: progress.data ?? [],
        closes: closes.data ?? [],
        convos: convos.data ?? [],
        calls: calls.data ?? [],
        follow: follow.data ?? [],
      };
    },
  });

  const rows = useMemo(() => {
    const t = data?.targets ?? [];
    return t.map((tg: any) => {
      const ap = (data?.activity ?? []).find((a: any) => a.revenue_target_id === tg.id);
      const assumptions = ap ?? {
        assumed_lead_to_call_rate: 0.3,
        assumed_call_to_proposal_rate: 0.4,
        assumed_proposal_to_close_rate: 0.2,
        assumed_average_order_value: 500,
      };
      const req = reverseEngineerActivity(Number(tg.target_revenue_amount || 0), assumptions, tg.target_start_date, tg.target_end_date);
      const periodCloses = (data?.closes ?? []).filter((c: any) => c.action_status === "completed");
      const actualRevenue = periodCloses.reduce((s: number, c: any) => s + Number(c.estimated_pipeline_value || 0), 0);
      const actualPipeline = (data?.closes ?? []).reduce((s: number, c: any) => s + Number(c.estimated_pipeline_value || 0), 0);
      const pe = pctElapsed(tg.target_start_date, tg.target_end_date);
      const gs = gapStatus(actualRevenue, Number(tg.target_revenue_amount || 0), pe);
      const days = daysBetween(tg.target_start_date, tg.target_end_date);
      const daysLeft = Math.max(0, Math.ceil((new Date(tg.target_end_date).getTime() - Date.now()) / 86400000));
      const requiredToday = Math.max(0, Math.ceil((gs.gap_amount / Math.max(1, assumptions.assumed_average_order_value)) / Math.max(1, daysLeft)));
      const reco = recommendedAction(gs.status, requiredToday, daysLeft);
      return { target: tg, assumptions, req, actualRevenue, actualPipeline, gs, daysLeft, requiredToday, reco, days };
    });
  }, [data]);

  const hotSignals = (data?.convos ?? []).filter((c: any) => Number(c.close_probability) >= 0.7).length;
  const readyToBuy = (data?.convos ?? []).filter((c: any) => c.call_outcome === "ready_to_buy").length;
  const overdueFollowups = (data?.follow ?? []).filter((f: any) => f.due_at && new Date(f.due_at) < new Date() && f.task_status !== "done").length;
  const closesAwaiting = (data?.closes ?? []).filter((c: any) => c.action_status === "approval_required" || c.approval_status === "pending").length;

  return (
    <STLayout
      title="Sales Target Cockpit"
      subtitle="Reverse-engineered activity, live progress, gaps and the next action. Internal planning is live; external customer contact stays approval-gated."
      actions={<Button asChild size="sm" variant="outline"><Link to="/founder/sales-targets/business">Set a target <ArrowRight size={14} className="ml-1" /></Link></Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KPI label="Hot buying signals" value={hotSignals} icon={Flame} to="/founder/customer-sales/conversations" />
        <KPI label="Ready to buy" value={readyToBuy} icon={Phone} to="/founder/customer-sales/conversations" />
        <KPI label="Overdue follow-ups" value={overdueFollowups} icon={AlertTriangle} to="/founder/customer-sales/follow-up" />
        <KPI label="Closes awaiting approval" value={closesAwaiting} icon={ClipboardCheck} to="/founder/customer-sales/close-engine" />
      </div>

      {rows.length === 0 ? (
        <STEmpty title="No active sales targets" hint="Add a revenue target in Business Targets to reverse-engineer the activity plan." />
      ) : rows.map((r: any) => (
        <STSection
          key={r.target.id}
          title={`${r.target.target_name} · ${r.target.target_period}`}
          description={`${r.target.target_start_date} → ${r.target.target_end_date} · ${r.daysLeft} day(s) left · ${r.target.target_type}`}
          actions={<Badge variant="outline" className={STATUS_TONE[r.gs.status]}>{r.gs.status}</Badge>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Stat label="Target" value={fmtMoney(Number(r.target.target_revenue_amount), r.target.target_currency)} />
            <Stat label="Actual revenue" value={fmtMoney(r.actualRevenue, r.target.target_currency)} />
            <Stat label="Pipeline" value={fmtMoney(r.actualPipeline, r.target.target_currency)} />
            <Stat label="Gap" value={fmtMoney(Math.max(0, r.gs.gap_amount), r.target.target_currency)} tone={r.gs.gap_amount > 0 ? "warn" : "good"} />
            <Stat label="Required closes" value={String(r.req.required_closes)} />
            <Stat label="Required proposals" value={String(r.req.required_proposals)} />
            <Stat label="Required calls" value={String(r.req.required_calls)} />
            <Stat label="Required leads" value={String(r.req.required_leads)} />
            <Stat label="Daily calls" value={String(r.req.daily_calls)} />
            <Stat label="Daily proposals" value={String(r.req.daily_proposals)} />
            <Stat label="Pace index" value={`${r.gs.pace_index}x`} tone={r.gs.pace_index >= 0.95 ? "good" : r.gs.pace_index >= 0.8 ? "warn" : "danger"} />
            <Stat label="Sales needed today" value={String(r.requiredToday)} tone={r.requiredToday > 0 ? "warn" : "good"} />
          </div>
          <div className="mt-3 p-3 rounded border border-primary/30 bg-primary/5 text-xs flex items-start gap-2">
            <TrendingUp size={14} className="text-primary mt-0.5" />
            <div>
              <div className="font-medium text-foreground">Sales Manager Agent recommendation</div>
              <div className="text-muted-foreground mt-1">{r.reco}</div>
            </div>
          </div>
        </STSection>
      ))}
    </STLayout>
  );
}

function KPI({ label, value, icon: Icon, to }: any) {
  return (
    <Card className="tech-card">
      <CardContent className="py-3 px-3">
        <Link to={to} className="block">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
            <Icon size={14} className="text-primary" />
          </div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "danger" }) {
  const t = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-300" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded border border-border/50 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold ${t}`}>{value}</div>
    </div>
  );
}