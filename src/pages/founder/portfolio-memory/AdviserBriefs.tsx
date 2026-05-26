import { useEffect, useState } from "react";
import { PMLayout, PackCard, SummaryCard } from "./_shared";
import { fetchPacks, fetchPackItems, fetchSummaries, type HandoverPack, type HandoverPackItem, type MemorySummary } from "@/lib/portfolioMemory";

export default function PMAdviser() {
  const [packs, setPacks] = useState<HandoverPack[]>([]);
  const [items, setItems] = useState<HandoverPackItem[]>([]);
  const [sums, setSums] = useState<MemorySummary[]>([]);
  useEffect(() => {
    fetchPacks().then(p => setPacks(p.filter(x => x.pack_type === "adviser")));
    fetchPackItems().then(setItems);
    fetchSummaries().then(s => setSums(s.filter(x => ["adviser","legal","finance"].includes(x.summary_type))));
  }, []);
  return (
    <PMLayout title="Adviser handover packs" subtitle="For tax, legal and finance advisers. Confidential by default; sharing requires founder approval. Raw secrets are never included.">
      <section className="space-y-3">
        {sums.map(s => <SummaryCard key={s.id} s={s} />)}
        {packs.map(p => <PackCard key={p.id} pack={p} items={items} />)}
        {packs.length === 0 && sums.length === 0 && <p className="text-xs text-muted-foreground">No adviser briefs yet.</p>}
      </section>
    </PMLayout>
  );
}