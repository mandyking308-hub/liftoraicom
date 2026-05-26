import { supabase } from "@/integrations/supabase/client";

export type BackupType = "database"|"documents"|"manual"|"crm"|"finance"|"code"|"configuration"|"other";
export type BackupStatus = "unknown"|"healthy"|"warning"|"failed"|"not_configured";
export type ExportType = "full_business"|"crm"|"finance"|"documents"|"manuals"|"adviser_pack"|"data_room"|"ai_logs"|"settings"|"other";
export type ExportStatus = "draft"|"approval_required"|"approved"|"generated"|"failed"|"cancelled";
export type RecoveryScenario = "database_loss"|"provider_failure"|"account_lockout"|"security_incident"|"payment_failure"|"ai_gateway_failure"|"manual"|"other";
export type RecoveryStatus = "draft"|"active"|"needs_review"|"tested"|"retired";
export type PackStatus = "draft"|"review_required"|"approved"|"exported"|"archived";
export type RiskLevel = "low"|"medium"|"high"|"critical";

export interface BackupStatusRecord {
  id: string; system_name: string; business_id: string|null; backup_type: BackupType;
  backup_status: BackupStatus; last_backup_at: string|null; last_verified_at: string|null;
  storage_location_summary: string|null; risk_level: RiskLevel;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface ExportRequest {
  id: string; business_id: string|null; export_type: ExportType; export_status: ExportStatus;
  requested_by: string|null; founder_approval_required: boolean; generated_file_reference: string|null;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface RecoveryChecklist {
  id: string; business_id: string|null; recovery_scenario: RecoveryScenario;
  checklist_name: string; checklist_items: any; last_tested_at: string|null;
  recovery_status: RecoveryStatus; audit_metadata: any; created_at: string; updated_at: string;
}
export interface EmergencyPack {
  id: string; business_id: string|null; pack_name: string; pack_status: PackStatus;
  pack_summary: string|null; included_sections: any; generated_file_reference: string|null;
  audit_metadata: any; created_at: string; updated_at: string;
}

export const BACKUP_STATUS_META: Record<BackupStatus, { label: string; cls: string }> = {
  unknown:        { label:"Unknown",        cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  healthy:        { label:"Healthy",        cls:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  warning:        { label:"Warning",        cls:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  failed:         { label:"Failed",         cls:"bg-red-500/15 text-red-300 border-red-500/30" },
  not_configured: { label:"Not configured", cls:"bg-muted text-muted-foreground border-border/50" },
};
export const RISK_META: Record<RiskLevel, { label: string; cls: string }> = {
  low:      { label:"Low",      cls:"bg-blue-500/15 text-blue-300 border-blue-500/30" },
  medium:   { label:"Medium",   cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  high:     { label:"High",     cls:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  critical: { label:"Critical", cls:"bg-red-500/15 text-red-300 border-red-500/30" },
};
export const EXPORT_STATUS_META: Record<ExportStatus, { label: string; cls: string }> = {
  draft:             { label:"Draft",             cls:"bg-muted text-muted-foreground border-border/50" },
  approval_required: { label:"Approval required", cls:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  approved:          { label:"Approved",          cls:"bg-blue-500/15 text-blue-300 border-blue-500/30" },
  generated:         { label:"Generated",         cls:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed:            { label:"Failed",            cls:"bg-red-500/15 text-red-300 border-red-500/30" },
  cancelled:         { label:"Cancelled",         cls:"bg-muted text-muted-foreground border-border/50" },
};

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);

export async function fetchBackups(): Promise<BackupStatusRecord[]> {
  const { data } = await (supabase as any).from("backup_status_records").select("*").order("created_at",{ascending:false});
  return (data ?? []) as BackupStatusRecord[];
}
export async function fetchExports(): Promise<ExportRequest[]> {
  const { data } = await (supabase as any).from("export_requests").select("*").order("created_at",{ascending:false});
  return (data ?? []) as ExportRequest[];
}
export async function fetchChecklists(): Promise<RecoveryChecklist[]> {
  const { data } = await (supabase as any).from("recovery_checklists").select("*").order("created_at",{ascending:false});
  return (data ?? []) as RecoveryChecklist[];
}
export async function fetchPacks(): Promise<EmergencyPack[]> {
  const { data } = await (supabase as any).from("emergency_operating_packs").select("*").order("created_at",{ascending:false});
  return (data ?? []) as EmergencyPack[];
}

export interface BRSummary {
  systems: number; healthy: number; warning: number; failed: number; unknown: number; not_configured: number;
  critical_unknown_or_failed: number;
  exports: number; exports_awaiting_approval: number; exports_generated: number;
  checklists: number; checklists_needs_review: number;
  packs: number; packs_draft: number; packs_approved: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function summarize(
  backups: BackupStatusRecord[], exports_: ExportRequest[],
  checklists: RecoveryChecklist[], packs: EmergencyPack[],
): BRSummary {
  const live = backups.filter(b => !isTest(b.audit_metadata));
  const healthy = live.filter(b => b.backup_status === "healthy").length;
  const warning = live.filter(b => b.backup_status === "warning").length;
  const failed = live.filter(b => b.backup_status === "failed").length;
  const unknown = live.filter(b => b.backup_status === "unknown").length;
  const notCfg = live.filter(b => b.backup_status === "not_configured").length;
  const critical_unknown_or_failed = live.filter(b =>
    (b.risk_level === "critical" || b.risk_level === "high") &&
    (b.backup_status === "unknown" || b.backup_status === "failed" || b.backup_status === "not_configured")
  ).length;

  const liveExports = exports_.filter(e => !isTest(e.audit_metadata));
  const exApproval = liveExports.filter(e => e.export_status === "approval_required" || (e.export_status === "draft" && e.founder_approval_required)).length;
  const exGenerated = liveExports.filter(e => e.export_status === "generated").length;

  const liveChecks = checklists.filter(c => !isTest(c.audit_metadata));
  const checksNeedsReview = liveChecks.filter(c => c.recovery_status === "needs_review" || c.recovery_status === "draft").length;

  const livePacks = packs.filter(p => !isTest(p.audit_metadata));
  const packsDraft = livePacks.filter(p => p.pack_status === "draft" || p.pack_status === "review_required").length;
  const packsApproved = livePacks.filter(p => p.pack_status === "approved" || p.pack_status === "exported").length;

  const test = backups.filter(b => isTest(b.audit_metadata)).length
    + exports_.filter(e => isTest(e.audit_metadata)).length
    + checklists.filter(c => isTest(c.audit_metadata)).length
    + packs.filter(p => isTest(p.audit_metadata)).length;

  let top: BRSummary["top_alert"] = null;
  if (failed > 0) top = { kind:"failed", summary:`${failed} backup system(s) failed`, severity:"critical" };
  else if (critical_unknown_or_failed > 0) top = { kind:"critical_unknown", summary:`${critical_unknown_or_failed} high/critical system(s) without confirmed backup`, severity:"high" };
  else if (unknown > 0) top = { kind:"unknown", summary:`${unknown} backup system(s) in unknown state`, severity:"medium" };
  else if (exApproval > 0) top = { kind:"export_approval", summary:`${exApproval} export request(s) awaiting founder approval`, severity:"medium" };
  else if (warning > 0) top = { kind:"warning", summary:`${warning} backup system(s) reporting warnings`, severity:"medium" };

  return {
    systems: live.length, healthy, warning, failed, unknown, not_configured: notCfg,
    critical_unknown_or_failed,
    exports: liveExports.length, exports_awaiting_approval: exApproval, exports_generated: exGenerated,
    checklists: liveChecks.length, checklists_needs_review: checksNeedsReview,
    packs: livePacks.length, packs_draft: packsDraft, packs_approved: packsApproved,
    test_records: test, top_alert: top,
  };
}