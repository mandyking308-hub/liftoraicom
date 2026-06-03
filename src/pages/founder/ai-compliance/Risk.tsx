import { useEffect, useMemo, useState } from "react";
import { AICLayout, AICSection, RiskBadge, EmptyState } from "./_shared";
import {
  fetchSystems, fetchFlows, fetchOversight, classifyRisk,
  type AIComplianceSystem, type AIDataFlowRecord, type AIHumanOversightRecord,
} from "@/lib/aiComplianceEngine";

export default function AICRisk() {
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [flows, setFlows] = useState<AIDataFlowRecord[]>([]);
  const [oversight, setOversight] = useState<AIHumanOversightRecord[]>([]);
  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
    fetchFlows().then(setFlows).catch(() => {});
    fetchOversight().then(setOversight).catch(() => {});
  }, []);
  const flowSys = useMemo(() => new Set(flows.map(f => f.system_id).filter(Boolean) as string[]), [flows]);
  const oversightSys = useMemo(() => new Set(oversight.map(o => o.system_id).filter(Boolean) as string[]), [oversight]);
  return (
    <AICLayout title="Risk Classifier" subtitle="Deterministic per-system classification. Score = sum of weighted factors. Not a black-box AI score.">
      <AICSection title="Per-system classification" description={`${systems.length} systems`}>
        {systems.length === 0 ? <EmptyState title="No systems to classify yet." /> : (
          <div className="space-y-2">
            {systems.map(s => {
              const r = classifyRisk(s, { hasDataFlow: flowSys.has(s.id), hasOversight: oversightSys.has(s.id) });
              return (
                <div key={s.id} className="border border-border/40 rounded p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{s.system_name}</span>
                    <span className="text-muted-foreground">{s.system_type} · {s.autonomy_level.replace(/_/g," ")}</span>
                    <RiskBadge level={r.level} />
                    <span className="ml-auto text-[10px] text-muted-foreground">score {r.score}</span>
                  </div>
                  <ul className="text-[11px] text-muted-foreground list-disc pl-5">
                    {r.reasons.map((rsn, i) => <li key={i}>{rsn}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </AICSection>
    </AICLayout>
  );
}