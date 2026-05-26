import { useEffect, useState } from "react";
import { DecLayout, DecisionRow } from "./_shared";
import { fetchDecisions, type FounderDecision } from "@/lib/decisionRegister";

export default function DecisionsMade() {
  const [items, setItems] = useState<FounderDecision[]>([]);
  useEffect(() => {
    fetchDecisions().then(d => setItems(d.filter(x => ["decided","implemented","deferred","cancelled"].includes(x.decision_status))));
  }, []);
  return (
    <DecLayout title="Decisions made" subtitle="Decisions the founder has recorded. Implementation status is tracked below.">
      <div className="space-y-3">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>}
        {items.map(d => <DecisionRow key={d.id} d={d} />)}
      </div>
    </DecLayout>
  );
}