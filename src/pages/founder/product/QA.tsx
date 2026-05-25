import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { QA_STATUS_TONE } from "@/lib/productEngine";

type QA = {
  id: string; checklist_name: string; release_id: string | null;
  qa_status: string; tested_by: string | null; tested_at: string | null;
  checklist_items: any[]; notes: string | null; updated_at: string;
};

export default function ProductQA() {
  const [items, setItems] = useState<QA[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("qa_checklists").select("*").order("updated_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  return (
    <PRODLayout title="QA checklists" subtitle="QA checklists drafted by the Product QA Agent for every release. A release cannot promote past QA without all critical items passing.">
      <NoAutoDeployBanner />
      {items.length === 0 ? (
        <PRODEmpty title="No QA checklists yet" hint="Product QA Agent generates a checklist for each release draft." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(q => (
            <PRODSection key={q.id} title={q.checklist_name} description={q.tested_by ? `Tested by ${q.tested_by}${q.tested_at ? ` · ${new Date(q.tested_at).toLocaleString()}` : ""}` : "Awaiting QA owner"}>
              <div className="space-y-2">
                <Badge variant="outline" className={`${QA_STATUS_TONE[q.qa_status]} text-[10px]`}>{q.qa_status}</Badge>
                {Array.isArray(q.checklist_items) && q.checklist_items.length > 0 ? (
                  <ul className="text-xs space-y-1">
                    {q.checklist_items.map((it: any, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{it?.passed ? "✓" : it?.failed ? "✗" : "•"}</span>
                        <span>{it?.label ?? it?.title ?? String(it)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No checklist items captured yet.</p>
                )}
                {q.notes && <p className="text-[11px] text-muted-foreground">{q.notes}</p>}
              </div>
            </PRODSection>
          ))}
        </div>
      )}
    </PRODLayout>
  );
}