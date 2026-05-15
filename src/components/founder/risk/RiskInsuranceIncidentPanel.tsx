import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '—';

export default function RiskInsuranceIncidentPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["risk-incident-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("risk-incident-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Risk status refreshed."); } finally { setBusy(false); } };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-risk-insurance-incident">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><ShieldAlert size={14} className="text-primary" /> Risk · Insurance · Incident · Continuity Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No external notifications · No claims filed · No regulator filings</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Open risks" value={s.risks_open} />
          <Tile label="High risks" value={s.risks_high} tone={s.risks_high ? 'text-destructive' : ''} />
          <Tile label="Risk reviews overdue" value={s.risks_review_overdue} tone={s.risks_review_overdue ? 'text-yellow-300' : ''} />
          <Tile label="Open incidents" value={s.incidents_open} tone={s.incidents_open ? 'text-yellow-300' : ''} />
          <Tile label="High-severity incidents" value={s.incidents_high_severity} tone={s.incidents_high_severity ? 'text-destructive' : ''} />
          <Tile label="Customer-impact" value={s.customer_impact_incidents} tone={s.customer_impact_incidents ? 'text-destructive' : ''} />
          <Tile label="Data-impact" value={s.data_impact_incidents} tone={s.data_impact_incidents ? 'text-destructive' : ''} />
          <Tile label="Regulatory flags" value={s.regulatory_review_flags} tone={s.regulatory_review_flags ? 'text-destructive' : ''} />
          <Tile label="Insurance policies" value={s.insurance_policies} />
          <Tile label="Renewals (90d)" value={s.insurance_renewals_90d} tone={s.insurance_renewals_90d ? 'text-yellow-300' : ''} />
          <Tile label="Expired open" value={s.insurance_expired_open} tone={s.insurance_expired_open ? 'text-destructive' : ''} />
          <Tile label="BCPs test due (90d)" value={s.bcps_test_due_90d} tone={s.bcps_test_due_90d ? 'text-yellow-300' : ''} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic flex items-start gap-1"><AlertTriangle size={11} className="mt-0.5" />{data.disclaimer}</div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next actions</div>
            <ul className="space-y-1 max-h-56 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label}</span>
                  <span className="text-muted-foreground">{a.severity ?? a.category ?? fmtDate(a.renewal_date ?? a.due)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.high_risks ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">High risks</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.high_risks.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.risk_title}</span>
                    <Badge variant="outline" className="text-[9px]">{r.risk_category}</Badge>
                    {r.impact && <Badge variant="outline" className="text-[9px]">impact: {r.impact}</Badge>}
                  </div>
                  <div className="text-muted-foreground">score: {r.risk_score ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.open_incidents ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Open incidents</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.open_incidents.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{i.incident_title}</span>
                    <Badge variant="outline" className="text-[9px]">{i.incident_type}</Badge>
                    <Badge variant="outline" className="text-[9px]">sev: {i.severity}</Badge>
                    {i.customer_impact && <Badge variant="outline" className="text-[9px] text-destructive">customer</Badge>}
                    {i.data_impact && <Badge variant="outline" className="text-[9px] text-destructive">data</Badge>}
                  </div>
                  <div className="text-muted-foreground">{fmtDate(i.detected_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}