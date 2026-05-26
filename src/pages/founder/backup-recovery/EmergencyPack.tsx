import { useEffect, useState } from "react";
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPacks, type EmergencyPack as Pack } from "@/lib/backupRecoveryEngine";

export default function BREmergencyPack() {
  const [rows, setRows] = useState<Pack[]>([]);
  useEffect(() => { fetchPacks().then(setRows).catch(() => setRows([])); }, []);
  return (
    <BRLayout title="Emergency Operating Pack" subtitle="Lightweight pack so a founder, adviser or trusted operator can keep the business running during an incident. Draft and review run internally; exporting/sharing requires founder approval. No raw secrets included.">
      <div className="grid md:grid-cols-2 gap-3">
        {rows.length === 0 && <Card className="tech-card p-6 text-center text-muted-foreground text-sm md:col-span-2">No emergency packs yet.</Card>}
        {rows.map(p => {
          const sections: any[] = Array.isArray(p.included_sections) ? p.included_sections : [];
          return (
            <Card key={p.id} className="tech-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{p.pack_name}</p>
                <Badge variant="outline" className="text-[10px] ml-auto">{p.pack_status}</Badge>
                {p.audit_metadata?.live_internal_test && <Badge variant="outline" className="text-[9px] bg-muted">TEST</Badge>}
              </div>
              {p.pack_summary && <p className="text-xs text-muted-foreground">{p.pack_summary}</p>}
              <p className="text-[10px] uppercase text-muted-foreground">Included sections</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                {sections.map((s: any, idx: number) => <li key={idx}>{typeof s === "string" ? s : s.label ?? JSON.stringify(s)}</li>)}
              </ul>
              <p className="text-[10px] text-muted-foreground">File: {p.generated_file_reference ?? "—"}</p>
            </Card>
          );
        })}
      </div>
    </BRLayout>
  );
}