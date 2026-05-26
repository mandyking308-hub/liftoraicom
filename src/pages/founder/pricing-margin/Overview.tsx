import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PMLayout, PMSection, PMStat } from "./_shared";
import {
  fetchMarginProfiles, fetchDiscountRules, fetchBreakevenModels,
  summarize, diagnose,
  type MarginProfile, type DiscountRule, type BreakevenModel,
} from "@/lib/pricingMarginEngine";

export default function PMOverview() {
  const [profiles, setProfiles] = useState<MarginProfile[]>([]);
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [breakevens, setBreakevens] = useState<BreakevenModel[]>([]);
  useEffect(() => {
    fetchMarginProfiles().then(setProfiles).catch(() => {});
    fetchDiscountRules().then(setRules).catch(() => {});
    fetchBreakevenModels().then(setBreakevens).catch(() => {});
  }, []);
  const sum = summarize(profiles, rules, breakevens);
  const recs = diagnose(profiles, rules, breakevens);
  return (
    <PMLayout title="Pricing / Margin Engine"
      subtitle="Liftor must know whether each product/business is profitable, not just whether it sells. Margin analysis runs live. Public price changes, discounts, offer sends, payment links and contracts remain approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <PMStat label="Profiles" value={sum.profiles_total} hint={`${sum.businesses} businesses`} />
        <PMStat label="Healthy" value={sum.healthy} />
        <PMStat label="Watch" value={sum.watch} />
        <PMStat label="Poor" value={sum.poor} />
        <PMStat label="Loss-making" value={sum.loss_making} />
        <PMStat label="Discount rules" value={sum.discount_rules} hint={`${sum.risky_discounts} aggressive`} />
      </div>

      <PMSection title="Pricing Agent — recommendations"
        description="Margin analysis, loss warnings, discount safety, breakeven gaps. External price changes never sent without approval."
        actions={<Link to="/founder/pricing-margin/recommendations" className="text-xs text-primary hover:underline">All recommendations →</Link>}>
        {recs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No margin warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {recs.slice(0, 60).map((r, i) => (
              <li key={`${r.id}-${i}`} className="flex items-start gap-2">
                <span className={r.severity === "block" ? "text-destructive" : r.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{r.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PMSection>
    </PMLayout>
  );
}