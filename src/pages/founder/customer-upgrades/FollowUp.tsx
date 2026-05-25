import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, CUEmpty, OPP_STATUS_TONE, fmtMoney } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function UpgradeFollowUp() {
  const sb: any = supabase as any;
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["cu-followup"],
    queryFn: async () => (await sb.from("customer_upgrade_opportunities").select("*").in("status", ["new", "watch", "approval_required", "approved"]).order("urgency_score", { ascending: false }).limit(100)).data ?? [],
  });

  const requestApproval = async (id: string) => {
    await sb.from("customer_upgrade_opportunities").update({ status: "approval_required" }).eq("id", id);
    toast.success("Sent for founder approval");
    qc.invalidateQueries({ queryKey: ["cu-followup"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };
  const approve = async (id: string) => {
    await sb.from("customer_upgrade_opportunities").update({ status: "approved" }).eq("id", id);
    toast.success("Approved · still no external message sent. Trigger via approved channel only.");
    qc.invalidateQueries({ queryKey: ["cu-followup"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };
  const reject = async (id: string) => {
    await sb.from("customer_upgrade_opportunities").update({ status: "lost" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cu-followup"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };
  const park = async (id: string) => {
    await sb.from("customer_upgrade_opportunities").update({ status: "parked" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cu-followup"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };

  return (
    <CULayout title="Upgrade Follow-Up & Approvals" subtitle="Internal queue for upgrade opportunities awaiting next step. External customer contact remains locked until pre-approved rule or founder approval.">
      <CUSection title={`Queue (${items.length})`} actions={<Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> External send locked</Badge>}>
        {items.length === 0 ? <CUEmpty title="No follow-ups" /> : (
          <div className="space-y-2">
            {items.map((o: any) => (
              <div key={o.id} className="rounded border border-border/50 p-3 text-xs space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{o.opportunity_type}</Badge>
                  <Badge variant="outline" className={OPP_STATUS_TONE[o.status] ?? ""}>{o.status}</Badge>
                  <span className="font-semibold">{fmtMoney(Number(o.estimated_value || 0), o.currency)}</span>
                  <span className="text-muted-foreground">Urg {(Number(o.urgency_score) * 100).toFixed(0)}%</span>
                </div>
                {o.recommended_pitch && <div className="p-2 rounded bg-background/40 border border-border/40">{o.recommended_pitch}</div>}
                {o.next_best_action && <div><span className="text-muted-foreground">Next: </span>{o.next_best_action}</div>}
                <div className="flex flex-wrap gap-1">
                  {o.status !== "approval_required" && o.status !== "approved" && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => requestApproval(o.id)}>Request approval</Button>}
                  {o.status === "approval_required" && <Button size="sm" className="h-7 text-[11px]" onClick={() => approve(o.id)}>Approve</Button>}
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => park(o.id)}>Park</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => reject(o.id)}>Lost</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CUSection>
    </CULayout>
  );
}