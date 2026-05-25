import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, STATUS_TONE, fmtMoney } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { gapStatus, pctElapsed, recommendedAction } from "@/lib/salesTargetMath";

export default function Gaps() {
  const sb: any = supabase as any;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = useQuery({
    queryKey: ["st-gaps"],
    queryFn: async () => {
      const [targets, activity, closes] = await Promise.all([
        sb.from("sales_revenue_targets").select("*").eq("active", true).lte("target_start_date", today).gte("target_end_date", today),
        sb.from("sales_activity_targets").select("*"),
        sb.from("customer_sales_close_actions").select("id,action_status,estimated_pipeline_value,created_at"),
      ].map((p: any) => p.catch(() => ({ data: [] }))));
      return { targets: targets.data ?? [], activity: activity.data ?? [], closes: closes.data ?? [] };
    },
  });

  const rows = (data?.targets ?? []).map((t: any) => {
    const ap = (data?.activity ?? []).find((a: any) => a.revenue_target_id === t.id);
    const aov = ap?.assumed_average_order_value ?? 500;
    const actual = (data?.closes ?? []).filter((c: any) => c.action_status === "completed").reduce((s: number, c: any) => s + Number(c.estimated_pipeline_value || 0), 0);
    const gs = gapStatus(actual, Number(t.target_revenue_amount || 0), pctElapsed(t.target_start_date, t.target_end_date));
    const daysLeft = Math.max(0, Math.ceil((new Date(t.target_end_date).getTime() - Date.now()) / 86400000));
    const requiredToday = Math.max(0, Math.ceil((gs.gap_amount / Math.max(1, aov)) / Math.max(1, daysLeft)));
    return { t, gs, actual, daysLeft, requiredToday, reco: recommendedAction(gs.status, requiredToday, daysLeft) };
  });

  return (
    <STLayout title="Gaps & Risk" subtitle="Where Liftor is behind, by how much, and what must happen to recover.">
      {rows.length === 0 ? <STEmpty title="No active targets in window" /> : rows.map((r: any) => (
        <STSection key={r.t.id} title={r.t.target_name} description={`${r.daysLeft} day(s) remain · pace ${r.gs.pace_index}x`}
          actions={<Badge variant="outline" className={STATUS_TONE[r.gs.status]}>{r.gs.status}</Badge>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Stat label="Target" value={fmtMoney(Number(r.t.target_revenue_amount), r.t.target_currency)} />
            <Stat label="Actual" value={fmtMoney(r.actual, r.t.target_currency)} />
            <Stat label="Gap" value={fmtMoney(Math.max(0, r.gs.gap_amount), r.t.target_currency)} />
            <Stat label="Sales needed today" value={String(r.requiredToday)} />
          </div>
          <div className="mt-3 p-3 rounded border border-primary/30 bg-primary/5 text-xs">{r.reco}</div>
        </STSection>
      ))}
    </STLayout>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm font-semibold">{value}</div></div>;
}