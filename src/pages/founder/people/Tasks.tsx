import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty, PPL_TASK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const COLUMNS: { key: string; label: string }[] = [
  { key: "drafted", label: "Drafted" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "completed", label: "Completed" },
];

export default function PeopleTasks() {
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [ops, setOps] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("human_operator_tasks")
      .select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(300)
      .then(({ data }: any) => setTasks(data ?? []));
    (supabase as any).from("human_operators").select("id,name").then(({ data }: any) => {
      const map: Record<string, any> = {};
      (data ?? []).forEach((o: any) => { map[o.id] = o; });
      setOps(map);
    });
  }, []);

  const now = Date.now();

  return (
    <PPLLayout title="Task board" subtitle="Internal task planning for human operators. Drafted tasks marked approval-required do not get assigned until the founder approves. Overdue tasks are escalated by the Human Oversight Agent.">
      <PPLSection title="Board">
        {!tasks ? <p className="text-xs text-muted-foreground">Loading…</p>
          : tasks.length === 0 ? <PPLEmpty title="No tasks yet" hint="The Human Oversight Agent will draft tasks here when work needs a human." />
          : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {COLUMNS.map((c) => {
                const col = tasks.filter((t) => t.task_status === c.key);
                return (
                  <div key={c.key} className="rounded border border-border/40 p-2 space-y-2 min-h-[120px]">
                    <p className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">{c.label}<span>{col.length}</span></p>
                    {col.map((t) => {
                      const overdue = t.due_at && new Date(t.due_at).getTime() < now && !["completed", "cancelled"].includes(t.task_status);
                      return (
                        <div key={t.id} className="rounded border border-border/40 p-2 text-[11px] space-y-1 bg-card/40">
                          <p className="font-medium text-xs">{t.task_title}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className={PPL_TASK_TONE[t.task_status] || ""}>{t.task_status}</Badge>
                            <Badge variant="outline">{t.priority}</Badge>
                            {t.approval_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval</Badge>}
                            {overdue && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">overdue</Badge>}
                          </div>
                          <p className="text-muted-foreground">{ops[t.operator_id]?.name || "Unassigned"}{t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString()}` : ""}</p>
                          {t.source_agent && <p className="text-muted-foreground">via {t.source_agent}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}