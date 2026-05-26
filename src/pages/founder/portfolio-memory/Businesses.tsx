import { useEffect, useState } from "react";
import { PMLayout, SummaryCard } from "./_shared";
import { fetchSummaries, type MemorySummary } from "@/lib/portfolioMemory";

export default function PMBusinesses() {
  const [items, setItems] = useState<MemorySummary[]>([]);
  useEffect(() => { fetchSummaries().then(setItems); }, []);
  return (
    <PMLayout title="Business memory cards" subtitle="One 5-minute brief per business per audience. Estimated metrics are flagged.">
      <div className="space-y-3">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No business memory summaries yet.</p>}
        {items.map(s => <SummaryCard key={s.id} s={s} />)}
      </div>
    </PMLayout>
  );
}