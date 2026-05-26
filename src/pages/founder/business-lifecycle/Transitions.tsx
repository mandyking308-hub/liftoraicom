import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BLLayout, BLSection, StageBadge } from "./_shared";
import {
  fetchTransitions, approveTransition,
  type TransitionEvent, type StageCode,
} from "@/lib/businessLifecycleEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BLTransitions() {
  const [trs, setTrs] = useState<TransitionEvent[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const load = () => fetchTransitions().then(setTrs).catch(() => {});
  useEffect(load, []);
  const filtered = trs.filter(t =>
    filter === "all" ? true :
    filter === "pending" ? (t.approval_required && !t.approved_at) :
    !!t.approved_at,
  );
  const approve = async (id: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { toast.error("Not signed in"); return; }
    try { await approveTransition(id, data.user.id); toast.success("Transition approved."); load(); }
    catch (e: any) { toast.error(e?.message ?? "Approval failed"); }
  };
  return (
    <BLLayout title="Transition queue" subtitle="Stage transitions requiring founder confirmation. Approval is recorded on the event for audit.">
      <BLSection title="Filters">
        <div className="flex gap-1 text-xs">
          {(["pending", "approved", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded border ${filter === f ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </BLSection>
      <BLSection title={`Transitions (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No transitions match this filter.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map(t => (
              <li key={t.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{t.business_id.slice(0, 8)}</span>
                  {t.from_stage ? <StageBadge code={t.from_stage as StageCode} /> : <span className="text-muted-foreground">(new)</span>}
                  <span className="text-muted-foreground">→</span>
                  <StageBadge code={t.to_stage as StageCode} />
                  {t.approved_at
                    ? <span className="ml-auto text-emerald-400">Approved {new Date(t.approved_at).toLocaleString()}</span>
                    : t.approval_required
                      ? <span className="ml-auto text-yellow-300">Awaiting approval</span>
                      : <span className="ml-auto text-muted-foreground">No approval required</span>}
                </div>
                {t.transition_reason && <p className="text-muted-foreground">{t.transition_reason}</p>}
                {!t.approved_at && t.approval_required && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => approve(t.id)}>
                    Approve transition
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </BLSection>
    </BLLayout>
  );
}