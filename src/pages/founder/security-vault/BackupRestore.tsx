import { SVLayout, SVCard, CheckList, ApprovalBoundary, VAULT_APPROVAL_GATES } from "./_shared";
import { Card } from "@/components/ui/card";
import { Database, BookOpen, AlertTriangle } from "lucide-react";
import { GITHUB_PROTECTION_CHECKLIST, RESTORE_RUNBOOK_STEPS, SUPABASE_BACKUP_CHECKLIST } from "@/lib/securityVaultData";

export default function BackupRestore() {
  return (
    <SVLayout title="Backup &amp; Restore Runbook" subtitle="Checklists and step-by-step restore guidance. No data is exported or restored automatically by this page.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SVCard title="GitHub Protection Checklist" icon={BookOpen}>
          <CheckList items={GITHUB_PROTECTION_CHECKLIST} />
        </SVCard>
        <SVCard title="Supabase Backup Checklist" icon={Database}>
          <CheckList items={SUPABASE_BACKUP_CHECKLIST} />
          <p className="text-[11px] text-amber-300 mt-2 flex items-center gap-1"><AlertTriangle size={11} /> Customer data export is gated · founder approval required.</p>
        </SVCard>
      </div>

      <Card className="tech-card p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><BookOpen size={14} className="text-primary" /> Restore Runbook</p>
        <ol className="space-y-3">
          {RESTORE_RUNBOOK_STEPS.map((s, i) => (
            <li key={i} className="text-xs">
              <p className="font-medium">{i + 1}. {s.title}</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-0.5 mt-1">
                {s.steps.map((st, j) => <li key={j}>{st}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </Card>

      <ApprovalBoundary items={VAULT_APPROVAL_GATES} />
    </SVLayout>
  );
}