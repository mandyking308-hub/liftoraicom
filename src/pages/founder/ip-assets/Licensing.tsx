import { useEffect, useState } from "react";
import { IPLayout, IPSection, OpportunityStatusBadge, AssetTypeBadge, fmtMoney, shortId } from "./_shared";
import { Button } from "@/components/ui/button";
import {
  fetchAssets, fetchOpportunities, updateOpportunityStatus, OPPORTUNITY_STATUS_META,
  type DigitalAsset, type LicensingOpportunity, type OpportunityStatus,
} from "@/lib/ipAssetsEngine";

const COLUMNS: OpportunityStatus[] = ["draft", "approval_required", "approved", "contacted", "negotiated", "closed", "lost", "parked"];

export default function IPLicensing() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [opps, setOpps] = useState<LicensingOpportunity[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const reload = () => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  };
  useEffect(() => { reload(); }, []);

  const move = async (id: string, status: OpportunityStatus) => {
    setBusy(id);
    await updateOpportunityStatus(id, status).catch(() => {});
    setBusy(null);
    reload();
  };

  const assetById = new Map(assets.map(a => [a.id, a]));

  return (
    <IPLayout title="Licensing Opportunities"
      subtitle="Sync deals, brand-use, resale, distribution, marketplace listings and partnerships. External contact requires founder approval; expired or disputed rights block advancement.">
      <IPSection title="Pipeline" description={`${opps.length} opportunities across ${COLUMNS.length} stages.`}>
        <div className="grid md:grid-cols-4 gap-2">
          {COLUMNS.map(col => {
            const list = opps.filter(o => o.opportunity_status === col);
            const meta = OPPORTUNITY_STATUS_META[col];
            return (
              <div key={col} className="border border-border/50 rounded p-2 space-y-2 bg-card/40">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">{list.length}</span>
                </div>
                {list.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
                {list.map(o => {
                  const a = o.asset_id ? assetById.get(o.asset_id) : undefined;
                  return (
                    <div key={o.id} className="border border-border/50 rounded p-2 text-xs space-y-1 bg-background/50">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{a?.asset_name ?? shortId(o.asset_id)}</span>
                        {a && <AssetTypeBadge type={a.asset_type} />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{o.opportunity_type}</div>
                      <div className="text-[11px]">EV {fmtMoney(o.expected_value, o.currency ?? "GBP")}</div>
                      {(o.risk_flags ?? []).length > 0 && (
                        <p className="text-[10px] text-yellow-300">⚑ {(o.risk_flags ?? []).join(", ")}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {nextActions(col).map(s => (
                          <Button key={s} size="sm" variant="outline" disabled={busy === o.id}
                            className="h-6 text-[10px] px-2"
                            onClick={() => move(o.id, s)}>
                            → {OPPORTUNITY_STATUS_META[s].label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </IPSection>
    </IPLayout>
  );
}

function nextActions(s: OpportunityStatus): OpportunityStatus[] {
  switch (s) {
    case "draft":             return ["approval_required", "parked"];
    case "approval_required": return ["approved", "lost"];
    case "approved":          return ["contacted", "parked"];
    case "contacted":         return ["negotiated", "lost"];
    case "negotiated":        return ["closed", "lost"];
    case "closed":            return [];
    case "lost":              return ["draft"];
    case "parked":            return ["draft"];
    default: return [];
  }
}
