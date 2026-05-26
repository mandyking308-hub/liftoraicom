import { useEffect, useState } from "react";
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBackups, BACKUP_STATUS_META, RISK_META, type BackupStatusRecord } from "@/lib/backupRecoveryEngine";

export default function BRStatus() {
  const [rows, setRows] = useState<BackupStatusRecord[]>([]);
  useEffect(() => { fetchBackups().then(setRows).catch(() => setRows([])); }, []);
  return (
    <BRLayout title="Backup Status Dashboard" subtitle="Per-system backup status, last verified time and storage location. Unknown / failed systems with high or critical risk are surfaced as warnings.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">System</th><th className="text-left p-2">Type</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Risk</th>
            <th className="text-left p-2">Last backup</th><th className="text-left p-2">Last verified</th>
            <th className="text-left p-2">Storage</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No backup records yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{r.system_name}
                  {r.audit_metadata?.live_internal_test && <Badge variant="outline" className="ml-2 text-[9px] bg-muted">TEST</Badge>}
                </td>
                <td className="p-2">{r.backup_type}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${BACKUP_STATUS_META[r.backup_status]?.cls ?? ""}`}>{BACKUP_STATUS_META[r.backup_status]?.label ?? r.backup_status}</Badge></td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${RISK_META[r.risk_level]?.cls ?? ""}`}>{RISK_META[r.risk_level]?.label ?? r.risk_level}</Badge></td>
                <td className="p-2 text-muted-foreground">{r.last_backup_at ? new Date(r.last_backup_at).toLocaleString() : "—"}</td>
                <td className="p-2 text-muted-foreground">{r.last_verified_at ? new Date(r.last_verified_at).toLocaleString() : "—"}</td>
                <td className="p-2 text-muted-foreground max-w-xs truncate">{r.storage_location_summary ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </BRLayout>
  );
}