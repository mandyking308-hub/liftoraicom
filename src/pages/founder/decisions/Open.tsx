import { useEffect, useState } from "react";
import { DecLayout, DecisionRow } from "./_shared";
import { fetchDecisions, type FounderDecision } from "@/lib/decisionRegister";

export default function DecisionsOpen() {
  const [items, setItems] = useState<FounderDecision[]>([]);
  useEffect(() => {
    fetchDecisions().then(d => setItems(d.filter(x => ["needed","recommended","founder_review"].includes(x.decision_status))));
  }, []);
  return (
    <DecLayout title="Open decisions" subtitle="Decisions needing attention. Recommendations are live; founder records the decision; irreversible actions remain approval-gated.">
      <div className="space-y-3">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No open decisions.</p>}
        {items.map(d => <DecisionRow key={d.id} d={d} />)}
      </div>
    </DecLayout>
  );
}