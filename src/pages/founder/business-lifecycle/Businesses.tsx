import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BLLayout, BLSection, StageBadge } from "./_shared";
import {
  fetchStages, fetchAssignments, currentByBusiness, requestTransition,
  type LifecycleStage, type Assignment, type StageCode,
} from "@/lib/businessLifecycleEngine";
import { toast } from "sonner";

export default function BLBusinesses() {
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [asgs, setAsgs] = useState<Assignment[]>([]);
  const [target, setTarget] = useState<Record<string, StageCode>>({});
  const load = () => {
    fetchStages().then(setStages).catch(() => {});
    fetchAssignments().then(setAsgs).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const stageById = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages]);
  const current = useMemo(() => Array.from(currentByBusiness(asgs).values()), [asgs]);

  const propose = async (business_id: string, from: StageCode | null) => {
    const to = target[business_id];
    if (!to) { toast.error("Pick a target stage"); return; }
    if (to === from) { toast.error("Already in that stage"); return; }
    try {
      const ev = await requestTransition({ business_id, from_stage: from, to_stage: to, transition_reason: "Manual request via Lifecycle UI" });
      toast.success(ev.approval_required ? "Transition queued for founder confirmation." : "Transition recorded.");
    } catch (e: any) { toast.error(e?.message ?? "Failed to queue transition"); }
  };

  return (
    <BLLayout title="Business stage map" subtitle="Current lifecycle stage for every business and quick request to move stage. Meaningful transitions are queued for founder confirmation.">
      <BLSection title={`Businesses (${current.length})`}>
        {current.length === 0 ? (
          <p className="text-xs text-muted-foreground">No businesses assigned to lifecycle stages yet.</p>
        ) : (
          <ul className="space-y-2">
            {current.map(a => {
              const stage = stageById.get(a.stage_id);
              const code = (stage?.stage_code ?? "idea") as StageCode;
              return (
                <li key={a.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px]">{a.business_id.slice(0, 8)}</span>
                    <StageBadge code={code} />
                    {a.founder_approved_at
                      ? <span className="text-[10px] text-emerald-400">Founder-approved</span>
                      : <span className="text-[10px] text-yellow-300">Awaiting confirmation</span>}
                    <span className="ml-auto text-muted-foreground">Entered {new Date(a.entered_at).toLocaleDateString()}</span>
                  </div>
                  {a.reason && <p className="text-muted-foreground">{a.reason}</p>}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <select
                      value={target[a.business_id] ?? ""}
                      onChange={e => setTarget(t => ({ ...t, [a.business_id]: e.target.value as StageCode }))}
                      className="bg-background border border-border/50 rounded px-2 py-1 text-[11px]">
                      <option value="">Move to…</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.stage_code}>{s.stage_name}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => propose(a.business_id, code)}>
                      Request transition
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </BLSection>
    </BLLayout>
  );
}