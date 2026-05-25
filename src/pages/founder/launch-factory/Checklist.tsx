import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LFLayout, LFSection, StatusBadge } from "./_shared";
import {
  fetchChecklist, fetchLaunchProfiles, generateChecklistForBusiness,
  type ChecklistItemRow, type LaunchProfileRow,
} from "@/lib/launchFactoryEngine";

export default function LFChecklist() {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [archetype, setArchetype] = useState("saas");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetchChecklist().then(setItems).catch(() => {});
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
  };
  useEffect(load, []);

  async function onGenerate() {
    if (!businessId) { toast.error("business_id required"); return; }
    setLoading(true);
    try {
      const created = await generateChecklistForBusiness({ business_id: businessId, archetype_code: archetype });
      toast.success(`Generated ${created.length} checklist items (live internal). External actions remain approval-gated.`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setLoading(false); }
  }

  const grouped = useMemo(() => {
    const m: Record<string, ChecklistItemRow[]> = {};
    for (const i of items) (m[i.business_id] ||= []).push(i);
    return m;
  }, [items]);

  return (
    <LFLayout title="Launch checklist" subtitle="Generate and review launch checklists per business. Items are created live internally; domain/DNS/publish/email-send/account-create remain founder-gated.">
      <LFSection title="Generate checklist (live internal — no external action)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="business_id (uuid)" value={businessId} onChange={e => setBusinessId(e.target.value)} />
          <Input placeholder="archetype_code (e.g. saas, marketplace, ecommerce, agency, content)" value={archetype} onChange={e => setArchetype(e.target.value)} />
          <Button onClick={onGenerate} disabled={loading}>{loading ? "Generating…" : "Generate checklist"}</Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">No domain is purchased, no DNS changed, no account created, no email sent.</p>
      </LFSection>

      {Object.keys(grouped).length === 0 ? (
        <LFSection title="Checklist items"><p className="text-xs text-muted-foreground">No checklist items yet.</p></LFSection>
      ) : (
        Object.entries(grouped).map(([bid, list]) => {
          const p = profiles.find(x => x.business_id === bid);
          return (
            <LFSection key={bid} title={p?.brand_name ?? bid} description={`${list.length} items`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Required</th>
                      <th className="text-left p-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(i => (
                      <tr key={i.id} className="border-b border-border/20">
                        <td className="p-2">{i.item_name}</td>
                        <td className="p-2 text-muted-foreground">{i.item_category}</td>
                        <td className="p-2"><StatusBadge status={i.item_status} /></td>
                        <td className="p-2">{i.required ? "yes" : "no"}</td>
                        <td className="p-2">{i.link_to_fix ? <Link to={i.link_to_fix} className="text-primary hover:underline">Fix →</Link> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LFSection>
          );
        })
      )}
    </LFLayout>
  );
}