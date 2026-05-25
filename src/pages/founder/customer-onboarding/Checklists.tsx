import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { COLayout, COSection, COEmpty, CO_STATUS_TONE } from "./_shared";

export default function CustomerOnboardingChecklists() {
  const [items, setItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from("onboarding_checklist_items").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("onboarding_templates").select("*").order("created_at", { ascending: false }).limit(100),
    ]).then(([a, b]) => { setItems(a.data || []); setTemplates(b.data || []); setLoading(false); });
  }, []);

  return (
    <COLayout title="Checklists" subtitle="Per-customer checklists, plus the templates they are generated from.">
      <COSection title={`Active checklist items (${items.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          items.length === 0 ? <COEmpty title="No checklist items yet" hint="Items are generated from the matching onboarding template when a record is created." /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/40">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Required from</th>
                  <th className="py-2 pr-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id} className="border-b border-border/30">
                    <td className="py-2 pr-3">{i.item_name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{i.item_type}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${CO_STATUS_TONE[i.item_status] || ""}`}>{i.item_status}</Badge></td>
                    <td className="py-2 pr-3">{i.required_from}</td>
                    <td className="py-2 pr-3">{i.due_at ? new Date(i.due_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </COSection>

      <COSection title={`Templates (${templates.length})`} description="Define checklist, welcome message, required docs and first success milestone per product.">
        {templates.length === 0 ? <COEmpty title="No templates configured" hint="Add a template per product to standardise onboarding." /> :
          <ul className="text-xs space-y-2">
            {templates.map(t => (
              <li key={t.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.template_name}</span>
                  {t.active ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">active</Badge> : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                </div>
                {t.first_success_milestone && <p className="text-muted-foreground">First success: {t.first_success_milestone}</p>}
              </li>
            ))}
          </ul>
        }
      </COSection>
    </COLayout>
  );
}