import { useEffect, useState } from "react";
import { DecLayout, DecisionRow } from "./_shared";
import { fetchDecisions, type FounderDecision } from "@/lib/decisionRegister";

export default function DecisionsImplemented() {
  const [items, setItems] = useState<FounderDecision[]>([]);
  useEffect(() => {
    fetchDecisions().then(d => setItems(d.filter(x => x.decision_status === "decided" || x.decision_status === "implemented")));
  }, []);
  const decided = items.filter(d => d.decision_status === "decided");
  const done = items.filter(d => d.decision_status === "implemented");
  return (
    <DecLayout title="Implementation tracker" subtitle="Decisions awaiting implementation vs already implemented.">
      <div className="space-y-4">
        <section>
          <p className="text-xs font-semibold mb-2">Decided · awaiting implementation ({decided.length})</p>
          <div className="space-y-3">{decided.map(d => <DecisionRow key={d.id} d={d} />)}</div>
          {decided.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
        </section>
        <section>
          <p className="text-xs font-semibold mb-2">Implemented ({done.length})</p>
          <div className="space-y-3">{done.map(d => <DecisionRow key={d.id} d={d} />)}</div>
          {done.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
        </section>
      </div>
    </DecLayout>
  );
}