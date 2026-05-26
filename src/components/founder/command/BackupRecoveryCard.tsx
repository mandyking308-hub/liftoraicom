import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchBackups, fetchExports, fetchChecklists, fetchPacks, summarize, type BRSummary } from "@/lib/backupRecoveryEngine";

export default function BackupRecoveryCard() {
  const [sum, setSum] = useState<BRSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchBackups(), fetchExports(), fetchChecklists(), fetchPacks()])
      .then(([b,e,c,p]) => setSum(summarize(b,e,c,p)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Backup / Export / Recovery
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Exports gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Tracks backup status across business, customer, finance, document, AI and operational systems. Exports, restore operations and emergency pack generation require founder approval. No automatic restore.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/backup-recovery/status"         label="Healthy"          value={sum?.healthy} />
          <Tile to="/founder/backup-recovery/status"         label="Unknown"          value={sum?.unknown} cls={warn(sum?.unknown ?? 0)} />
          <Tile to="/founder/backup-recovery/status"         label="Failed"           value={sum?.failed} cls={bad(sum?.failed ?? 0)} />
          <Tile to="/founder/backup-recovery/status"         label="Critical at risk" value={sum?.critical_unknown_or_failed} cls={bad(sum?.critical_unknown_or_failed ?? 0)} />
          <Tile to="/founder/backup-recovery/exports"        label="Export approval"  value={sum?.exports_awaiting_approval} cls={warn(sum?.exports_awaiting_approval ?? 0)} />
          <Tile to="/founder/backup-recovery/emergency-pack" label="Emergency packs"  value={sum?.packs} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/backup-recovery" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/backup-recovery/status" className="text-primary hover:underline">Status</Link>
          <Link to="/founder/backup-recovery/exports" className="text-primary hover:underline">Exports</Link>
          <Link to="/founder/backup-recovery/restore" className="text-primary hover:underline">Restore</Link>
          <Link to="/founder/backup-recovery/emergency-pack" className="text-primary hover:underline">Emergency Pack</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}
*** Add File: src/pages/founder/backup-recovery/Overview.tsx
import { useEffect, useState } from "react";
import { BRLayout, BRStat } from "./_shared";
import { Card } from "@/components/ui/card";
import { fetchBackups, fetchExports, fetchChecklists, fetchPacks, summarize, type BRSummary } from "@/lib/backupRecoveryEngine";

export default function BROverview() {
  const [sum, setSum] = useState<BRSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchBackups(), fetchExports(), fetchChecklists(), fetchPacks()])
      .then(([b,e,c,p]) => setSum(summarize(b,e,c,p))).catch(() => setSum(null));
  }, []);
  return (
    <BRLayout title="Backup / Export / Recovery" subtitle="Backup visibility, export preparation, recovery checklists and emergency operating pack. Actual exports, restores and public sharing are founder-gated. Restore operations are never automatic.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <BRStat label="Systems tracked" value={sum?.systems ?? "—"} />
        <BRStat label="Healthy" value={sum?.healthy ?? "—"} tone="ok" />
        <BRStat label="Unknown" value={sum?.unknown ?? "—"} tone={sum?.unknown ? "warn" : undefined} />
        <BRStat label="Failed" value={sum?.failed ?? "—"} tone={sum?.failed ? "bad" : "ok"} />
        <BRStat label="Critical at risk" value={sum?.critical_unknown_or_failed ?? "—"} tone={sum?.critical_unknown_or_failed ? "bad" : "ok"} />
        <BRStat label="Export approvals" value={sum?.exports_awaiting_approval ?? "—"} tone={sum?.exports_awaiting_approval ? "warn" : undefined} />
      </div>
      <Card className="tech-card p-4 text-sm space-y-2">
        <p className="font-semibold">Engine guarantees</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>Backup status surfaced for known and unknown systems.</li>
          <li>Exports are prepared internally; generation requires founder approval.</li>
          <li>Recovery checklists per scenario; no automatic restore.</li>
          <li>Emergency operating pack drafted internally; sharing is approval-gated.</li>
          <li>Raw secrets are never included in exports — references only.</li>
        </ul>
      </Card>
      {sum?.top_alert && (
        <Card className="tech-card p-4 border-yellow-500/40">
          <p className="text-[11px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
          <p className="text-sm font-medium">{sum.top_alert.summary}</p>
        </Card>
      )}
      {sum && sum.test_records > 0 && (
        <p className="text-[11px] text-muted-foreground">Excluding {sum.test_records} LIVE_INTERNAL_TEST record(s) from operational totals.</p>
      )}
    </BRLayout>
  );
}
*** Add File: src/pages/founder/backup-recovery/Status.tsx
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
*** Add File: src/pages/founder/backup-recovery/Exports.tsx
import { useEffect, useState } from "react";
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchExports, EXPORT_STATUS_META, type ExportRequest } from "@/lib/backupRecoveryEngine";

export default function BRExports() {
  const [rows, setRows] = useState<ExportRequest[]>([]);
  useEffect(() => { fetchExports().then(setRows).catch(() => setRows([])); }, []);
  return (
    <BRLayout title="Export Request Board" subtitle="Internal export drafts. Generating sensitive exports (CRM, finance, documents, full business, adviser pack, data room, AI logs) requires founder approval. Raw secrets are never included.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">Type</th><th className="text-left p-2">Requested by</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Approval</th>
            <th className="text-left p-2">File</th><th className="text-left p-2">Updated</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No export requests yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{r.export_type}
                  {r.audit_metadata?.live_internal_test && <Badge variant="outline" className="ml-2 text-[9px] bg-muted">TEST</Badge>}
                </td>
                <td className="p-2">{r.requested_by ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${EXPORT_STATUS_META[r.export_status]?.cls ?? ""}`}>{EXPORT_STATUS_META[r.export_status]?.label ?? r.export_status}</Badge></td>
                <td className="p-2">{r.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Required</Badge> : <Badge variant="outline" className="text-[10px]">Not required</Badge>}</td>
                <td className="p-2 text-muted-foreground max-w-xs truncate">{r.generated_file_reference ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </BRLayout>
  );
}
*** Add File: src/pages/founder/backup-recovery/Restore.tsx
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
*** Add File: src/pages/founder/backup-recovery/EmergencyPack.tsx
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
*** Add File: src/pages/founder/backup-recovery/Settings.tsx
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function BRSettings() {
  return (
    <BRLayout title="Backup Recovery Settings" subtitle="Approval gates and integration map.">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Approval gates</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>Generating sensitive exports (CRM, finance, documents, full business, adviser pack, data room, AI logs).</li>
            <li>Sharing emergency operating pack outside founder/admin.</li>
            <li>Any restore or destructive recovery action.</li>
            <li>Creating public links to backup or export artifacts.</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Hard rules</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>No automatic restore — ever.</li>
            <li>Raw secrets are never written into exports — references only.</li>
            <li>Unknown / failed status on high or critical systems raises a watch item.</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2 md:col-span-2">
          <p className="font-semibold">Integrations</p>
          <p className="text-muted-foreground text-xs">Document Vault · Manuals · Access / Secrets · Incident Engine · Adviser Pack · Data Room · Command Centre. The Backup Recovery Agent tracks status and prepares checklists but never performs destructive operations.</p>
        </Card>
      </div>
    </BRLayout>
  );
}