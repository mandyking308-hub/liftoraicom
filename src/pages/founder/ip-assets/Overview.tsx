import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IPLayout, IPSection, IPStat, fmtMoney } from "./_shared";
import {
  fetchAssets, fetchRights, fetchOpportunities, summarize, diagnose,
  type DigitalAsset, type RightsRecord, type LicensingOpportunity,
} from "@/lib/ipAssetsEngine";

export default function IPOverview() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [rights, setRights] = useState<RightsRecord[]>([]);
  const [opps, setOpps] = useState<LicensingOpportunity[]>([]);
  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchRights().then(setRights).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);
  const sum = summarize(assets, rights, opps);
  const diags = diagnose(assets, rights, opps);

  return (
    <IPLayout title="Digital Asset / IP / Licensing Engine"
      subtitle="Music, video, courses, templates, domains, AI-generated content, datasets and brand IP — all catalogued with rights and licensing tracked. External licensing contact, publishing, distribution changes and rights transfers require approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <IPStat label="Assets" value={sum.assets_active} hint={`${sum.assets_total} total`} />
        <IPStat label="Unknown rights" value={sum.unknown_rights} hint={`${sum.disputed} disputed`} />
        <IPStat label="Expired" value={sum.expired_status} hint={`${sum.rights_expiring_soon} expiring 30d`} />
        <IPStat label="Opportunities" value={sum.opps_total} hint={`${sum.opps_active} active`} />
        <IPStat label="Approval queue" value={sum.opps_approval} hint={`${sum.opps_draft} drafts`} />
        <IPStat label="Open value" value={fmtMoney(sum.expected_value_open)} />
      </div>

      <IPSection title="IP / Licensing Agent — diagnostics"
        description="Catalogues assets, flags rights issues, finds licensing opportunities, prepares briefs, escalates legal/IP review. Agent never contacts licensees or publishes."
        actions={<Link to="/founder/ip-assets/risks" className="text-xs text-primary hover:underline">Rights risks →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No IP warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {diags.slice(0, 80).map((d, i) => (
              <li key={`${d.id}-${i}`} className="flex items-start gap-2">
                <span className={d.severity === "block" ? "text-destructive" : d.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </IPSection>

      <IPSection title="Integrations">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          {[
            { to: "/founder/product-catalogue", label: "Product Catalogue — link assets to offers" },
            { to: "/founder/portfolio-exit", label: "Portfolio Exit — asset valuation & data room" },
            { to: "/founder/contracts", label: "Contracts — licence & rights agreements" },
            { to: "/founder/manuals", label: "Manuals — IP handling runbooks" },
            { to: "/founder/approval-queue", label: "Approval Queue — publishing / licensing gates" },
            { to: "/founder/legal", label: "Legal — escalations" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="border border-border/50 rounded p-2 hover:bg-secondary">{l.label}</Link>
          ))}
        </div>
      </IPSection>
    </IPLayout>
  );
}
