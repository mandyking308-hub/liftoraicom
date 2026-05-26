import { useEffect, useState } from "react";
import { PMLayout, PackCard } from "./_shared";
import { fetchPacks, fetchPackItems, type HandoverPack, type HandoverPackItem } from "@/lib/portfolioMemory";

export default function PMPacks() {
  const [packs, setPacks] = useState<HandoverPack[]>([]);
  const [items, setItems] = useState<HandoverPackItem[]>([]);
  useEffect(() => { fetchPacks().then(setPacks); fetchPackItems().then(setItems); }, []);
  return (
    <PMLayout title="Handover packs" subtitle="Assembled packs for operators, advisers, buyers, VAs, technical, founder, emergency and full-portfolio audiences. Sensitive packs are gated.">
      <div className="space-y-3">
        {packs.length === 0 && <p className="text-xs text-muted-foreground">No handover packs yet.</p>}
        {packs.map(p => <PackCard key={p.id} pack={p} items={items} />)}
      </div>
    </PMLayout>
  );
}