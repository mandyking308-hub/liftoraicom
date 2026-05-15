import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, RefreshCw, ListChecks, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmt = (n: any, c = 'GBP') => {
  const v = Number(n ?? 0);
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v); }
  catch { return `£${v.toFixed(0)}`; }
};

export default function TreasuryCashflowControlPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["treasury-cashflow-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("treasury-cashflow-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Treasury status refreshed."); } finally { setBusy(false); } };

  const closeDryRun = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-close-run", { body: { dry_run: true } });
      if (error) throw error;
      toast.success(`Dry-run: ${data?.would_create ?? 0} close tasks would be created.`);
    } catch (e: any) { toast.error(e.message ?? 'Failed.'); } finally { setBusy(false); }
  };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  const riskTone = s.cash_risk === 'high' ? 'text-destructive' : s.cash_risk === 'medium' ? 'text-yellow-300' : 'text-emerald-300';

  return (
    <Card className="bg-card border-border/50" id="sec-treasury-cashflow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Banknote size={14} className="text-primary" /> Treasury · Cashflow · Accounting Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No money movement · No banking API · No filings</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
            <Button size="sm" variant="outline" onClick={closeDryRun} disabled={busy}><ListChecks size={12} className="mr-1" />Close tasks (dry-run)</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Bank accounts" value={s.bank_accounts_count} />
          <Tile label="Est. total balance" value={fmt(s.total_estimated_balance)} />
          <Tile label="Expected cash in" value={fmt(s.expected_inflows)} tone="text-emerald-300" />
          <Tile label="Expected cash out" value={fmt(s.expected_outflows)} tone="text-yellow-300" />
          <Tile label="Tax reserve (est.)" value={fmt(s.tax_reserve_estimate)} />
          <Tile label="Net position (est.)" value={fmt(s.net_cash_position_estimate)} />
          <Tile label="Runway (months)" value={s.runway_months_estimate ?? '—'} tone={s.runway_months_estimate !== null && s.runway_months_estimate < 6 ? 'text-yellow-300' : ''} />
          <Tile label="Cash risk" value={s.cash_risk ?? '—'} tone={riskTone} />
          <Tile label="Overdue invoices" value={s.overdue_receivables_count} tone={s.overdue_receivables_count ? 'text-destructive' : ''} />
          <Tile label="Overdue value" value={fmt(s.overdue_receivables_amount)} />
          <Tile label="Close tasks overdue" value={s.close_tasks_overdue} tone={s.close_tasks_overdue ? 'text-destructive' : ''} />
          <Tile label="Adviser tasks open" value={s.adviser_tasks_open} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic flex items-start gap-1">
            <AlertTriangle size={11} className="mt-0.5" />{data.disclaimer}
          </div>
        )}

        {(data?.bank_accounts ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Bank accounts (no credentials shown)</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.bank_accounts.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.label}</span>
                    {b.bank_name && <Badge variant="outline" className="text-[9px]">{b.bank_name}</Badge>}
                    {b.currency && <Badge variant="outline" className="text-[9px]">{b.currency}</Badge>}
                    {b.country && <Badge variant="outline" className="text-[9px]">{b.country}</Badge>}
                    <Badge variant="outline" className="text-[9px]">{b.status}</Badge>
                  </div>
                  <div className="text-muted-foreground">est: {fmt(b.balance_estimate, b.currency || 'GBP')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next actions</div>
            <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.task ?? a.invoice_id ?? a.label}</span>
                  <span className="text-muted-foreground">{a.due_date ?? a.amount ? fmt(a.amount) : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}