import { supabase } from "@/integrations/supabase/client";

export type ImportType = "contacts" | "customers" | "sellers" | "products" | "invoices" | "documents" | "contracts" | "vendors" | "notes" | "csv" | "spreadsheet" | "other";
export type ImportStatus = "uploaded" | "mapping" | "preview" | "approval_required" | "applied" | "failed" | "rolled_back" | "cancelled";
export type ValidationStatus = "valid" | "warning" | "error" | "duplicate" | "ignored";
export type MappingStatus = "mapped" | "unmapped" | "ignored" | "error";
export type RollbackStatus = "draft" | "approval_required" | "approved" | "completed" | "failed" | "cancelled";

export interface ImportBatch {
  id: string;
  business_id?: string | null;
  import_name: string;
  import_type: ImportType;
  source_filename?: string | null;
  source_format: string;
  import_status: ImportStatus;
  is_test_import: boolean;
  rows_total: number;
  rows_valid: number;
  rows_warning: number;
  rows_error: number;
  founder_approval_required: boolean;
  created_at: string;
  updated_at?: string;
  audit_metadata?: Record<string, any>;
}

const sb: any = supabase as any;

export async function listImportBatches(limit = 100): Promise<ImportBatch[]> {
  const { data } = await sb.from("import_batches").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as ImportBatch[];
}

export async function getImportBatch(id: string): Promise<ImportBatch | null> {
  const { data } = await sb.from("import_batches").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function listMappings(batchId: string) {
  const { data } = await sb.from("import_mappings").select("*").eq("import_batch_id", batchId).order("source_field");
  return data ?? [];
}

export async function listPreviewRows(batchId: string, limit = 500) {
  const { data } = await sb.from("import_preview_rows").select("*").eq("import_batch_id", batchId).order("row_number").limit(limit);
  return data ?? [];
}

export async function listAppliedRecords(batchId: string) {
  const { data } = await sb.from("import_applied_records").select("*").eq("import_batch_id", batchId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function listRollbackEvents(batchId?: string) {
  let q = sb.from("import_rollback_events").select("*").order("created_at", { ascending: false }).limit(200);
  if (batchId) q = q.eq("import_batch_id", batchId);
  const { data } = await q;
  return data ?? [];
}

export interface ImportCentreSummary {
  totalBatches: number;
  awaitingApproval: number;
  failed: number;
  testBatches: number;
  appliedLive: number;
  rollbackOpen: number;
  watchItems: string[];
}

export async function summariseImportCentre(): Promise<ImportCentreSummary> {
  const [batches, rollbacks] = await Promise.all([
    sb.from("import_batches").select("import_status,is_test_import").limit(500),
    sb.from("import_rollback_events").select("rollback_status").in("rollback_status", ["draft", "approval_required", "approved"]),
  ]);
  const rows = (batches.data ?? []) as Array<{ import_status: string; is_test_import: boolean }>;
  const summary: ImportCentreSummary = {
    totalBatches: rows.length,
    awaitingApproval: rows.filter(r => r.import_status === "approval_required").length,
    failed: rows.filter(r => r.import_status === "failed").length,
    testBatches: rows.filter(r => r.is_test_import).length,
    appliedLive: rows.filter(r => r.import_status === "applied" && !r.is_test_import).length,
    rollbackOpen: (rollbacks.data ?? []).length,
    watchItems: [],
  };
  if (summary.awaitingApproval > 0) summary.watchItems.push(`${summary.awaitingApproval} import(s) awaiting founder approval`);
  if (summary.failed > 0) summary.watchItems.push(`${summary.failed} import(s) failed — review`);
  if (summary.rollbackOpen > 0) summary.watchItems.push(`${summary.rollbackOpen} rollback(s) in progress`);
  return summary;
}

export function statusBadge(s: ImportStatus): string {
  const m: Record<ImportStatus, string> = {
    uploaded: "bg-muted text-muted-foreground border-border/50",
    mapping: "bg-primary/15 text-primary border-primary/30",
    preview: "bg-primary/15 text-primary border-primary/30",
    approval_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    applied: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    rolled_back: "bg-muted text-muted-foreground border-border/50",
    cancelled: "bg-muted text-muted-foreground border-border/50",
  };
  return m[s] ?? "bg-muted";
}

export function validationBadge(s: ValidationStatus): string {
  const m: Record<ValidationStatus, string> = {
    valid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    error: "bg-red-500/15 text-red-300 border-red-500/30",
    duplicate: "bg-primary/15 text-primary border-primary/30",
    ignored: "bg-muted text-muted-foreground border-border/50",
  };
  return m[s] ?? "bg-muted";
}