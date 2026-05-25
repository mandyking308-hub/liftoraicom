import { useEffect, useState } from "react";
import { EMLayout, EMSection, EMStat } from "./_shared";
import { fetchAdviserQuestions, fetchAssignments, fetchEntities, fetchPolicies, fetchRoutingRules, type AdviserQuestion, type EntityAssignment, type LegalEntity, type PolicyAssignment, type RevenueRoutingRule } from "@/lib/entityMapEngine";
import { Badge } from "@/components/ui/badge";

export default function EMOverview() {
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
  const mappedBusinesses = new Set(assigns.map(a => a.business_id)).size;
  const adviserOpen = questions.filter(q => q.status === "draft" || q.status === "adviser_review").length;
  const missingPolicies = policies.filter(p => p.policy_status === "missing").length;
  return (
    <EMLayout title="Entity / Legal / Tax Map" subtitle="Which legal entity owns/runs each business, where revenue belongs, what policies apply, and what needs adviser review across UK, Delaware, Dubai and future jurisdictions.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <EMStat label="Legal entities" value={entities.length} />
        <EMStat label="Mapped businesses" value={mappedBusinesses} />
        <EMStat label="Revenue routing rules" value={rules.length} />
        <EMStat label="Open adviser items" value={adviserOpen} tone={adviserOpen > 0 ? "warn" : "good"} />
      </div>
      <EMSection title="Entities" description="Current legal entities Liftor businesses can be mapped to.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {entities.map(e => (
            <div key={e.id} className="border border-border/50 rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{e.entity_name}</p>
                <Badge variant="outline" className={e.active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]" : "text-[10px]"}>{e.active ? "Active" : "Disabled"}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{e.entity_type} · {e.jurisdiction}</p>
              <p className="text-[11px] text-muted-foreground">FYE {e.financial_year_end ?? "—"}</p>
            </div>
          ))}
        </div>
      </EMSection>
      {missingPolicies > 0 && (
        <EMSection title="Watch — missing policies" description="Policies marked 'missing' across all mapped businesses.">
          <p className="text-xs text-yellow-400">{missingPolicies} policy assignment{missingPolicies === 1 ? "" : "s"} marked missing. Sales / publishing should warn until these are approved/published.</p>
        </EMSection>
      )}
    </EMLayout>
  );
}