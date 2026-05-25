import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RALayout, RASection, RAEmpty } from "./_shared";

type Task = {
  id: string; task_type: string; title: string; detail: string | null;
  priority: string; estimated_value: number | null; currency: string;
  due_at: string | null; assigned_agent: string | null;
  approval_required: boolean; status: string; created_at: string;
};

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function RevenueAutopilotTasks() {
  const [rows, setRows] = useState<Task[]>([]);
  const load = () => supabase.from("revenue_autopilot_tasks").select("*").order("priority").order("due_at", { ascending: true, nullsFirst: false }).limit(500)
    .then(r => setRows((r.data as Task[]) || []));
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("revenue_autopilot_tasks").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); load(); }
  };

  return (
    <RALayout title="Tasks" subtitle="Revenue Task Queue. Internal preparation runs immediately; tasks flagged approval_required cannot trigger external action without founder sign-off.">
      {rows.length === 0 ? <RAEmpty title="No tasks queued" hint="Tasks are created live as the Revenue Manager Agent and downstream agents detect work." /> : (
        <RASection title={`Open & in-progress (${rows.filter(r => r.status !== "done" && r.status !== "dismissed").length})`}>
          <div className="space-y-2">
            {rows.map(t => (
              <div key={t.id} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.task_type} · {t.assigned_agent || "unassigned"}{t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString()}` : ""}{(t.estimated_value || 0) > 0 ? ` · ~${t.currency} ${Math.round(t.estimated_value || 0).toLocaleString()}` : ""}
                    </p>
                    {t.detail && <p className="text-[11px] text-muted-foreground">{t.detail}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className={`text-[10px] ${priorityTone[t.priority] || ""}`}>{t.priority}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                    {t.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={t.status === "in_progress"} onClick={() => setStatus(t.id, "in_progress")}>Start</Button>
                  <Button size="sm" variant="outline" disabled={t.status === "done"} onClick={() => setStatus(t.id, "done")}>Done</Button>
                  <Button size="sm" variant="ghost" disabled={t.status === "dismissed"} onClick={() => setStatus(t.id, "dismissed")}>Dismiss</Button>
                </div>
              </div>
            ))}
          </div>
        </RASection>
      )}
    </RALayout>
  );
}