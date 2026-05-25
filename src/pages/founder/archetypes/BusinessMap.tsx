import { useEffect, useState } from "react";
import { BALayout, BASection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchArchetypes, fetchAssignments, type ArchetypeRow, type AssignmentRow } from "@/lib/businessArchetypeEngine";
import { Link } from "react-router-dom";

export default function ArchetypeBusinessMap() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  const [assigns, setAssigns] = useState<AssignmentRow[]>([]);
  useEffect(() => {
    fetchArchetypes().then(setArchetypes).catch(() => {});
    fetchAssignments().then(setAssigns).catch(() => {});
  }, []);
  const byId = new Map(archetypes.map(a => [a.id, a]));
  return (
    <BALayout title="Business map" subtitle="Portfolio view of every Liftor business and its assigned archetype.">
      <BASection title={`Businesses (${assigns.length})`}>
        {assigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet. Run the <Link className="text-primary underline" to="/founder/business-archetypes/classifier">Classifier</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assigns.map(a => {
              const p = a.primary_archetype_id ? byId.get(a.primary_archetype_id) : null;
              return (
                <div key={a.id} className="border border-border/50 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground truncate">{a.business_id}</p>
                    {a.founder_confirmed
                      ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Confirmed</Badge>
                      : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p?.archetype_name ?? "Unassigned"}</p>
                    <p className="text-[11px] text-muted-foreground">Confidence {(Number(a.confidence_score) * 100).toFixed(0)}%</p>
                  </div>
                  {a.secondary_archetype_ids?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {a.secondary_archetype_ids.map(sid => (
                        <Badge key={sid} variant="outline" className="text-[10px]">2°: {byId.get(sid)?.archetype_code ?? sid.slice(0, 6)}</Badge>
                      ))}
                    </div>
                  )}
                  {a.reason_summary && <p className="text-[11px] text-muted-foreground line-clamp-3">{a.reason_summary}</p>}
                </div>
              );
            })}
          </div>
        )}
      </BASection>
    </BALayout>
  );
}