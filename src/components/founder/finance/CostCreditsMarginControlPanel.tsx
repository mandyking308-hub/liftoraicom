import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '—';
const money = (n: any, cur = 'GBP') => n == null ? '—' : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function CostCreditsMarginControlPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["cost-margin-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cost-margin-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Cost & margin refreshed."); } finally { setBusy(false); } };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-cost-credits-margin">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Coins size={14} className="text-primary" /> Cost · Credits · API Spend · Margin Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-spend · No paid API calls · No subscription changes</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Active cost lines" value={s.active_cost_lines} />
          <Tile label="Monthly recurring" value={money(s.monthly_recurring_total)} />
          <Tile label="Billing due 30d" value={s.billing_due_30d} tone={s.billing_due_30d ? 'text-yellow-300' : ''} />
          <Tile label="Billing overdue" value={s.billing_overdue} tone={s.billing_overdue ? 'text-destructive' : ''} />
          <Tile label="Apollo credits 30d" value={s.apollo_credits_30d} />
          <Tile label="Smartlead 30d" value={money(s.smartlead_cost_30d)} />
          <Tile label="AI/API 30d" value={money(s.ai_cost_30d)} />
          <Tile label="Usage est. 30d" value={money(s.usage_estimated_cost_30d)} />
          <Tile label="Businesses tracked" value={s.businesses_with_margin} />
          <Tile label="Negative margins" value={s.negative_margins} tone={s.negative_margins ? 'text-destructive' : ''} />
          <Tile label="Low margins" value={s.low_margins} tone={s.low_margins ? 'text-yellow-300' : ''} />
          <Tile label="Margin risk flags" value={s.margin_risk_flags} tone={s.margin_risk_flags ? 'text-yellow-300' : ''} />
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
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label} {a.vendor ? <span className="text-muted-foreground">· {a.vendor}</span> : null}</span>
                  <span className="text-muted-foreground">{a.due ? fmtDate(a.due) : a.monthly != null ? money(a.monthly) : a.gm != null ? `gm: ${a.gm}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.by_category ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Spend by category (monthly)</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {data.by_category.map((c: any) => (
                  <div key={c.category} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                    <span>{c.category}</span><span className="text-muted-foreground">{money(c.monthly)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.by_vendor ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Spend by vendor (monthly)</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {data.by_vendor.map((v: any) => (
                  <div key={v.vendor} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                    <span>{v.vendor}</span><span className="text-muted-foreground">{money(v.monthly)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.usage_by_provider ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Usage by provider (30d)</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {data.usage_by_provider.map((p: any) => (
                  <div key={p.provider} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                    <span>{p.provider}</span>
                    <span className="text-muted-foreground">{p.credits ? `${p.credits} cr · ` : ''}{money(p.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.by_business ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Spend by business (monthly)</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {data.by_business.map((b: any) => (
                  <div key={b.business_id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                    <span>{b.business_name}</span><span className="text-muted-foreground">{money(b.monthly)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(data?.billing_due_30d ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next billing (30d)</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.billing_due_30d.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{c.cost_name}</span>
                    <Badge variant="outline" className="text-[9px]">{c.cost_category}</Badge>
                    {c.vendor_name && <span className="text-muted-foreground">{c.vendor_name}</span>}
                  </div>
                  <div className="text-muted-foreground">{money(c.amount, c.currency)} · {fmtDate(c.next_billing_date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.latest_margins ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Latest margin snapshots</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.latest_margins.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{m.business_name ?? m.business_id?.slice(0,8)}</span>
                    <span className="text-muted-foreground">{fmtDate(m.period_start)} → {fmtDate(m.period_end)}</span>
                  </div>
                  <div className={`text-muted-foreground ${Number(m.estimated_gross_margin ?? 0) < 0 ? 'text-destructive' : ''}`}>rev {money(m.revenue)} · gm {money(m.estimated_gross_margin)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
