import { supabase } from "@/integrations/supabase/client";

export type DocumentType =
  | "contract" | "policy" | "invoice" | "receipt" | "insurance" | "licence"
  | "seller_verification" | "customer_evidence" | "adviser_pack" | "data_room"
  | "ip_rights" | "manual" | "tax" | "legal" | "other";

export type SensitivityLevel =
  | "public" | "internal" | "confidential" | "restricted"
  | "legal_sensitive" | "financial_sensitive";

export type AccessScope =
  | "founder_only" | "business_team" | "adviser" | "customer"
  | "seller" | "partner" | "public_link" | "custom";

export type DataRoomType =
  | "adviser" | "buyer" | "investor" | "legal" | "tax" | "seller" | "customer" | "internal";

export type DataRoomStatus =
  | "draft" | "internal_ready" | "approval_required" | "shared" | "paused" | "archived";

export type DataRoomItemStatus = "draft" | "approval_required" | "approved" | "shared" | "removed";

export type EvidenceType =
  | "payment" | "delivery" | "complaint" | "contract" | "call_recording"
  | "transcript" | "identity" | "seller_check" | "insurance" | "other";

export type EvidenceStatus = "collected" | "missing" | "review_required" | "verified" | "rejected";

export interface DocumentVaultItem {
  id: string; business_id: string|null; legal_entity_id: string|null;
  document_title: string; document_type: DocumentType;
  file_reference: string|null; storage_location_summary: string|null;
  sensitivity_level: SensitivityLevel; owner: string|null;
  source_module: string|null; source_record_id: string|null;
  verified: boolean; verified_by: string|null; verified_at: string|null;
  active: boolean; created_at: string; updated_at: string; audit_metadata: any;
}
export interface DocumentAccessRule {
  id: string; document_id: string; access_scope: AccessScope;
  allowed_role_id: string|null; external_access_allowed: boolean;
  founder_approval_required: boolean; expires_at: string|null;
  active: boolean; created_at: string; updated_at: string;
}
export interface DataRoomProfile {
  id: string; business_id: string|null; data_room_name: string;
  data_room_type: DataRoomType; data_room_status: DataRoomStatus;
  access_expires_at: string|null; created_at: string; updated_at: string; audit_metadata: any;
}
export interface DataRoomItem {
  id: string; data_room_id: string; document_id: string;
  item_status: DataRoomItemStatus; share_allowed: boolean;
  created_at: string; updated_at: string;
}
export interface EvidenceRecord {
  id: string; business_id: string|null; source_module: string|null;
  source_record_id: string|null; evidence_type: EvidenceType;
  document_id: string|null; evidence_summary: string|null;
  evidence_status: EvidenceStatus; created_at: string; updated_at: string;
}

