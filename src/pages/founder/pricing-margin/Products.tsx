import { useEffect, useState } from "react";
import { PMLayout, PMSection, MarginStatusBadge, fmtMoney, fmtPct, shortId } from "./_shared";
import {
  fetchMarginProfiles, totalCost, computeMargin,
  type MarginProfile,
} from "@/lib/pricingMarginEngine";

export default function PMProducts() {
  const [profiles, setProfiles] = useState<MarginProfile[]>([]);
  useEffect(() => { fetchMarginProfiles().then(setProfiles).catch(() => {}); }, []);
  return (
    <PMLayout title="Product margin dashboard" subtitle="Per-product margin including direct, AI, human, payment, support, delivery and refund-risk costs.">
      <PMSection title={`Margin profiles (${profiles.length})`}>
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No margin profiles yet. Add product/offer pricing to begin analysis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Business</th>
                  <th className="text-left pr-3">Product</th>
                  <th className="text-left pr-3">Offer</th>
                  <th className="text-right pr-3">Price</th>
                  <th className="text-right pr-3">Cost</th>
                  <th className="text-right pr-3">Margin</th>
                  <th className="text-right pr-3">%</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => {
                  const cost = totalCost(p);
                  const m = computeMargin(p);
                  return (
                    <tr key={p.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3 font-mono">{shortId(p.business_id)}</td>
                      <td className="pr-3 font-mono">{shortId(p.product_id)}</td>
                      <td className="pr-3 font-mono">{shortId(p.offer_id)}</td>
                      <td className="pr-3 text-right">{fmtMoney(p.price_amount, p.currency)}</td>
                      <td className="pr-3 text-right">{fmtMoney(cost, p.currency)}</td>
                      <td className="pr-3 text-right">{fmtMoney(m.amount, p.currency)}</td>
                      <td className="pr-3 text-right">{fmtPct(m.percent)}</td>
                      <td><MarginStatusBadge status={m.status} /></td>
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