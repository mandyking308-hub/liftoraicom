import { useEffect, useState } from "react";
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchChecklists, type RecoveryChecklist } from "@/lib/backupRecoveryEngine";

export default function BRRestore() {
  const [rows, setRows] = useState<RecoveryChecklist[]>([]);
  useEffect(() => { fetchChecklists().then(setRows).catch(() => setRows([])); }, []);
  return (
    <BRLayout title="Restore / Recovery Checklists" subtitle="Recovery playbooks per scenario. Liftor does NOT run restores automatically — these are checklists for the founder/admin to execute under approval.">
      <div className="grid md:grid-cols-2 gap-3">
        {rows.length === 0 && <Card className="tech-card p-6 text-center text-muted-foreground text-sm md:col-span-2">No recovery checklists yet.</Card>}
        {rows.map(c => {
          const items: any[] = Array.isArray(c.checklist_items) ? c.checklist_items : [];
          return (
            <Card key={c.id} className="tech-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{c.checklist_name}</p>
                <Badge variant="outline" className="text-[10px]">{c.recovery_scenario}</Badge>
                <Badge variant="outline" className="text-[10px] ml-auto">{c.recovery_status}</Badge>
              </div>
              <ul className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                {items.map((i: any, idx: number) => <li key={idx}>{typeof i === "string" ? i : i.label ?? JSON.stringify(i)}</li>)}
              </ul>
              <p className="text-[10px] text-muted-foreground">Last tested: {c.last_tested_at ? new Date(c.last_tested_at).toLocaleDateString() : "never"}</p>
            </Card>
          );
        })}
      </div>
    </BRLayout>
  );
}