import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, RefreshCw, ShieldAlert, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmt = (n: any, c = 'GBP') => {
  const v = Number(n ?? 0);
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v); }
  catch { return `£${v.toFixed(0)}`; }
};

export default function ContractsProcurementControlPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["contract-lifecycle-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("contract-lifecycle-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Contracts status refreshed."); } finally { setBusy(false); } };

  const riskDryRun = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("procurement-risk-run", { body: { dry_run: true } });
      if (error) throw error;
      toast.success(`Dry-run: ${data?.would_create ?? 0} supplier reviews would be created (${data?.summary?.high ?? 0} high-risk).`);
    } catch (e: any) { toast.error(e.message ?? 'Failed.'); } finally { setBusy(false); }
  };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-contracts-procurement">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><ScrollText size={14} className="text-primary" /> Contracts · Procurement · Supplier Risk Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No signing · No external send · No spend approval</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
            <Button size="sm" variant="outline" onClick={riskDryRun} disabled={busy}><ShieldAlert size={12} className="mr-1" />Supplier risk (dry-run)</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Contracts" value={s.contracts_count} />
          <Tile label="Renewals due (90d)" value={s.renewals_due_90d} tone={s.renewals_due_90d ? 'text-yellow-300' : ''} />
          <Tile label="Expiring (90d)" value={s.expiring_soon_90d} tone={s.expiring_soon_90d ? 'text-yellow-300' : ''} />
          <Tile label="Expired open" value={s.expired_open} tone={s.expired_open ? 'text-destructive' : ''} />
          <Tile label="Unsigned" value={s.unsigned_count} tone={s.unsigned_count ? 'text-yellow-300' : ''} />
          <Tile label="High-risk" value={s.high_risk_count} tone={s.high_risk_count ? 'text-destructive' : ''} />
          <Tile label="Legal review" value={s.legal_review_recommended_count} />
          <Tile label="Suppliers w/o contract" value={s.suppliers_missing_contract} tone={s.suppliers_missing_contract ? 'text-yellow-300' : ''} />
          <Tile label="Procurement pending" value={s.procurement_pending} />
          <Tile label="Awaiting founder approval" value={s.procurement_pending_founder_approval} tone={s.procurement_pending_founder_approval ? 'text-yellow-300' : ''} />
          <Tile label="Supplier risk reviews" value={s.supplier_risk_reviews_count} />
          <Tile label="Supplier risk: high" value={s.supplier_risk_high} tone={s.supplier_risk_high ? 'text-destructive' : ''} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic">{data.disclaimer}</div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2 flex items-center gap-1"><FileSignature size={12} /> Next actions</div>
            <ul className="space-y-1 max-h-56 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label}</span>
                  <span className="text-muted-foreground">
                    {a.expiry_date ?? a.renewal_date ?? a.status ?? (a.est ? fmt(a.est) : '')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.suppliers_missing_contract ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Suppliers missing contracts</div>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-auto">
              {data.suppliers_missing_contract.map((s: any) => (
                <Badge key={s.id} variant="outline" className="text-[10px]">{s.name}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}