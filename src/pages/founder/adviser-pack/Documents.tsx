import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type Item = { id: string; pack_id: string; item_type: string; item_summary: string; needs_adviser_review: boolean };

const REQUIRED_DOCS = [
  "Bank statements (UK / US / UAE)",
  "Invoices issued in period",
  "Invoices received in period",
  "Payment runs / receipts",
  "Contracts signed in period",
  "AI / SaaS usage summary",
  "Payroll register (if applicable)",
  "Entity changes / resolutions",
  "Tax / VAT calculations",
];

export default function AdviserPackDocuments() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("adviser_pack_items").select("*").eq("item_type", "document").order("created_at", { ascending: false }).limit(200);
      setItems(data ?? []);
    })();
  }, []);

  const have = new Set(items.map(i => i.item_summary.toLowerCase()));

  return (
    <APLayout title="Document checklist" subtitle="Required documents per adviser pack. Liftor flags missing items; founder uploads the source files manually.">
      <APSection title="Standard checklist">
        <div className="space-y-1 text-xs">
          {REQUIRED_DOCS.map(d => {
            const present = Array.from(have).some(v => v.includes(d.toLowerCase().split("(")[0].trim()));
            return (
              <div key={d} className="flex items-center gap-2 border-b border-border/30 pb-1">
                <Badge variant="outline" className={present ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]"}>
                  {present ? "present" : "missing"}
                </Badge>
                <span>{d}</span>
              </div>
            );
          })}
        </div>
      </APSection>

      <APSection title={`Logged documents (${items.length})`}>
        {items.length === 0 ? <APEmpty title="No documents logged yet" /> : (
          <div className="space-y-1 text-xs">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
                <span className="flex-1">{i.item_summary}</span>
                {i.needs_adviser_review && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">review</Badge>}
              </div>
            ))}
          </div>
        )}
      </APSection>
    </APLayout>
  );
}