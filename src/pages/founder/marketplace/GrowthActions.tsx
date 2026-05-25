import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty, NoExternalActionBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { GrowthAction } from "@/lib/marketplaceGrowthEngine";
import { Lock } from "lucide-react";

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/60",
  approval_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  active_internal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function GrowthActions() {
  const [rows, setRows] = useState<GrowthAction[] | null>(null);
  useEffect(() => {
    (supabase as any).from("marketplace_growth_actions")
      .select("*").order("created_at", { ascending: false }).limit(200)
      .then((r: any) => setRows(r.data ?? []));
  }, []);

  return (
    <MPLayout title="Growth actions" subtitle="All recommended supply/demand actions. External outreach and campaigns stay approval-gated.">
      <NoExternalActionBanner />
      <MPSection title="Action queue">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
         rows.length === 0 ? <MPEmpty title="No growth actions queued" hint="The Marketplace Growth Agent creates draft actions when supply/demand cells fall out of balance." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border/40">
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Priority</th>
                <th className="text-left p-2">Assigned agent</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Approval</th>
                <th className="text-left p-2">Reason</th>
              </tr></thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{a.action_type}</td>
                    <td className="p-2">{a.category ?? "—"}</td>
                    <td className="p-2">{a.location ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{a.priority}</Badge></td>
                    <td className="p-2 text-muted-foreground">{a.assigned_agent ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusTone[a.action_status] ?? ""}`}>{a.action_status}</Badge></td>
                    <td className="p-2">{a.approval_required ? <span className="inline-flex items-center gap-1 text-yellow-300 text-[11px]"><Lock size={10} /> required</span> : <span className="text-[11px] text-muted-foreground">internal</span>}</td>
                    <td className="p-2 text-muted-foreground max-w-md">{a.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         )}
      </MPSection>
    </MPLayout>
  );
}