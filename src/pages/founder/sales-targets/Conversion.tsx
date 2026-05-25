import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection } from "./_shared";

export default function Conversion() {
  const sb: any = supabase as any;
  const { data } = useQuery({
    queryKey: ["st-conversion"],
    queryFn: async () => {
      const [convos, calls, closes, proposals, leads] = await Promise.all([
        sb.from("customer_sales_conversations").select("id,call_outcome,close_probability,started_at"),
        sb.from("customer_sales_call_logs").select("id,started_at"),
        sb.from("customer_sales_close_actions").select("id,action_status,estimated_pipeline_value"),
        sb.from("customer_sales_close_actions").select("id").eq("action_type", "proposal"),
        sb.from("leads").select("id"),
      ].map((p: any) => p.catch(() => ({ data: [] }))));
      return {
        convos: convos.data ?? [], calls: calls.data ?? [], closes: closes.data ?? [],
        proposals: proposals.data ?? [], leads: leads.data ?? [],
      };
    },
  });

  const c = data ?? { convos: [], calls: [], closes: [], proposals: [], leads: [] };
  const wonCloses = c.closes.filter((x: any) => x.action_status === "completed").length;
  const leadToCall = c.leads.length ? +(c.calls.length / c.leads.length).toFixed(2) : 0;
  const callToProp = c.calls.length ? +(c.proposals.length / c.calls.length).toFixed(2) : 0;
  const propToClose = c.proposals.length ? +(wonCloses / c.proposals.length).toFixed(2) : 0;
  const avgClose = wonCloses ? +(c.closes.filter((x: any) => x.action_status === "completed").reduce((s: number, x: any) => s + Number(x.estimated_pipeline_value || 0), 0) / wonCloses).toFixed(0) : 0;

  return (
    <STLayout title="Conversion Intelligence" subtitle="Live funnel rates. These feed the Activity Plan reverse-engineering math.">
      <STSection title="Funnel rates (all time)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Stat label="Lead → call" value={`${(leadToCall * 100).toFixed(0)}%`} />
          <Stat label="Call → proposal" value={`${(callToProp * 100).toFixed(0)}%`} />
          <Stat label="Proposal → close" value={`${(propToClose * 100).toFixed(0)}%`} />
          <Stat label="Avg order value" value={String(avgClose)} />
          <Stat label="Leads" value={String(c.leads.length)} />
          <Stat label="Calls" value={String(c.calls.length)} />
          <Stat label="Proposals" value={String(c.proposals.length)} />
          <Stat label="Closes won" value={String(wonCloses)} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Tip: feed these into the Business Targets assumptions to keep the reverse-engineered plan accurate.
        </p>
      </STSection>
    </STLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-border/50 p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-lg font-semibold">{value}</div></div>;
}