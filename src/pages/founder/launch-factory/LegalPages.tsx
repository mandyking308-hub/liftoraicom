import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LFLayout, LFSection, StatusBadge } from "./_shared";
import { fetchChecklist, fetchLaunchProfiles, type ChecklistItemRow, type LaunchProfileRow } from "@/lib/launchFactoryEngine";

export default function LFLegalPages() {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  useEffect(() => {
    fetchChecklist().then(setItems).catch(() => {});
    fetchLaunchProfiles().then(setProfiles).catch(() => {});
  }, []);
  const legal = items.filter(i => i.item_category === "legal");
  const noFooter = profiles.filter(p => !p.legal_footer_entity_id);
  return (
    <LFLayout title="Legal pages" subtitle="Legal page coverage and footer entity assignment per business. Publishing pages and footer changes require founder approval.">
      <LFSection title="Legal items">
        {legal.length === 0 ? <p className="text-xs text-muted-foreground">No legal checklist items yet. Generate a checklist from the Checklist tab.</p> : (
          <ul className="text-xs space-y-1">
            {legal.map(i => (
              <li key={i.id} className="flex items-center gap-2 border border-border/50 rounded p-2">
                <span>{i.item_name}</span>
                <StatusBadge status={i.item_status} />
                {i.link_to_fix && <Link to={i.link_to_fix} className="ml-auto text-primary hover:underline">Fix →</Link>}
              </li>
            ))}
          </ul>
        )}
      </LFSection>
      <LFSection title="Businesses missing a legal footer entity">
        {noFooter.length === 0 ? <p className="text-xs text-muted-foreground">All launch profiles have a legal footer entity assigned.</p> : (
          <ul className="text-xs space-y-1">
            {noFooter.map(p => (
              <li key={p.id} className="flex items-center gap-2">
                <span>{p.brand_name ?? p.business_id}</span>
                <Link to="/founder/entity-map/businesses" className="ml-auto text-primary hover:underline">Assign in Entity Map →</Link>
              </li>
            ))}
          </ul>
        )}
      </LFSection>
    </LFLayout>
  );
}