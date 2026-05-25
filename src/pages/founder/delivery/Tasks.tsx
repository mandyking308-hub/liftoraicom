import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DLLayout, DLSection, DLEmpty, STATUS_TONE } from "./_shared";

const COLS = ["pending", "in_progress", "approval_required", "blocked", "completed"];

export default function DeliveryTasks() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("delivery_tasks").select("*").order("created_at", { ascending: false }).limit(500)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <DLLayout title="Task board" subtitle="Internal fulfilment tasks. Customer-facing tasks are flagged and require founder approval before execution.">
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
        rows.length === 0 ? <DLEmpty title="No delivery tasks" hint="Tasks are generated from product/service templates when an order is created." /> :
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLS.map(col => {
            const items = rows.filter(t => t.task_status === col);
            return (
              <DLSection key={col} title={`${col.replace("_", " ")} (${items.length})`}>
                <div className="space-y-2">
                  {items.length === 0 ? <p className="text-[11px] text-muted-foreground">—</p> :
                    items.map(t => (
                      <div key={t.id} className="rounded border border-border/40 p-2 text-[11px] space-y-1">
                        <p className="font-medium">{t.task_name}</p>
                        <p className="text-muted-foreground">{t.task_type} · {t.assigned_to_type}</p>
                        <div className="flex flex-wrap gap-1">
                          {t.customer_visible && <Badge variant="outline" className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30">customer-visible</Badge>}
                          {t.founder_approval_required && <Badge variant="outline" className="text-[9px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval</Badge>}
                          {t.due_at && <Badge variant="outline" className="text-[9px]">due {new Date(t.due_at).toLocaleDateString()}</Badge>}
                        </div>
                        {t.blocker_reason && <p className="text-red-400">⚠ {t.blocker_reason}</p>}
                      </div>
                    ))
                  }
                </div>
              </DLSection>
            );
          })}
        </div>
      }
    </DLLayout>
  );
}