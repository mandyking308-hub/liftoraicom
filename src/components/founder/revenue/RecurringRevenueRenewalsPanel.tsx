import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmt = (d: any) => d ? String(d).slice(0, 10) : '—';
const money = (n: any, cur = 'GBP') => n == null ? '—' : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function RecurringRevenueRenewalsPanel() {
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [proposal, setProposal] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["recurring-revenue-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recurring-revenue-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Recurring revenue refreshed."); } finally { setBusy(false); } };

  const dryRun = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("renewal-recommendation-run", { body: {} });
      if (error) throw error;
      setProposal(data);
      toast.success(`Dry-run · ${data?.proposed_count ?? 0} renewal reviews proposed (no tasks created).`);
    } catch (e: any) { toast.error(e.message ?? "Run failed"); }
    finally { setRunning(false); }
  };

  const create = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("renewal-recommendation-run", { body: { confirm: "CREATE RENEWAL REVIEWS" } });
      if (error) throw error;
      setProposal(data);
      toast.success(`${data?.created_count ?? 0} renewal review tasks created (founder approval required before any action).`);
      await refetch();
    } catch (e: any) { toast.error(e.message ?? "Create failed"); }
    finally { setRunning(false); }
  };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? 0}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-recurring-revenue">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Repeat size={14} className="text-primary" /> Subscriptions · Renewals · Churn Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-charge · No auto-cancel · No auto-email · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={dryRun} disabled={running}><Sparkles size={12} className="mr-1" />Dry-run</Button>
            <Button size="sm" variant="outline" onClick={create} disabled={running}>Create reviews</Button>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="MRR" value={money(s.mrr)} />
          <Tile label="ARR" value={money(s.arr)} />
          <Tile label="Active subs" value={s.active_subscriptions} />
          <Tile label="Total subs" value={s.total_subscriptions} />
          <Tile label="Renewals due 60d" value={s.renewals_due_60d} tone={s.renewals_due_60d ? 'text-yellow-300' : ''} />
          <Tile label="Renewals overdue" value={s.renewals_overdue} tone={s.renewals_overdue ? 'text-destructive' : ''} />
          <Tile label="Failed payments" value={s.failed_payments} tone={s.failed_payments ? 'text-destructive' : ''} />
          <Tile label="High churn risk" value={s.high_churn_risk} tone={s.high_churn_risk ? 'text-destructive' : ''} />
          <Tile label="Open reviews" value={s.open_review_tasks} />
          <Tile label="Upgrade ops" value={s.upgrade_opportunities} />
          <Tile label="Downgrade risks" value={s.downgrade_risks} tone={s.downgrade_risks ? 'text-yellow-300' : ''} />
          <Tile label="Cancel risks" value={s.cancellation_risks} tone={s.cancellation_risks ? 'text-yellow-300' : ''} />
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
                  <span className="text-muted-foreground">{a.due ? fmt(a.due) : a.risk ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.renewals_due_60d ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Renewals due (next 60d)</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.renewals_due_60d.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><span className="font-medium">{s.subscription_name}</span>{s.business_name && <Badge variant="outline" className="text-[9px]">{s.business_name}</Badge>}</span>
                    <span className="text-muted-foreground">{money(s.amount, s.currency)} · {fmt(s.renewal_date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.failed_payments ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Failed payments (review only)</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.failed_payments.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="font-medium">{s.subscription_name}</span>
                    <span className="text-destructive">{s.payment_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.high_churn ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">High churn risk</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.high_churn.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="font-medium">{s.subscription_name}</span>
                    <span className="text-destructive">{s.churn_risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.open_tasks ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Open customer-success reviews</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.open_tasks.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="text-[9px]">{t.review_type}</Badge>{t.recommendation?.slice(0, 80) ?? '—'}</span>
                    <span className="text-muted-foreground">{t.due_at ? fmt(t.due_at) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {proposal && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2 flex items-center justify-between">
              <span>Recommendation run · {proposal.mode} · proposed {proposal.proposed_count} · created {proposal.created_count}</span>
              <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>Close</Button>
            </div>
            <div className="text-[11px] text-muted-foreground italic mb-2">{proposal.disclaimer}</div>
            <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
              {(proposal.proposed ?? []).map((p: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="text-[9px]">{p.review_type}</Badge><span className="font-medium">{p.subscription_name}</span></span>
                  <span className="text-muted-foreground">{(p.risk_flags ?? []).join(', ') || '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}