import { useEffect, useState } from "react";
import { PMLayout, PackCard, SummaryCard } from "./_shared";
import { fetchPacks, fetchPackItems, fetchSummaries, type HandoverPack, type HandoverPackItem, type MemorySummary } from "@/lib/portfolioMemory";

export default function PMOperator() {
  const [packs, setPacks] = useState<HandoverPack[]>([]);
  const [items, setItems] = useState<HandoverPackItem[]>([]);
  const [sums, setSums] = useState<MemorySummary[]>([]);
  useEffect(() => {
    fetchPacks().then(p => setPacks(p.filter(x => x.pack_type === "operator" || x.pack_type === "va")));
    fetchPackItems().then(setItems);
    fetchSummaries().then(s => setSums(s.filter(x => x.summary_type === "operator")));
  }, []);
  return (
    <PMLayout title="Operator handover packs" subtitle="For VAs and operators. Work instructions, systems, access and warnings. Confidential finance excluded unless permitted.">
      <section className="space-y-3">
        {sums.map(s => <SummaryCard key={s.id} s={s} />)}
        {packs.map(p => <PackCard key={p.id} pack={p} items={items} />)}
        {packs.length === 0 && sums.length === 0 && <p className="text-xs text-muted-foreground">No operator briefs yet.</p>}
      </section>
    </PMLayout>
  );
}