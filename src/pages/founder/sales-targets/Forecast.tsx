import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, STATUS_TONE, fmtMoney } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { pctElapsed } from "@/lib/salesTargetMath";

export default function Forecast() {
  const sb: any = supabase as any;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = useQuery({
    queryKey: ["st-forecast"],
    queryFn: async () => {
      const [targets, closes] = await Promise.all([
        sb.from("sales_revenue_targets").select("*").eq("active", true).lte("target_start_date", today).gte("target_end_date", today),
        sb.from("customer_sales_close_actions").select("id,action_status,estimated_pipeline_value,close_probability,created_at"),
      ].map((p: any) => p.catch(() => ({ data: [] }))));
      return { targets: targets.data ?? [], closes: closes.data ?? [] };
    },
  });

  const rows = (data?.targets ?? []).map((t: any) => {
    const closes = data?.closes ?? [];
    const won = closes.filter((c: any) => c.action_status === "completed").reduce((s: number, c: any) => s + Number(c.estimated_pipeline_value || 0), 0);
    const weightedPipeline = closes.filter((c: any) => c.action_status !== "completed").reduce((s: number, c: any) => s + Number(c.estimated_pipeline_value || 0) * Number(c.close_probability ?? 0.3), 0);
    const pe = pctElapsed(t.target_start_date, t.target_end_date);
    const runRateProjection = pe > 0 ? won / pe : won;
    const projected = Math.max(runRateProjection, won + weightedPipeline);
    const target = Number(t.target_revenue_amount || 0);
    const status = projected >= target ? "exceeded" : projected >= target * 0.95 ? "on_track" : projected >= target * 0.8 ? "watch" : projected >= target * 0.6 ? "behind" : "critical";
    return { t, won, weightedPipeline, runRateProjection, projected, target, status };
  });

  return (
    <STLayout title="Forecast" subtitle="Projected end-of-period result using run-rate and weighted pipeline. Internal projection only.">
      {rows.length === 0 ? <STEmpty title="No active targets" /> : rows.map((r: any) => (
        <STSection key={r.t.id} title={r.t.target_name} description={`${r.t.target_start_date} → ${r.t.target_end_date}`}
          actions={<Badge variant="outline" className={STATUS_TONE[r.status]}>{r.status}</Badge>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Stat label="Target" value={fmtMoney(r.target, r.t.target_currency)} />
            <Stat label="Won" value={fmtMoney(r.won, r.t.target_currency)} />
            <Stat label="Weighted pipeline" value={fmtMoney(r.weightedPipeline, r.t.target_currency)} />
            <Stat label="Projected end" value={fmtMoney(r.projected, r.t.target_currency)} />
          </div>
        </STSection>
      ))}
    </STLayout>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm font-semibold">{value}</div></div>;
}