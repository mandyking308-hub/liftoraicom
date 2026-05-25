import { useEffect, useState } from "react";
import { BALayout, BASection, BAStat } from "./_shared";
import { fetchArchetypes, fetchAssignments, type ArchetypeRow, type AssignmentRow } from "@/lib/businessArchetypeEngine";
import { Badge } from "@/components/ui/badge";

export default function ArchetypeOverview() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  const [assigns, setAssigns] = useState<AssignmentRow[]>([]);
  useEffect(() => {
    fetchArchetypes().then(setArchetypes).catch(() => {});
    fetchAssignments().then(setAssigns).catch(() => {});
  }, []);
  const confirmed = assigns.filter(a => a.founder_confirmed).length;
  const hybrid = assigns.filter(a => (a.secondary_archetype_ids ?? []).length >= 1).length;
  return (
    <BALayout title="Business Archetype Classifier" subtitle="Classify each Liftor business so the correct operating model, agents, KPIs, integrations, compliance rules and exit metrics are applied. Internal-only.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BAStat label="Archetypes" value={archetypes.length} hint="Seeded catalogue" />
        <BAStat label="Assigned businesses" value={assigns.length} />
        <BAStat label="Founder-confirmed" value={`${confirmed} / ${assigns.length}`} />
        <BAStat label="Hybrid models" value={hybrid} hint="≥1 secondary archetype" />
      </div>
      <BASection title="Archetype catalogue" description="Default operating model templates applied per business when classified.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {archetypes.map(a => (
            <div key={a.id} className="border border-border/50 rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{a.archetype_name}</p>
                <Badge variant="outline" className="text-[10px]">{a.archetype_code}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {(a.default_kpis as string[]).slice(0, 3).map(k => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60">{k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </BASection>
    </BALayout>
  );
}