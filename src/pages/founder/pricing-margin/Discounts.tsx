import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PMLayout, PMSection, MarginStatusBadge, fmtPct, shortId } from "./_shared";
import {
  fetchDiscountRules, fetchMarginProfiles, discountedMargin,
  type DiscountRule, type MarginProfile,
} from "@/lib/pricingMarginEngine";

export default function PMDiscounts() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [profiles, setProfiles] = useState<MarginProfile[]>([]);
  useEffect(() => {
    fetchDiscountRules().then(setRules).catch(() => {});
    fetchMarginProfiles().then(setProfiles).catch(() => {});
  }, []);
  return (
    <PMLayout title="Discount rules" subtitle="Discount caps, approval requirements, and margin impact preview.">
      <PMSection title={`Rules (${rules.length})`} description="Discounts always require founder approval unless explicitly pre-approved by rule.">
        {rules.length === 0 ? (
          <p className="text-xs text-muted-foreground">No discount rules yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left pr-3">Business</th>
                  <th className="text-left pr-3">Offer</th>
                  <th className="text-right pr-3">Max %</th>
                  <th className="text-left pr-3">Conditions</th>
                  <th className="text-left pr-3">Approval</th>
                  <th className="text-left pr-3">Active</th>
                  <th className="text-left">Margin after</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => {
                  const p = profiles.find(p => (r.offer_id && p.offer_id === r.offer_id) || (!r.offer_id && r.product_id && p.product_id === r.product_id));
                  const after = p ? discountedMargin(p, r.max_discount_percent) : null;
                  return (
                    <tr key={r.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3">{r.discount_name}</td>
                      <td className="pr-3 font-mono">{shortId(r.business_id)}</td>
                      <td className="pr-3 font-mono">{shortId(r.offer_id ?? r.product_id)}</td>
                      <td className="pr-3 text-right">{r.max_discount_percent}%</td>
                      <td className="pr-3">{r.allowed_conditions ?? "—"}</td>
                      <td className="pr-3">
                        {r.discount_requires_approval
                          ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Required</Badge>
                          : <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Pre-approved</Badge>}
                      </td>
                      <td className="pr-3">
                        <Badge variant="outline" className={`text-[10px] ${r.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>{r.active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td>{after ? <span className="inline-flex items-center gap-2"><MarginStatusBadge status={after.status} /><span className="text-muted-foreground">{fmtPct(after.percent)}</span></span> : <span className="text-muted-foreground">—</span>}</td>
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