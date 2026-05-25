import { useEffect, useState } from "react";
import { BALayout, BASection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchArchetypes, fetchAssignments, type ArchetypeRow, type AssignmentRow } from "@/lib/businessArchetypeEngine";

export default function ArchetypeRecommendations() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  const [assigns, setAssigns] = useState<AssignmentRow[]>([]);
  useEffect(() => {
    fetchArchetypes().then(setArchetypes).catch(() => {});
    fetchAssignments().then(setAssigns).catch(() => {});
  }, []);
  const byId = new Map(archetypes.map(a => [a.id, a]));
  return (
    <BALayout title="Recommendations" subtitle="Per-business operating model, active modules, KPIs, integrations, compliance flags and exit metrics — derived from assigned archetypes.">
      {assigns.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
      <div className="space-y-4">
        {assigns.map(a => {
          const p = a.primary_archetype_id ? byId.get(a.primary_archetype_id) : null;
          const secs = (a.secondary_archetype_ids ?? []).map(id => byId.get(id)).filter(Boolean) as ArchetypeRow[];
          const merge = (key: keyof ArchetypeRow) => {
            const out = new Set<string>();
            [p, ...secs].forEach(x => { if (x) (x[key] as any as string[] ?? []).forEach(v => out.add(v)); });
            return Array.from(out);
          };
          return (
            <BASection key={a.id} title={`${p?.archetype_name ?? "Unassigned"} · ${a.business_id.slice(0, 8)}…`} description={a.reason_summary ?? ""}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <Block title="Active modules / agents" items={merge("default_agents")} />
                <Block title="KPIs" items={merge("default_kpis")} />
                <Block title="Integrations" items={merge("default_integrations")} />
                <Block title="Compliance flags" items={merge("default_compliance_flags")} tone="warn" />
                <Block title="Exit metrics" items={merge("default_exit_metrics")} />
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground mb-1">Recommended setup tasks</p>
                  <ul className="list-disc pl-5">
                    {((a.audit_metadata?.recommended_setup_tasks ?? []) as string[]).map(t => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              </div>
            </BASection>
          );
        })}
      </div>
    </BALayout>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && <span className="text-muted-foreground">—</span>}
        {items.map(i => (
          <Badge key={i} variant="outline" className={tone === "warn" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]" : "text-[10px]"}>{i}</Badge>
        ))}
      </div>
    </div>
  );
}