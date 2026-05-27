import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFabric, summarizeFabric, type FabricSummary } from "@/lib/contextFabricEngine";

const stateClass: Record<FabricSummary["activation_state"], string> = {
  ready: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  watch: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  blocked: "text-rose-400 border-rose-500/40 bg-rose-500/10",
};

export function FabricActivationCard() {
  const [sum, setSum] = useState<FabricSummary | null>(null);
  useEffect(() => {
    fetchFabric().then((d) => setSum(summarizeFabric(d))).catch(() => setSum(null));
  }, []);

  return (
    <Link to="/founder/context-fabric" className="tech-card block p-4 hover:border-primary/60 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Fabric Activation Status</div>
          <div className="text-sm font-semibold">Business Context Fabric</div>
        </div>
        {sum && (
          <span className={`text-[10px] px-2 py-1 rounded border uppercase ${stateClass[sum.activation_state]}`}>
            {sum.activation_state}
          </span>
        )}
      </div>
      {!sum ? (
        <p className="text-xs text-muted-foreground">Loading runtime state…</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <Metric label="Envelope Health" value={`${sum.envelope_health_pct}%`} sub={`${sum.envelopes_ready}/${sum.businesses} ready`} />
          <Metric label="Contract Integrity" value={`${sum.contract_integrity_pct}%`} sub={`${sum.contracts_active} active`} />
          <Metric label="Open Warnings" value={String(sum.open_warnings)} sub={`${sum.draft_repairs} repairs draft`} />
        </div>
      )}
    </Link>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}