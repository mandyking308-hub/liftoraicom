import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAdviserQuestions, fetchAssignments, fetchEntities, fetchPolicies, fetchRoutingRules, type AdviserQuestion, type EntityAssignment, type LegalEntity, type PolicyAssignment, type RevenueRoutingRule } from "@/lib/entityMapEngine";

export default function EntityMapCard() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [assigns, setAssigns] = useState<EntityAssignment[]>([]);
  const [rules, setRules] = useState<RevenueRoutingRule[]>([]);
  const [policies, setPolicies] = useState<PolicyAssignment[]>([]);
  const [questions, setQuestions] = useState<AdviserQuestion[]>([]);
  useEffect(() => {
    fetchEntities().then(setEntities).catch(() => {});
    fetchAssignments().then(setAssigns).catch(() => {});
    fetchRoutingRules().then(setRules).catch(() => {});
    fetchPolicies().then(setPolicies).catch(() => {});
    fetchAdviserQuestions().then(setQuestions).catch(() => {});
  }, []);
  const mapped = new Set(assigns.map(a => a.business_id)).size;
  const missing = policies.filter(p => p.policy_status === "missing").length;
  const adviser = questions.filter(q => q.status === "draft" || q.status === "adviser_review").length;
  const unrouted = rules.filter(r => r.adviser_review_required).length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale size={14} className="text-primary" />
          Entity / Legal / Tax Map
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Entities" value={entities.length} />
          <Stat label="Mapped businesses" value={mapped} />
          <Stat label="Adviser queue" value={adviser} />
          <Stat label="Routing rules" value={rules.length} />
        </div>
        {(missing > 0 || unrouted > 0) && (
          <p className="text-yellow-400">
            {missing > 0 && <>{missing} missing polic{missing === 1 ? "y" : "ies"}. </>}
            {unrouted > 0 && <>{unrouted} routing rule{unrouted === 1 ? "" : "s"} await adviser review.</>}
          </p>
        )}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/entity-map" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/entity-map/businesses" className="text-primary hover:underline">Business map</Link>
          <Link to="/founder/entity-map/revenue-routing" className="text-primary hover:underline">Revenue</Link>
          <Link to="/founder/entity-map/adviser-questions" className="text-primary hover:underline">Adviser</Link>
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