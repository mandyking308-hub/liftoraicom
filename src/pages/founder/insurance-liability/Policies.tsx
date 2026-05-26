import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InsLayout, InsSection, PolicyTypeBadge, PolicyStatusBadge, fmtMoney, shortId } from "./_shared";
import {
  fetchPolicies, updatePolicyStatus, POLICY_STATUS_META,
  type InsurancePolicy, type PolicyStatus,
} from "@/lib/insuranceLiabilityEngine";

export default function InsurancePolicies() {
  const [rows, setRows] = useState<InsurancePolicy[]>([]);
  const load = () => fetchPolicies().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: PolicyStatus) {
    try {
      await updatePolicyStatus(id, status);
      toast.success(`Policy marked ${POLICY_STATUS_META[status].label}. External action still requires approval.`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  }

  const now = Date.now();

  return (
    <InsLayout title="Policy tracker"
      subtitle="Every policy across the portfolio. Renewal warnings appear inline. Buying, changing or cancelling cover requires approval and adviser communication.">
      <InsSection title={`Policies (${rows.length})`} description="Internal status only — no automatic insurer contact.">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No policy records yet. Add via the Insurance Agent.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Insurer</th>
                  <th className="text-right p-2">Cover</th>
                  <th className="text-left p-2">Renewal</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Internal action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const renewMs = p.renewal_date ? new Date(p.renewal_date).getTime() - now : null;
                  const renewCls = renewMs == null ? "" : renewMs < 0 ? "text-destructive" : renewMs < 1000 * 60 * 60 * 24 * 30 ? "text-yellow-300" : "text-muted-foreground";
                  return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-secondary/30">
                      <td className="p-2"><PolicyTypeBadge t={p.policy_type} /></td>
                      <td className="p-2 text-muted-foreground">{shortId(p.business_id)}</td>
                      <td className="p-2">{p.insurer_name ?? "—"}<div className="text-[10px] text-muted-foreground">{p.policy_summary?.slice(0, 60)}</div></td>
                      <td className="p-2 text-right font-mono">{fmtMoney(p.cover_amount, p.currency ?? "GBP")}</td>
                      <td className={`p-2 ${renewCls}`}>{p.renewal_date ?? "—"}</td>
                      <td className="p-2"><PolicyStatusBadge s={p.policy_status} /></td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {(["review_required", "quote_needed", "active", "expired", "cancelled"] as PolicyStatus[]).filter(s => s !== p.policy_status).map(s => (
                            <button key={s} onClick={() => setStatus(p.id, s)}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-border/50 hover:bg-secondary">
                              {POLICY_STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </InsSection>
    </InsLayout>
  );
}