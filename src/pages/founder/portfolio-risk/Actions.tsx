import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRLayout, PRSection, SeverityBadge } from "./_shared";
import {
  fetchRiskItems, updateRiskItemStatus,
  CATEGORY_FIX_LINK, CATEGORY_LABEL,
  type RiskItem, type ItemStatus,
} from "@/lib/portfolioRiskEngine";

const STATUS_FILTERS: ItemStatus[] = ["open", "acknowledged", "resolved", "accepted"];

export default function PRActions() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [filter, setFilter] = useState<ItemStatus | "all">("open");
  const load = () => fetchRiskItems().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);
  const setStatus = async (id: string, s: ItemStatus) => { await updateRiskItemStatus(id, s); load(); };
  return (
    <PRLayout title="Risk action queue" subtitle="Acknowledge, resolve or accept risk items. External or irreversible mitigations remain approval-gated inside the linked module.">
      <PRSection title="Filters">
        <div className="flex gap-1 flex-wrap text-xs">
          {(["all", ...STATUS_FILTERS] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2 py-1 rounded border ${filter === s ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </PRSection>
      <PRSection title={`Items (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map(i => {
              const fix = CATEGORY_FIX_LINK[i.risk_category];
              return (
                <li key={i.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px]">{i.business_id.slice(0, 8)}</span>
                    <SeverityBadge severity={i.severity} />
                    <span className="text-muted-foreground">{CATEGORY_LABEL[i.risk_category] ?? i.risk_category}</span>
                    <span className="text-muted-foreground">· {i.status}</span>
                    {fix && <Link to={fix.to} className="ml-auto text-primary hover:underline">Open {fix.label} →</Link>}
                  </div>
                  <p>{i.risk_summary}</p>
                  {i.recommended_action && <p className="text-muted-foreground">Action: {i.recommended_action}</p>}
                  <div className="flex gap-1 flex-wrap pt-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setStatus(i.id, "acknowledged")} disabled={i.status === "acknowledged"}>Acknowledge</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setStatus(i.id, "resolved")} disabled={i.status === "resolved"}>Resolve</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setStatus(i.id, "accepted")} disabled={i.status === "accepted"}>Accept</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PRSection>
    </PRLayout>
  );
}