import { useEffect, useState } from "react";
import { BALayout, BASection } from "./_shared";
import { fetchArchetypes, type ArchetypeRow } from "@/lib/businessArchetypeEngine";
import { Badge } from "@/components/ui/badge";

export default function ArchetypeSettings() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  useEffect(() => { fetchArchetypes().then(setArchetypes).catch(() => {}); }, []);
  return (
    <BALayout title="Settings" subtitle="Archetype catalogue and defaults. Edits to defaults flow to per-business recommendations on next classification.">
      <BASection title="Catalogue defaults (read-only view)">
        <div className="space-y-2">
          {archetypes.map(a => (
            <div key={a.id} className="border border-border/50 rounded p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{a.archetype_name} <span className="text-[10px] text-muted-foreground">({a.archetype_code})</span></p>
                <Badge variant="outline" className={a.active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]" : "text-[10px]"}>{a.active ? "Active" : "Disabled"}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{a.description}</p>
              <pre className="text-[10px] bg-secondary/40 p-2 rounded mt-2 overflow-x-auto">
{JSON.stringify({ kpis: a.default_kpis, agents: a.default_agents, integrations: a.default_integrations, compliance: a.default_compliance_flags, exit: a.default_exit_metrics, model: a.default_operating_model }, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </BASection>
    </BALayout>
  );
}