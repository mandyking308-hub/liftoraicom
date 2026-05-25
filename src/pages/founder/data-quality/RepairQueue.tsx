import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DQLayout, DQSection, DQEmpty, NoAutoDeleteBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { DQ_ACTION_LABEL, DQ_ACTION_STATUS_TONE } from "@/lib/dataQualityEngine";

type Action = {
  id: string; finding_id: string | null; action_type: string;
  action_status: string; irreversible: boolean; founder_approval_required: boolean;
  approved_by: string | null; approved_at: string | null; completed_at: string | null;
  created_at: string; audit_metadata: any;
};

const STATUS_ORDER = ["draft", "approval_required", "approved", "completed", "failed", "cancelled"];

export default function DataQualityRepairQueue() {
  const [rows, setRows] = useState<Action[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("data_repair_actions").select("*").order("created_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);

  return (
    <DQLayout title="Repair queue" subtitle="Every repair action drafted by the Data Quality Agent. Merge, delete and irreversible actions stay gated behind founder approval. Manual reviews are tracked here so nothing falls through.">
      <NoAutoDeleteBanner />
      {rows.length === 0 ? (
        <DQEmpty title="No repair actions queued" hint="As the agent detects findings it will draft repair actions here." />
      ) : (
        STATUS_ORDER.map(status => {
          const col = rows.filter(r => r.action_status === status);
          if (col.length === 0) return null;
          return (
            <DQSection key={status} title={`${status.replace("_", " ")} (${col.length})`}>
              <div className="space-y-2">
                {col.map(a => (
                  <div key={a.id} className="rounded border border-border/50 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{DQ_ACTION_LABEL[a.action_type] ?? a.action_type}</Badge>
                      <Badge variant="outline" className={`${DQ_ACTION_STATUS_TONE[a.action_status]} text-[10px]`}>{a.action_status.replace("_", " ")}</Badge>
                      {a.irreversible && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">irreversible</Badge>}
                      {a.founder_approval_required && !a.approved_at && (
                        <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">awaiting founder approval</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Created {new Date(a.created_at).toLocaleString()}
                      {a.finding_id ? ` · finding ${a.finding_id.slice(0, 8)}` : ""}
                      {a.approved_at ? ` · approved by ${a.approved_by ?? "founder"} ${new Date(a.approved_at).toLocaleString()}` : ""}
                      {a.completed_at ? ` · completed ${new Date(a.completed_at).toLocaleString()}` : ""}
                    </p>
                    {a.audit_metadata?.summary && <p className="text-xs">{a.audit_metadata.summary}</p>}
                  </div>
                ))}
              </div>
            </DQSection>
          );
        })
      )}
    </DQLayout>
  );
}