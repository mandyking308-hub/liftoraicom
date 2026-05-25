import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchArchetypes, fetchAssignments, type ArchetypeRow, type AssignmentRow } from "@/lib/businessArchetypeEngine";

export default function BusinessArchetypeCard() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  const [assigns, setAssigns] = useState<AssignmentRow[]>([]);
  useEffect(() => {
    fetchArchetypes().then(setArchetypes).catch(() => {});
    fetchAssignments().then(setAssigns).catch(() => {});
  }, []);
  const confirmed = assigns.filter(a => a.founder_confirmed).length;
  const hybrid = assigns.filter(a => (a.secondary_archetype_ids ?? []).length >= 1).length;
  const lowConf = assigns.filter(a => Number(a.confidence_score) < 0.4).length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers size={14} className="text-primary" />
          Business Archetype Classifier
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Archetypes" value={archetypes.length} />
          <Stat label="Assigned businesses" value={assigns.length} />
          <Stat label="Founder-confirmed" value={`${confirmed}/${assigns.length || 0}`} />
          <Stat label="Hybrid models" value={hybrid} />
        </div>
        {lowConf > 0 && (
          <p className="text-yellow-400">{lowConf} business{lowConf === 1 ? "" : "es"} with low confidence — review.</p>
        )}
        <div className="flex gap-2 pt-1">
          <Link to="/founder/business-archetypes" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/business-archetypes/classifier" className="text-primary hover:underline">Classifier</Link>
          <Link to="/founder/business-archetypes/business-map" className="text-primary hover:underline">Map</Link>
          <Link to="/founder/business-archetypes/recommendations" className="text-primary hover:underline">Recommendations</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}