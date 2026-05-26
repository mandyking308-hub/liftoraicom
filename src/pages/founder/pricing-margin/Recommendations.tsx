import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PMLayout, PMSection, shortId } from "./_shared";
import {
  fetchMarginProfiles, fetchDiscountRules, fetchBreakevenModels, diagnose,
  type MarginProfile, type DiscountRule, type BreakevenModel, type Recommendation,
} from "@/lib/pricingMarginEngine";

const ACTION_LABEL: Record<Recommendation["action"], string> = {
  increase_price: "Increase price",
  reduce_cost: "Reduce cost",
  reduce_support: "Reduce support load",
  pause_offer: "Pause offer",
  review_discount: "Review discount",
  set_breakeven: "Set break-even",
};

export default function PMRecommendations() {
  const [profiles, setProfiles] = useState<MarginProfile[]>([]);
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [breakevens, setBreakevens] = useState<BreakevenModel[]>([]);
  useEffect(() => {
    fetchMarginProfiles().then(setProfiles).catch(() => {});
    fetchDiscountRules().then(setRules).catch(() => {});
    fetchBreakevenModels().then(setBreakevens).catch(() => {});
  }, []);
  const recs = diagnose(profiles, rules, breakevens);
  const blocks = recs.filter(r => r.severity === "block");
  const warns = recs.filter(r => r.severity === "warn");
  const infos = recs.filter(r => r.severity === "info");

  return (
    <PMLayout title="Pricing recommendations" subtitle="Pricing Agent never changes prices externally without approval.">
      <PMSection title="Blocking" description="Loss-making offers or discounts that break margin.">
        <List recs={blocks} sev="block" />
      </PMSection>
      <PMSection title="Warnings" description="Poor margins, expensive support, risky discounts.">
        <List recs={warns} sev="warn" />
      </PMSection>
      <PMSection title="Info" description="Missing break-even models and other completeness gaps.">
        <List recs={infos} sev="info" />
      </PMSection>
    </PMLayout>
  );
}

function List({ recs, sev }: { recs: Recommendation[]; sev: "block" | "warn" | "info" }) {
  if (recs.length === 0) return <p className="text-xs text-muted-foreground">None.</p>;
  const cls = sev === "block" ? "bg-red-500/15 text-red-400 border-red-500/30" : sev === "warn" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-muted text-muted-foreground border-border/50";
  return (
    <ul className="text-xs space-y-1">
      {recs.map((r, i) => (
        <li key={`${r.id}-${i}`} className="flex items-start gap-2">
          <Badge variant="outline" className={`text-[10px] shrink-0 ${cls}`}>{ACTION_LABEL[r.action]}</Badge>
          <span className="text-muted-foreground font-mono shrink-0">{shortId(r.business_id)}</span>
          <span>{r.message}</span>
        </li>
      ))}
    </ul>
  );
}