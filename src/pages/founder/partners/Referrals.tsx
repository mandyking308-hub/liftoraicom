import { useEffect, useState } from "react";
import { PALayout, PASection, ReferralBadge, shortId, fmtMoney } from "./_shared";
import { Button } from "@/components/ui/button";
import {
  fetchReferrals, updateReferralStatus, REFERRAL_STATUS_META,
  type ReferralRecord, type ReferralStatus,
} from "@/lib/partnerEngine";

export default function PAReferrals() {
  const [rows, setRows] = useState<ReferralRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const reload = () => fetchReferrals().then(setRows).catch(() => {});
  useEffect(() => { reload(); }, []);

  const move = async (id: string, status: ReferralStatus) => {
    setBusy(id);
    await updateReferralStatus(id, status).catch(() => {});
    setBusy(null);
    reload();
  };

  const counts = Object.keys(REFERRAL_STATUS_META).map(s => ({
    s: s as ReferralStatus,
    n: rows.filter(r => r.referral_status === s).length,
  }));

  return (
    <PALayout title="Referral Dashboard"
      subtitle="Every referral is tracked from intake to commission. Payout is approval-gated.">
      <div className="flex flex-wrap gap-2">
        {counts.map(c => (
          <div key={c.s} className="border border-border/50 rounded px-2 py-1 text-xs flex items-center gap-2">
            <ReferralBadge status={c.s} /><span className="text-muted-foreground">{c.n}</span>
          </div>
        ))}
      </div>

      <PASection title="Referrals" description={`${rows.length} total. Commission marked “paid” requires founder approval on payout.`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No referrals recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Ref</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Referrer</th>
                  <th className="text-left p-2">Referred</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Value</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/30">
                    <td className="p-2 font-mono">{shortId(r.id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(r.business_id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(r.referrer_contact_id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(r.referred_contact_id)}</td>
                    <td className="p-2"><ReferralBadge status={r.referral_status} /></td>
                    <td className="p-2 text-right">{fmtMoney(r.value_amount, r.currency ?? "GBP")}</td>
                    <td className="p-2 text-right">{fmtMoney(r.commission_due, r.currency ?? "GBP")}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {nextReferral(r.referral_status).map(s => (
                          <Button key={s} size="sm" variant="outline" disabled={busy === r.id}
                            className="h-6 text-[10px] px-2"
                            onClick={() => move(r.id, s)}>
                            → {REFERRAL_STATUS_META[s].label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PASection>
    </PALayout>
  );
}

function nextReferral(s: ReferralStatus): ReferralStatus[] {
  switch (s) {
    case "new":       return ["qualified", "rejected"];
    case "qualified": return ["converted", "cancelled"];
    case "converted": return ["paid", "cancelled"];
    case "rejected":  return ["qualified"];
    case "paid":      return [];
    case "cancelled": return [];
    default: return [];
  }
}
