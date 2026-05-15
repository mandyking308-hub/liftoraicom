import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function KPIOKRPerformancePanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const run = async (confirm = false) => {
    setLoading(true);
    if (confirm) setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("performance-scorecard-run", {
        body: { scorecard_type: "weekly", confirm },
      });
      if (error) throw error;
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  useEffect(() => { run(false); }, []);

  const { data: kpis } = useQuery({
    queryKey: ["business-kpis-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("business_kpis").select("*").order("updated_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const { data: okrs } = useQuery({
    queryKey: ["business-okrs-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("business_okrs").select("*").order("updated_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });
  const { data: scorecards } = useQuery({
    queryKey: ["scorecards-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("performance_scorecards").select("*").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const s = status?.scores ?? {};
  const c = status?.counts ?? {};

  return (
    <Card className="tech-card" id="sec-kpi-okr">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">KPIs · OKRs · Performance</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Group + business performance scorecards across revenue, customer, social, operations and risk. Internal — no external reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">No external send</Badge>
            <Badge variant="outline" className="text-xs">No public dashboard</Badge>
            <Badge variant="outline" className="text-xs">No financial mutation</Badge>
            <Badge variant="outline" className="text-xs">Founder approval required</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Overall" value={s.overall_score ?? "—"} />
          <Stat label="Revenue" value={s.revenue_score ?? "—"} />
          <Stat label="Customer" value={s.customer_score ?? "—"} />
          <Stat label="Social" value={s.social_score ?? "—"} />
          <Stat label="Ops" value={s.operations_score ?? "—"} />
          <Stat label="Risk" value={s.risk_score ?? "—"} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="KPIs" value={c.kpis ?? 0} />
          <Stat label="OKRs" value={c.okrs ?? 0} />
          <Stat label="Underperforming" value={c.underperforming ?? 0} />
          <Stat label="At risk" value={c.at_risk ?? 0} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => run(false)} disabled={loading}>
            {loading && !confirming ? "Scoring…" : "Dry-run scorecard"}
          </Button>
          <Button size="sm" onClick={() => run(true)} disabled={loading}>
            {confirming ? "Saving…" : "Create weekly scorecard"}
          </Button>
        </div>

        {status?.next_actions?.length ? (
          <div className="rounded-md border border-border/60 p-3 text-xs space-y-1">
            <div className="font-medium text-foreground">Next actions</div>
            {status.next_actions.map((a: string, i: number) => (
              <div key={i} className="text-muted-foreground">• {a}</div>
            ))}
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium mb-1">Recent KPIs</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {(kpis ?? []).map((k: any) => (
                <div key={k.id} className="flex justify-between text-xs border border-border/40 rounded px-2 py-1">
                  <span className="truncate">{k.kpi_name} <span className="text-muted-foreground">({k.kpi_category})</span></span>
                  <span className="text-muted-foreground">{k.current_value ?? "—"}/{k.target_value ?? "—"} {k.unit ?? ""}</span>
                </div>
              ))}
              {!kpis?.length && <div className="text-xs text-muted-foreground">No KPIs yet.</div>}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1">Active OKRs</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {(okrs ?? []).map((o: any) => (
                <div key={o.id} className="flex justify-between text-xs border border-border/40 rounded px-2 py-1">
                  <span className="truncate">{o.objective}</span>
                  <span className="text-muted-foreground">{o.progress_score ?? 0}%</span>
                </div>
              ))}
              {!okrs?.length && <div className="text-xs text-muted-foreground">No OKRs yet.</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-1">Recent scorecards</div>
          <div className="space-y-1 max-h-44 overflow-auto">
            {(scorecards ?? []).map((sc: any) => (
              <div key={sc.id} className="flex justify-between text-xs border border-border/40 rounded px-2 py-1">
                <span className="truncate">{sc.scorecard_type} · {sc.scorecard_period_start} → {sc.scorecard_period_end}</span>
                <span className="text-muted-foreground">overall {sc.overall_score ?? "—"}</span>
              </div>
            ))}
            {!scorecards?.length && <div className="text-xs text-muted-foreground">No scorecards yet.</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}