export const SENSITIVITY_META: Record<SensitivityLevel, { label: string; cls: string; rank: number }> = {
  public:              { label: "Public",              cls: "bg-muted text-muted-foreground border-border/50", rank: 0 },
  internal:            { label: "Internal",            cls: "bg-blue-500/15 text-blue-300 border-blue-500/30",  rank: 1 },
  confidential:        { label: "Confidential",        cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", rank: 2 },
  restricted:          { label: "Restricted",          cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", rank: 3 },
  financial_sensitive: { label: "Financial sensitive", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", rank: 3 },
  legal_sensitive:     { label: "Legal sensitive",     cls: "bg-red-500/15 text-red-300 border-red-500/30",     rank: 4 },
};

export const DATA_ROOM_STATUS_META: Record<DataRoomStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  internal_ready:    { label: "Internal ready",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approval_required: { label: "Approval required", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  shared:            { label: "Shared",            cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused:            { label: "Paused",            cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  archived:          { label: "Archived",          cls: "bg-muted text-muted-foreground border-border/50" },
};

export const ACCESS_SCOPE_LABEL: Record<AccessScope, string> = {
  founder_only: "Founder only", business_team: "Business team", adviser: "Adviser",
  customer: "Customer", seller: "Seller", partner: "Partner",
  public_link: "Public link", custom: "Custom",
};

const EXTERNAL_SCOPES: AccessScope[] = ["adviser","customer","seller","partner","public_link"];

export async function fetchDocuments(): Promise<DocumentVaultItem[]> {
  const { data } = await (supabase as any).from("document_vault_items").select("*").order("created_at",{ascending:false});
  return (data ?? []) as DocumentVaultItem[];
}
export async function fetchAccessRules(): Promise<DocumentAccessRule[]> {
  const { data } = await (supabase as any).from("document_access_rules").select("*").order("created_at",{ascending:false});
  return (data ?? []) as DocumentAccessRule[];
}
export async function fetchDataRooms(): Promise<DataRoomProfile[]> {
  const { data } = await (supabase as any).from("data_room_profiles").select("*").order("created_at",{ascending:false});
  return (data ?? []) as DataRoomProfile[];
}
export async function fetchDataRoomItems(): Promise<DataRoomItem[]> {
  const { data } = await (supabase as any).from("data_room_items").select("*").order("created_at",{ascending:false});
  return (data ?? []) as DataRoomItem[];
}
export async function fetchEvidence(): Promise<EvidenceRecord[]> {
  const { data } = await (supabase as any).from("evidence_records").select("*").order("created_at",{ascending:false});
  return (data ?? []) as EvidenceRecord[];
}

export interface VaultSummary {
  documents: number; active_documents: number;
  confidential_or_higher: number; unverified_sensitive: number;
  over_shared_sensitive: number;
  access_rules: number; external_share_rules: number; approval_pending_rules: number;
  data_rooms: number; data_rooms_awaiting_approval: number; data_rooms_shared: number;
  evidence: number; evidence_missing: number; evidence_review: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);

export function findOverSharedSensitive(docs: DocumentVaultItem[], rules: DocumentAccessRule[]) {
  const rulesByDoc = new Map<string, DocumentAccessRule[]>();
  rules.forEach(r => { if (!r.active) return; const a = rulesByDoc.get(r.document_id) ?? []; a.push(r); rulesByDoc.set(r.document_id, a); });
  const out: Array<{ doc: DocumentVaultItem; reason: string }> = [];
  for (const d of docs) {
    if (!d.active) continue;
    const sens = SENSITIVITY_META[d.sensitivity_level]?.rank ?? 0;
    if (sens < 2) continue;
    const drules = rulesByDoc.get(d.id) ?? [];
    for (const r of drules) {
      if (EXTERNAL_SCOPES.includes(r.access_scope) && !r.founder_approval_required) {
        out.push({ doc: d, reason: `${ACCESS_SCOPE_LABEL[r.access_scope]} scope without approval gate` });
        break;
      }
      if (r.external_access_allowed && !r.founder_approval_required) {
        out.push({ doc: d, reason: "external access enabled without approval gate" });
        break;
      }
      if (r.access_scope === "public_link") {
        out.push({ doc: d, reason: "public link on sensitive document" });
        break;
      }
    }
  }
  return out;
}

export function summarize(
  docs: DocumentVaultItem[], rules: DocumentAccessRule[],
  rooms: DataRoomProfile[], items: DataRoomItem[], evidence: EvidenceRecord[],
): VaultSummary {
  const liveDocs = docs.filter(d => !isTest(d.audit_metadata));
  const active = liveDocs.filter(d => d.active);
  const confidential = active.filter(d => (SENSITIVITY_META[d.sensitivity_level]?.rank ?? 0) >= 2).length;
  const unverified = active.filter(d => (SENSITIVITY_META[d.sensitivity_level]?.rank ?? 0) >= 2 && !d.verified).length;
  const overShared = findOverSharedSensitive(liveDocs, rules).length;
  const extRules = rules.filter(r => r.active && (r.external_access_allowed || EXTERNAL_SCOPES.includes(r.access_scope))).length;
  const approvalRules = rules.filter(r => r.active && r.founder_approval_required).length;
  const liveRooms = rooms.filter(r => !isTest(r.audit_metadata));
  const roomsApproval = liveRooms.filter(r => r.data_room_status === "approval_required").length;
  const roomsShared = liveRooms.filter(r => r.data_room_status === "shared").length;
  const evMissing = evidence.filter(e => e.evidence_status === "missing").length;
  const evReview = evidence.filter(e => e.evidence_status === "review_required").length;
  const test = docs.filter(d => isTest(d.audit_metadata)).length
    + rooms.filter(r => isTest(r.audit_metadata)).length;

  let top: VaultSummary["top_alert"] = null;
  if (overShared > 0) top = { kind: "over_shared", summary: `${overShared} sensitive document(s) appear over-shared`, severity: "critical" };
  else if (roomsApproval > 0) top = { kind: "room_approval", summary: `${roomsApproval} data room(s) awaiting founder approval`, severity: "high" };
  else if (unverified > 0) top = { kind: "unverified", summary: `${unverified} sensitive document(s) unverified`, severity: "high" };
  else if (evMissing > 0) top = { kind: "missing", summary: `${evMissing} evidence record(s) missing`, severity: "medium" };
  else if (evReview > 0) top = { kind: "review", summary: `${evReview} evidence record(s) need review`, severity: "medium" };

  return {
    documents: liveDocs.length, active_documents: active.length,
    confidential_or_higher: confidential, unverified_sensitive: unverified,
    over_shared_sensitive: overShared,
    access_rules: rules.length, external_share_rules: extRules, approval_pending_rules: approvalRules,
    data_rooms: liveRooms.length, data_rooms_awaiting_approval: roomsApproval, data_rooms_shared: roomsShared,
    evidence: evidence.length, evidence_missing: evMissing, evidence_review: evReview,
    test_records: test, top_alert: top,
  };
}