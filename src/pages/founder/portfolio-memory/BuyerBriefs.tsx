import { useEffect, useState } from "react";
import { PMLayout, PackCard, SummaryCard } from "./_shared";
import { fetchPacks, fetchPackItems, fetchSummaries, type HandoverPack, type HandoverPackItem, type MemorySummary } from "@/lib/portfolioMemory";

export default function PMBuyer() {
  const [packs, setPacks] = useState<HandoverPack[]>([]);
  const [items, setItems] = useState<HandoverPackItem[]>([]);
  const [sums, setSums] = useState<MemorySummary[]>([]);
  useEffect(() => {
    fetchPacks().then(p => setPacks(p.filter(x => x.pack_type === "buyer" || x.pack_type === "full_portfolio")));
    fetchPackItems().then(setItems);
    fetchSummaries().then(s => setSums(s.filter(x => x.summary_type === "buyer")));
  }, []);
  return (
    <PMLayout title="Buyer / data-room briefs" subtitle="For prospective buyers and data-room audiences. Restricted by default. Sharing requires founder approval. No raw secrets.">
      <section className="space-y-3">
        {sums.map(s => <SummaryCard key={s.id} s={s} />)}
        {packs.map(p => <PackCard key={p.id} pack={p} items={items} />)}
        {packs.length === 0 && sums.length === 0 && <p className="text-xs text-muted-foreground">No buyer briefs yet.</p>}
      </section>
    </PMLayout>
  );
}