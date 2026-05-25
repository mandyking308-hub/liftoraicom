import { useEffect, useState } from "react";
import { BCLayout, BCSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchTriggers, type ApprovalTrigger } from "@/lib/businessComplianceEngine";

const ACTION_CLS: Record<string, string> = {
  founder_approval: "bg-primary/15 text-primary border-primary/30",
  legal_review: "bg-destructive/15 text-destructive border-destructive/30",
  tax_review: "bg-destructive/15 text-destructive border-destructive/30",
  compliance_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  block: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export default function BCApprovalTriggers() {
  const [triggers, setTriggers] = useState<ApprovalTrigger[]>([]);
  useEffect(() => { fetchTriggers().then(setTriggers).catch(() => {}); }, []);
  return (
    <BCLayout title="Approval triggers" subtitle="Conditions that automatically require founder/legal/tax/compliance review before any external action proceeds.">
      <BCSection title="Active triggers" description={`${triggers.length} configured`}>
        {triggers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No triggers yet. Seed from By business page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Trigger</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Condition</th>
                  <th className="text-left p-2">Action required</th>
                  <th className="text-left p-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {triggers.map(t => (
                  <tr key={t.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{t.trigger_name}</td>
                    <td className="p-2 font-mono text-[10px]">{t.business_id.slice(0,8)}</td>
                    <td className="p-2 text-muted-foreground">{t.trigger_condition}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${ACTION_CLS[t.action_required] ?? "border-border/50"}`}>{t.action_required.replace(/_/g," ")}</Badge></td>
                    <td className="p-2">{t.active ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BCSection>
    </BCLayout>
  );
}