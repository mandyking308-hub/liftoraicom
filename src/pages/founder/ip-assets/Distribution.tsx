import { useEffect, useMemo, useState } from "react";
import { IPLayout, IPSection, AssetTypeBadge, RightsStatusBadge, shortId } from "./_shared";
import {
  fetchAssets, fetchOpportunities,
  type DigitalAsset, type LicensingOpportunity,
} from "@/lib/ipAssetsEngine";

const DISTRIBUTION_TYPES = ["distribution", "marketplace_listing", "sync", "brand_use"];

export default function IPDistribution() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [opps, setOpps] = useState<LicensingOpportunity[]>([]);
  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);

  const map = useMemo(() => {
    const byAsset = new Map<string, LicensingOpportunity[]>();
    for (const o of opps) {
      if (!o.asset_id) continue;
      if (!DISTRIBUTION_TYPES.includes(o.opportunity_type)) continue;
      const arr = byAsset.get(o.asset_id) ?? [];
      arr.push(o); byAsset.set(o.asset_id, arr);
    }
    return byAsset;
  }, [opps]);

  return (
    <IPLayout title="Distribution Map"
      subtitle="Where each asset is distributed externally (or proposed to be). No publishing or distribution change happens here — only mapping.">
      <IPSection title={`Distribution coverage — ${map.size}/${assets.length} assets`}
        description="Distribution / marketplace_listing / sync / brand_use opportunities grouped by asset.">
        {assets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assets to map.</p>
        ) : (
          <div className="space-y-2">
            {assets.map(a => {
              const list = map.get(a.id) ?? [];
              return (
                <div key={a.id} className="border border-border/50 rounded p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{a.asset_name}</span>
                    <AssetTypeBadge type={a.asset_type} />
                    <RightsStatusBadge status={a.rights_status} />
                    <span className="ml-auto text-muted-foreground">{list.length} channel{list.length === 1 ? "" : "s"}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No distribution mapped.</p>
                  ) : (
                    <ul className="text-[11px] space-y-0.5">
                      {list.map(o => (
                        <li key={o.id} className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{shortId(o.id)}</span>
                          <span>{o.opportunity_type}</span>
                          <span className="text-muted-foreground">· {o.opportunity_status}</span>
                          {(o.risk_flags ?? []).length > 0 && <span className="text-yellow-300">⚑ {(o.risk_flags ?? []).join(", ")}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </IPSection>
    </IPLayout>
  );
}
