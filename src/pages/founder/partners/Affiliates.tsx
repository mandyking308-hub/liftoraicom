import { useEffect, useState } from "react";
import { PALayout, PASection, OutreachBadge, PartnerTypeBadge, fmtMoney, shortId } from "./_shared";
import {
  fetchProspects, fetchReferrals,
  type PartnerProspect, type ReferralRecord,
} from "@/lib/partnerEngine";

const AFFILIATE_TYPES = ["affiliate", "creator", "reseller", "marketplace_partner"];

export default function PAAffiliates() {
  const [prospects, setProspects] = useState<PartnerProspect[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  useEffect(() => {
    fetchProspects().then(setProspects).catch(() => {});
    fetchReferrals().then(setReferrals).catch(() => {});
  }, []);
  const affiliates = prospects.filter(p => AFFILIATE_TYPES.includes(p.partner_type));

  return (
    <PALayout title="Affiliates"
      subtitle="Affiliate, creator, reseller and marketplace-partner roster. Affiliate invitations require approval before sending.">
      <PASection title={`Affiliate roster — ${affiliates.length}`}
        description="Filtered to affiliate / creator / reseller / marketplace_partner types.">
        {affiliates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No affiliates yet. Add prospects in the prospect board.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Fit</th>
                  <th className="text-right p-2">EV</th>
                  <th className="text-left p-2">Site</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map(a => (
                  <tr key={a.id} className="border-b border-border/30">
                    <td className="p-2 font-medium">{a.partner_name}</td>
                    <td className="p-2"><PartnerTypeBadge type={a.partner_type} /></td>
                    <td className="p-2"><OutreachBadge status={a.outreach_status} /></td>
                    <td className="p-2 text-muted-foreground">{a.category ?? "—"}</td>
                    <td className="p-2 text-right">{a.fit_score != null ? Number(a.fit_score).toFixed(0) : "—"}</td>
                    <td className="p-2 text-right">{fmtMoney(a.expected_value)}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[180px]">{a.website ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PASection>

      <PASection title="Referrals attributed to affiliate-type partners"
        description="Latest 25 referrals — finance ledger is the source of truth for payouts.">
        {referrals.slice(0, 25).length === 0 ? (
          <p className="text-xs text-muted-foreground">No referrals yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {referrals.slice(0, 25).map(r => (
              <li key={r.id} className="flex items-center gap-2 border-b border-border/30 py-1">
                <span className="font-mono text-muted-foreground">{shortId(r.id)}</span>
                <span>biz {shortId(r.business_id)}</span>
                <span className="ml-auto">{fmtMoney(r.value_amount, r.currency ?? "GBP")}</span>
                <span className="text-muted-foreground">→ comm {fmtMoney(r.commission_due, r.currency ?? "GBP")}</span>
              </li>
            ))}
          </ul>
        )}
      </PASection>
    </PALayout>
  );
}
