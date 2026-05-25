import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RALayout, RASection, TypeBadge, fmt } from "./_shared";
import {
  fetchPriorityInputs, recommendAllocation, persistPlan,
  type AllocationType, type PriorityInput, TYPE_META,
} from "@/lib/resourceAllocationEngine";

const TYPES: AllocationType[] = ["ai_budget", "human_time", "founder_time", "cash", "sales_effort", "build_effort", "content_effort"];

export default function RARecommendations() {
  const { toast } = useToast();
  const [priorities, setPriorities] = useState<PriorityInput[]>([]);
  const [type, setType] = useState<AllocationType>("ai_budget");
  const [total, setTotal] = useState<string>("1000");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetchPriorityInputs().then(setPriorities).catch(() => {}); }, []);

  const items = useMemo(
    () => recommendAllocation(Number(total) || 0, type, priorities),
    [total, type, priorities],
  );

  const onSave = async () => {
    if (items.length === 0) { toast({ title: "Nothing to save", description: "No recommended items." }); return; }
    setSaving(true);
    try {
      const plan = await persistPlan(type, Number(total), items);
      toast({ title: "Plan saved for review", description: `${TYPE_META[type].label} · ${plan.plan_status}` });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <RALayout title="Recommendations"
      subtitle="Live weekly recommendation engine. Pulls latest portfolio priority scores and proposes how to split a resource pool. Saving creates a plan in review_required status — no spend is committed.">
      <RASection title="Generate" description="Choose a resource type and total pool. We use priority weight × decision weight × resource-specific bias.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs">Resource type</Label>
            <Select value={type} onValueChange={v => setType(v as AllocationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Total pool ({TYPE_META[type].unit})</Label>
            <Input type="number" value={total} onChange={e => setTotal(e.target.value)} />
          </div>
          <div className="text-xs text-muted-foreground">
            {priorities.length} business{priorities.length === 1 ? "" : "es"} scored.
          </div>
          <Button onClick={onSave} disabled={saving || items.length === 0}>
            {saving ? "Saving…" : "Save plan for review"}
          </Button>
        </div>
      </RASection>

      <RASection title="Recommended split" actions={<TypeBadge type={type} />}>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {priorities.length === 0 ? "No priority scores available yet — run portfolio scoring first." : "No recommendation (pool ≤ 0)."}
          </p>
        ) : (
          <div className="space-y-2 text-xs">
            {items.map(it => (
              <div key={it.business_id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{it.business_id.slice(0, 8)}</span>
                  <span className="text-[10px] text-muted-foreground">{it.priority}</span>
                  <span className="ml-auto font-bold">{fmt(it.allocated_amount, it.unit)}</span>
                </div>
                {it.reason && <p className="text-[11px] text-muted-foreground">{it.reason}</p>}
                {it.expected_return && <p className="text-[11px] text-muted-foreground"><span className="text-foreground">Expected:</span> {it.expected_return}</p>}
                {it.risk_notes && <p className="text-[11px] text-yellow-300">{it.risk_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </RASection>
    </RALayout>
  );
}