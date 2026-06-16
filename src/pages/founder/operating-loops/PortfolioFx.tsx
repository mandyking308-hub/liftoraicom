import { useEffect, useState } from "react";
import { OLLayout, OLSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { consolidateRevenue, fetchFxRates, fetchFxWarnings, upsertFxRate, type FxRate, type FxRow, type FxWarning } from "@/lib/operatingLoops/portfolioFxEngine";
import { toast } from "sonner";

export default function PortfolioFxPage() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [warnings, setWarnings] = useState<FxWarning[]>([]);
  const [rows, setRows] = useState<FxRow[]>([]);
  const [ccy, setCcy] = useState(""); const [rate, setRate] = useState("");

  const reload = async () => {
    try { const r = await fetchFxRates(); setRates(r); setRows(await consolidateRevenue(r)); setWarnings(await fetchFxWarnings()); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!ccy.trim() || !rate) return;
    try { await upsertFxRate({ currency: ccy.toUpperCase(), rate: Number(rate) }); setCcy(""); setRate(""); reload(); toast.success("Rate added."); }
    catch (e: any) { toast.error(e.message); }
  };

  const totalGbp = rows.reduce((s,r) => s + (r.gbp_estimate ?? 0), 0);

  return (
    <OLLayout title="Portfolio FX consolidation"
      subtitle="Read-only multi-currency visibility across invoices. Native currency is authoritative; GBP estimates are derived."
      disclaimer="Management visibility only. Not statutory accounts. Not tax advice. FX rates labelled when missing or estimated.">
      <OLSection title="Add manual FX rate (vs GBP)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Currency (e.g. USD)" value={ccy} onChange={e => setCcy(e.target.value)} />
          <Input placeholder="Rate (1 GBP = X)" type="number" step="0.0001" value={rate} onChange={e => setRate(e.target.value)} />
          <Button onClick={add}>Add rate</Button>
        </div>
      </OLSection>
      <OLSection title={`Revenue by currency (estimated GBP total: £${totalGbp.toFixed(0)})`}>
        {rows.length === 0 ? <p className="text-muted-foreground">No multi-currency invoice data yet.</p> : (
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40"><tr><th className="text-left p-2">Ccy</th><th className="text-right p-2">Native total</th><th className="text-right p-2">GBP estimate</th><th className="p-2"></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.currency} className="border-b border-border/20">
                <td className="p-2 font-medium">{r.currency}</td>
                <td className="p-2 text-right">{r.native_total.toFixed(2)}</td>
                <td className="p-2 text-right">{r.gbp_estimate !== null ? `£${r.gbp_estimate.toFixed(0)}` : "—"}</td>
                <td className="p-2">{r.has_rate ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">rate present</Badge> : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">rate missing</Badge>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </OLSection>
      <OLSection title={`Open FX warnings (${warnings.length})`}>
        {warnings.length === 0 ? <p className="text-muted-foreground">None.</p> : (
          <ul className="space-y-1">{warnings.map(w => <li key={w.id} className="border-b border-border/20 py-1">{w.currency} · {w.notes ?? "missing rate"}</li>)}</ul>
        )}
      </OLSection>
      <OLSection title={`FX rate history (${rates.length})`}>
        {rates.slice(0, 20).map(r => (
          <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
            <span>{r.currency} → {r.base_currency}</span>
            <span className="text-muted-foreground">{Number(r.rate).toFixed(4)} · {r.as_of} · {r.source ?? "—"}</span>
          </div>
        ))}
      </OLSection>
    </OLLayout>
  );
}
