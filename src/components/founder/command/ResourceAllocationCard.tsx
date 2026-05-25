import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchPlans, fetchItems, fetchActuals, fetchPriorityInputs,
  summarize, diagnoseAllocation,
  type AllocationPlan, type AllocationItem, type UsageActual, type PriorityInput,
} from "@/lib/resourceAllocationEngine";

export default function ResourceAllocationCard() {
  const [plans, setPlans] = useState<AllocationPlan[]>([]);
  const [items, setItems] = useState<AllocationItem[]>([]);
  const [actuals, setActuals] = useState<UsageActual[]>([]);
  const [pri, setPri] = useState<PriorityInput[]>([]);
  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => {});
    fetchItems().then(setItems).catch(() => {});
    fetchActuals().then(setActuals).catch(() => {});
    fetchPriorityInputs().then(setPri).catch(() => {});
  }, []);
  const sum = summarize(plans, items, actuals);
  const warns = diagnoseAllocation(items, plans, pri, actuals);
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale size={14} className="text-primary" />
          Resource Allocation
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Plans" value={sum.plans} />
          <Stat label="Pending review" value={sum.plans_pending_review} />
          <Stat label="Items recommended" value={sum.items_recommended} />
          <Stat label="Items active" value={sum.items_active} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"} — approval required before spend.</p>}
        {warns.length > blocks && <p className="text-yellow-300">{warns.length - blocks} reallocation warning{warns.length - blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/resource-allocation" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/resource-allocation/recommendations" className="text-primary hover:underline">Recommend</Link>
          <Link to="/founder/resource-allocation/ai-budget" className="text-primary hover:underline">AI budget</Link>
          <Link to="/founder/resource-allocation/founder-attention" className="text-primary hover:underline">Founder time</Link>
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