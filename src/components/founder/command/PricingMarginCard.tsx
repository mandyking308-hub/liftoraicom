import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchMarginProfiles, fetchDiscountRules, fetchBreakevenModels, summarize, diagnose,
  type MarginProfile, type DiscountRule, type BreakevenModel,
} from "@/lib/pricingMarginEngine";

export default function PricingMarginCard() {
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
  const blocks = recs.filter(r => r.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign size={14} className="text-primary" />
          Pricing / Margin Engine
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Profiles" value={sum.profiles_total} />
          <Stat label="Healthy" value={sum.healthy} />
          <Stat label="Watch" value={sum.watch} />
          <Stat label="Poor" value={sum.poor} />
          <Stat label="Loss-making" value={sum.loss_making} />
          <Stat label="Discounts" value={sum.discount_rules} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} loss-making / margin-breaking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/pricing-margin" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/pricing-margin/products" className="text-primary hover:underline">Products</Link>
          <Link to="/founder/pricing-margin/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/pricing-margin/discounts" className="text-primary hover:underline">Discounts</Link>
          <Link to="/founder/pricing-margin/breakeven" className="text-primary hover:underline">Break-even</Link>
          <Link to="/founder/pricing-margin/recommendations" className="text-primary hover:underline">Recommendations</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}