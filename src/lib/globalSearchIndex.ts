import { supabase } from "@/integrations/supabase/client";

export type RecordType =
  | "business" | "contact" | "customer" | "seller" | "partner" | "product" | "offer"
  | "invoice" | "payment" | "contract" | "document" | "ticket" | "complaint"
  | "incident" | "decision" | "approval" | "communication" | "transcript" | "audit" | "other";

export type Sensitivity = "public" | "internal" | "confidential" | "restricted" | "legal_sensitive" | "financial_sensitive";

export interface SearchIndexRow {
  id: string;
  business_id: string | null;
  source_module: string;
  source_table: string;
  source_record_id: string;
  record_type: RecordType;
  title: string;
  summary: string | null;
  searchable_text: string;
  tags: string[];
  sensitivity_level: Sensitivity;
  is_test_data: boolean;
  active: boolean;
  last_indexed_at: string;
  audit_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const SECRET_RX = /(secret|token|password|passwd|api[_-]?key|authorization|bearer|cvv|card_number|ssn|sin|iban|account_number|routing|private_key)/i;

/** Strip raw-secret-like substrings from any text before it ever lands in the index. */
export function safeSummary(text: string, maxLen = 1200): string {
  if (!text) return "";
  // Mask "key: value" style secrets and obvious tokens.
  let t = text.replace(/(["']?)([a-zA-Z_]*?(?:secret|token|password|api[_-]?key|authorization|bearer|cvv|card_number|ssn|iban|account_number|routing|private_key)[a-zA-Z_]*)\1\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1$2$1: [REDACTED]");
  t = t.replace(/\b[A-Za-z0-9_\-]{32,}\b/g, m => SECRET_RX.test(m) ? "[REDACTED]" : m.slice(0, 8) + "…");
  return t.length > maxLen ? t.slice(0, maxLen) + "…" : t;
}

export interface UpsertIndexInput {
  business_id?: string | null;
  source_module: string;
  source_table: string;
  source_record_id: string;
  record_type: RecordType;
  title: string;
  summary?: string | null;
  searchable_text: string;
  tags?: string[];
  sensitivity_level?: Sensitivity;
  is_test_data?: boolean;
  active?: boolean;
  audit_metadata?: Record<string, any>;
}

/** Safe upsert. Never throws — search must not break the caller. */
export async function upsertSearchIndex(input: UpsertIndexInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const row = {
      business_id: input.business_id ?? null,
      source_module: String(input.source_module).slice(0, 200),
      source_table: String(input.source_table).slice(0, 200),
      source_record_id: String(input.source_record_id).slice(0, 200),
      record_type: input.record_type,
      title: safeSummary(input.title, 250),
      summary: input.summary != null ? safeSummary(input.summary, 800) : null,
      searchable_text: safeSummary(input.searchable_text, 4000),
      tags: (input.tags ?? []).map(t => String(t).slice(0, 60)).slice(0, 50),
      sensitivity_level: input.sensitivity_level ?? "internal",
      is_test_data: !!input.is_test_data,
      active: input.active ?? true,
      last_indexed_at: new Date().toISOString(),
      audit_metadata: input.audit_metadata ?? {},
    };
    const { data, error } = await (supabase as any)
      .from("global_search_index")
      .upsert(row, { onConflict: "source_module,source_table,source_record_id" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export interface SearchFilters {
  q?: string;
  business_id?: string | null;
  source_module?: string | null;
  record_type?: RecordType | null;
  sensitivity_level?: Sensitivity | null;
  include_test?: boolean;
  since?: string | null;
  limit?: number;
}

export async function searchIndex(f: SearchFilters): Promise<SearchIndexRow[]> {
  let q: any = (supabase as any).from("global_search_index").select("*")
    .eq("active", true)
    .order("last_indexed_at", { ascending: false })
    .limit(f.limit ?? 100);
  if (f.q && f.q.trim()) {
    const t = f.q.replace(/[%_]/g, m => `\\${m}`);
    q = q.or(`title.ilike.%${t}%,searchable_text.ilike.%${t}%`);
  }
  if (f.business_id) q = q.eq("business_id", f.business_id);
  if (f.source_module) q = q.eq("source_module", f.source_module);
  if (f.record_type) q = q.eq("record_type", f.record_type);
  if (f.sensitivity_level) q = q.eq("sensitivity_level", f.sensitivity_level);
  if (!f.include_test) q = q.eq("is_test_data", false);
  if (f.since) q = q.gte("last_indexed_at", f.since);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SearchIndexRow[];
}

export async function fetchIndexJobs(limit = 100) {
  const { data, error } = await (supabase as any).from("search_index_jobs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; job_name: string; source_module: string; job_status: string; records_indexed: number; failure_reason: string | null; started_at: string | null; completed_at: string | null; created_at: string; audit_metadata: any }>;
}

export interface SearchSummary {
  total_active: number;
  by_type: Array<{ record_type: string; count: number }>;
  by_module: Array<{ source_module: string; count: number }>;
  stale_count: number;          // not refreshed in 14d
  failed_jobs_24h: number;
  sensitive_blocked: number;    // restricted/legal_sensitive/financial_sensitive entries (require role)
  test_rows: number;
  recommended_review: string;
}

export async function fetchSearchSummary(): Promise<SearchSummary> {
  const sb: any = supabase as any;
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const staleCut = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const [activeR, jobsR, staleR, restrictedR, testR] = await Promise.all([
    sb.from("global_search_index").select("record_type,source_module").eq("active", true).limit(2000),
    sb.from("search_index_jobs").select("job_status,created_at").gte("created_at", dayAgo),
    sb.from("global_search_index").select("id", { count: "exact", head: true }).eq("active", true).lt("last_indexed_at", staleCut),
    sb.from("global_search_index").select("id", { count: "exact", head: true }).in("sensitivity_level", ["restricted","legal_sensitive","financial_sensitive"]),
    sb.from("global_search_index").select("id", { count: "exact", head: true }).eq("is_test_data", true),
  ]);
  const active = (activeR.data ?? []) as Array<{ record_type: string; source_module: string }>;
  const typeMap = new Map<string, number>();
  const modMap = new Map<string, number>();
  for (const r of active) {
    typeMap.set(r.record_type, (typeMap.get(r.record_type) ?? 0) + 1);
    modMap.set(r.source_module, (modMap.get(r.source_module) ?? 0) + 1);
  }
  const failed = (jobsR.data ?? []).filter((j: any) => j.job_status === "failed").length;
  const stale = (staleR as any).count ?? 0;
  const sensitiveBlocked = (restrictedR as any).count ?? 0;
  const testRows = (testR as any).count ?? 0;
  const reasons: string[] = [];
  if (stale > 0) reasons.push(`${stale} stale entr${stale === 1 ? "y" : "ies"}`);
  if (failed > 0) reasons.push(`${failed} failed index job${failed === 1 ? "" : "s"}`);
  const recommended_review = reasons.length ? `Review: ${reasons.join(", ")}.` : "All clear — index is fresh and indexing jobs are healthy.";
  return {
    total_active: active.length,
    by_type: [...typeMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([record_type,count])=>({ record_type, count })),
    by_module: [...modMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([source_module,count])=>({ source_module, count })),
    stale_count: stale,
    failed_jobs_24h: failed,
    sensitive_blocked: sensitiveBlocked,
    test_rows: testRows,
    recommended_review,
  };
}

/** LIVE_INTERNAL_TEST seeder — inserts safe summary rows across record types. */
export async function seedSearchIndexTestRows(): Promise<{ ok: boolean; ids: string[]; errors: string[] }> {
  const traceId = `LIVE_INTERNAL_TEST-SEARCH-${Date.now()}`;
  const rows: UpsertIndexInput[] = [
    { source_module: "businesses", source_table: "businesses", source_record_id: `test-biz-001`,
      record_type: "business", title: "LIVE_INTERNAL_TEST — Sample Business",
      summary: "Internal test business record (no real data).",
      searchable_text: "test business sample portfolio liftor", tags: ["test","business"],
      sensitivity_level: "internal", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "crm_contacts", source_table: "crm_contacts", source_record_id: `test-customer-001`,
      record_type: "customer", title: "LIVE_INTERNAL_TEST — Sample Customer (Jane Doe)",
      summary: "Test customer profile, no PII.",
      searchable_text: "jane doe customer test sample", tags: ["test","customer"],
      sensitivity_level: "confidential", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "marketplace_sellers", source_table: "seller_accounts", source_record_id: `test-seller-001`,
      record_type: "seller", title: "LIVE_INTERNAL_TEST — Sample Seller",
      summary: "Test seller account summary.",
      searchable_text: "marketplace seller test sample", tags: ["test","seller","marketplace"],
      sensitivity_level: "internal", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "quote_to_cash", source_table: "qtc_invoices", source_record_id: `test-invoice-001`,
      record_type: "invoice", title: "LIVE_INTERNAL_TEST — Invoice INV-TEST-001",
      summary: "Test invoice summary (no card data).",
      searchable_text: "invoice test inv-test-001 quote-to-cash", tags: ["test","invoice","finance"],
      sensitivity_level: "financial_sensitive", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "contracts", source_table: "contracts", source_record_id: `test-contract-001`,
      record_type: "contract", title: "LIVE_INTERNAL_TEST — Sample MSA",
      summary: "Test contract metadata only.",
      searchable_text: "contract msa test sample legal", tags: ["test","contract","legal"],
      sensitivity_level: "legal_sensitive", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "document_vault", source_table: "documents", source_record_id: `test-doc-001`,
      record_type: "document", title: "LIVE_INTERNAL_TEST — Sample Document",
      summary: "Document vault summary (no body indexed).",
      searchable_text: "document vault test sample", tags: ["test","document"],
      sensitivity_level: "confidential", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "incidents", source_table: "incidents", source_record_id: `test-incident-001`,
      record_type: "incident", title: "LIVE_INTERNAL_TEST — Sample Incident",
      summary: "Test incident report summary.",
      searchable_text: "incident test sample postmortem", tags: ["test","incident","ops"],
      sensitivity_level: "internal", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "decision_register", source_table: "founder_decisions", source_record_id: `test-decision-001`,
      record_type: "decision", title: "LIVE_INTERNAL_TEST — Sample Founder Decision",
      summary: "Test decision register entry.",
      searchable_text: "decision founder register test sample", tags: ["test","decision"],
      sensitivity_level: "internal", is_test_data: true, audit_metadata: { trace: traceId } },
    { source_module: "communications", source_table: "voice_call_transcripts", source_record_id: `test-transcript-001`,
      record_type: "transcript", title: "LIVE_INTERNAL_TEST — Sample Call Transcript",
      summary: "Voice call transcript summary only (no full body, no PII).",
      searchable_text: "transcript call voice summary test sample", tags: ["test","transcript","voice"],
      sensitivity_level: "confidential", is_test_data: true, audit_metadata: { trace: traceId } },
  ];
  const ids: string[] = []; const errors: string[] = [];
  for (const r of rows) {
    const res = await upsertSearchIndex(r);
    if (res.ok && res.id) ids.push(res.id); else if (res.error) errors.push(res.error);
  }
  return { ok: errors.length === 0, ids, errors };
}

// Saved searches -----------------------------------------------------------
export async function listSavedSearches() {
  const { data, error } = await (supabase as any).from("saved_searches").select("*").order("updated_at", { ascending: false }).limit(50);
  if (error) throw error; return data ?? [];
}
export async function createSavedSearch(input: { search_name: string; query_text: string; filters: any }) {
  const { data: u } = await (supabase as any).auth.getUser();
  const { data, error } = await (supabase as any).from("saved_searches").insert({
    user_id: u?.user?.id ?? null,
    search_name: input.search_name.slice(0, 200),
    query_text: input.query_text.slice(0, 1000),
    filters: input.filters ?? {},
  }).select("*").single();
  if (error) throw error; return data;
}
export async function deleteSavedSearch(id: string) {
  const { error } = await (supabase as any).from("saved_searches").delete().eq("id", id);
  if (error) throw error;
}