import { useEffect, useState } from "react";
import { IPLayout, IPSection } from "./_shared";
import {
  fetchAssets, fetchRights, fetchOpportunities, diagnose,
  type DigitalAsset, type RightsRecord, type LicensingOpportunity,
} from "@/lib/ipAssetsEngine";

export default function IPRisks() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [rights, setRights] = useState<RightsRecord[]>([]);
  const [opps, setOpps] = useState<LicensingOpportunity[]>([]);
  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchRights().then(setRights).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);
  const diags = diagnose(assets, rights, opps);
  const blocks = diags.filter(d => d.severity === "block");
  const warns = diags.filter(d => d.severity === "warn");
  const infos = diags.filter(d => d.severity === "info");

  return (
    <IPLayout title="Rights Risk Alerts"
      subtitle="Blocks halt external use until resolved. Warnings need IP Agent attention. Info items are housekeeping.">
      <IPSection title={`Blocking — ${blocks.length}`} description="External distribution is held until resolved.">
        {blocks.length === 0 ? <p className="text-xs text-muted-foreground">No blocking issues.</p> : (
          <ul className="text-xs space-y-1">
            {blocks.map((d, i) => <li key={`${d.id}-${i}`} className="text-destructive">• {d.message}</li>)}
          </ul>
        )}
      </IPSection>
      <IPSection title={`Warnings — ${warns.length}`}>
        {warns.length === 0 ? <p className="text-xs text-muted-foreground">No warnings.</p> : (
          <ul className="text-xs space-y-1">
            {warns.map((d, i) => <li key={`${d.id}-${i}`} className="text-yellow-300">• {d.message}</li>)}
          </ul>
        )}
      </IPSection>
      <IPSection title={`Info — ${infos.length}`}>
        {infos.length === 0 ? <p className="text-xs text-muted-foreground">No info items.</p> : (
          <ul className="text-xs space-y-1">
            {infos.map((d, i) => <li key={`${d.id}-${i}`} className="text-muted-foreground">• {d.message}</li>)}
          </ul>
        )}
      </IPSection>
    </IPLayout>
  );
}
