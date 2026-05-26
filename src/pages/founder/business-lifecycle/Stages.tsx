import { useEffect, useState } from "react";
import { BLLayout, BLSection, StageBadge } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchStages, type LifecycleStage, type StageCode } from "@/lib/businessLifecycleEngine";

export default function BLStages() {
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  useEffect(() => { fetchStages().then(setStages).catch(() => {}); }, []);
  return (
    <BLLayout title="Stages" subtitle="Catalogue of lifecycle stages, allowed modules, required modules, required checks and external action policy.">
      <BLSection title={`Stages (${stages.length})`}>
        {stages.length === 0 ? (
          <p className="text-xs text-muted-foreground">No stages defined.</p>
        ) : (
          <div className="space-y-3">
            {stages.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StageBadge code={s.stage_code as StageCode} />
                  <span className="font-semibold">{s.stage_name}</span>
                  {s.approval_required_for_entry && (
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Founder confirmation</Badge>
                  )}
                  {!s.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                {s.description && <p className="text-muted-foreground">{s.description}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Block label="Allowed modules" items={s.allowed_modules} />
                  <Block label="Required modules" items={s.required_modules} tone="primary" />
                  <Block label="Allowed external actions" items={s.allowed_external_actions} tone="warn" />
                  <Block label="Required checks" items={s.required_checks} />
                </div>
              </div>
            ))}
          </div>
        )}
      </BLSection>
    </BLLayout>
  );
}

function Block({ label, items, tone }: { label: string; items: string[]; tone?: "primary" | "warn" }) {
  const cls = tone === "primary"
    ? "bg-primary/10 text-primary border-primary/30"
    : tone === "warn"
      ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
      : "bg-secondary text-muted-foreground border-border/50";
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map(i => (
            <span key={i} className={`px-1.5 py-0.5 rounded border text-[10px] ${cls}`}>{i}</span>
          ))}
        </div>
      )}
    </div>
  );
}