import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { COLayout, COSection, COEmpty, CO_STATUS_TONE } from "./_shared";

export default function CustomerOnboardingCustomers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("onboarding_records").select("*").order("created_at", { ascending: false }).limit(200)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <COLayout title="Onboarding pipeline" subtitle="Every customer who needs onboarding, by stage. Records are created automatically after confirmed sale or delivery order.">
      <COSection title="Customers">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <COEmpty title="No onboarding records yet" hint="Records appear automatically once a sale or delivery order is confirmed." /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/40">
                  <th className="py-2 pr-3">Record</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Welcome pack</th>
                  <th className="py-2 pr-3">Portal invite</th>
                  <th className="py-2 pr-3">Missing info</th>
                  <th className="py-2 pr-3">Completed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const missing = Array.isArray(r.missing_information) ? r.missing_information.length : 0;
                  return (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono">{r.id.slice(0, 8)}</td>
                      <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${CO_STATUS_TONE[r.onboarding_status] || ""}`}>{r.onboarding_status}</Badge></td>
                      <td className="py-2 pr-3">{r.onboarding_stage || "—"}</td>
                      <td className="py-2 pr-3">{r.welcome_pack_sent ? "sent" : r.welcome_pack_prepared ? "prepared · awaiting approval" : "—"}</td>
                      <td className="py-2 pr-3">{r.portal_invite_sent ? "sent" : r.portal_invite_prepared ? "prepared · awaiting approval" : "—"}</td>
                      <td className="py-2 pr-3">{missing > 0 ? <span className="text-yellow-400">{missing} item(s)</span> : "—"}</td>
                      <td className="py-2 pr-3">{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </COSection>
    </COLayout>
  );
}