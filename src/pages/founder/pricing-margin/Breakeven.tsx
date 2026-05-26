import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PMLayout, PMSection, PMStat, shortId, fmtMoney } from "./_shared";
import { fetchBreakevenModels, computeBreakeven, type BreakevenModel } from "@/lib/pricingMarginEngine";

export default function PMBreakeven() {
  const [models, setModels] = useState<BreakevenModel[]>([]);
  useEffect(() => { fetchBreakevenModels().then(setModels).catch(() => {}); }, []);

  const [fixed, setFixed] = useState("5000");
  const [varCost, setVarCost] = useState("20");
  const [price, setPrice] = useState("100");

  const calc = useMemo(() => {
    const f = parseFloat(fixed) || 0;
    const v = parseFloat(varCost) || 0;
    const p = parseFloat(price) || 0;
    const contribution = p - v;
    if (contribution <= 0) return { units: null as number | null, revenue: null as number | null };
    return { units: f / contribution, revenue: (f / contribution) * p };
  }, [fixed, varCost, price]);

  return (
    <PMLayout title="Break-even calculator" subtitle="How many sales until each product covers its fixed and variable costs.">
      <PMSection title="Quick calculator" description="Read-only — does not change live prices.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Fixed costs</Label>
            <Input value={fixed} onChange={e => setFixed(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Variable cost / sale</Label>
            <Input value={varCost} onChange={e => setVarCost(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price / sale</Label>
            <Input value={price} onChange={e => setPrice(e.target.value)} type="number" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PMStat label="Break-even units" value={calc.units == null ? "—" : Math.ceil(calc.units)} hint={calc.units == null ? "Contribution ≤ 0" : ""} />
          <PMStat label="Break-even revenue" value={calc.revenue == null ? "—" : fmtMoney(calc.revenue)} />
        </div>
      </PMSection>

      <PMSection title={`Stored break-even models (${models.length})`}>
        {models.length === 0 ? (
          <p className="text-xs text-muted-foreground">No models yet. Use the calculator above as reference.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Business</th>
                  <th className="text-left pr-3">Product</th>
                  <th className="text-right pr-3">Fixed</th>
                  <th className="text-right pr-3">Variable/sale</th>
                  <th className="text-right pr-3">Price/sale</th>
                  <th className="text-right pr-3">BE units</th>
                  <th className="text-right">BE revenue</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => {
                  const be = computeBreakeven(m);
                  return (
                    <tr key={m.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3 font-mono">{shortId(m.business_id)}</td>
                      <td className="pr-3 font-mono">{shortId(m.product_id)}</td>
                      <td className="pr-3 text-right">{m.fixed_costs}</td>
                      <td className="pr-3 text-right">{m.variable_cost_per_sale}</td>
                      <td className="pr-3 text-right">{m.price_per_sale}</td>
                      <td className="pr-3 text-right">{be.units == null ? "—" : Math.ceil(be.units)}</td>
                      <td className="text-right">{be.revenue == null ? "—" : fmtMoney(be.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PMSection>
    </PMLayout>
  );
}