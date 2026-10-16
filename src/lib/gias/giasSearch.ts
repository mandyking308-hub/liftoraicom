import { supabase } from "@/integrations/supabase/client";

export const GIAS_SOURCE_REGISTRY_ID = "10eb00f4-453f-4f93-baa3-98e288e7b6ea";
export const GIAS_FACT_LABEL = "GIAS-sourced, not school-confirmed";
export const GIAS_MAX_PAGE_SIZE = 100;
export const GIAS_BATCH_ID = "5bf59621-3bdb-4b0c-81a0-3b2b557490b3";
export const GIAS_GROUPS = [
  "Independent schools", "Academies", "Local authority maintained schools", "Special schools",
  "Free Schools", "Welsh schools", "Colleges", "Universities", "Other types", "Online provider",
] as const;

export interface GiasSearchParams {
  q?: string;
  status?: string;
  phase?: string;
  type?: string;
  county?: string;
  /** establishment_group, e.g. "Independent schools". Uses an RLS-bound direct table read. */
  group?: string;
  page?: number;
  pageSize?: number;
}

export interface GiasRow {
  urn: string;
  establishment_name: string;
  establishment_status: string | null;
  establishment_type: string | null;
  phase: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  website: string | null;
  source_snapshot_date: string | null;
  fact_verification_status: string;
  review_flags: string[];
  total_count: number;
}

const blank = (v?: string) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** Normalises UI input into the server RPC arguments (bounded paging, no bulk reads). */
export function buildGiasSearchArgs(p: GiasSearchParams) {
  const q = blank(p.q);
  if (q && q.length > 100) throw new Error("Search text is too long");
  const pageSize = Math.min(Math.max(Math.trunc(p.pageSize ?? 25), 1), GIAS_MAX_PAGE_SIZE);
  const page = Math.max(Math.trunc(p.page ?? 1), 1);
  return {
    _q: q,
    _status: blank(p.status),
    _phase: blank(p.phase),
    _type: blank(p.type),
    _county: blank(p.county),
    _page: page,
    _page_size: pageSize,
  };
}

/** Only http(s) links are rendered; anything else is dropped. */
export function safeWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\/[^\s<>"']+$/i.test(url) ? url : null;
}

/** Infers the snapshot date from a GIAS filename such as edubasealldata20261016.csv. */
export function inferSnapshotDateFromFilename(filename: string): string | null {
  const m = filename.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (isNaN(dt.getTime()) || dt.getUTCMonth() + 1 !== Number(mo)) return null;
  return `${y}-${mo}-${d}`;
}

export async function searchGias(p: GiasSearchParams) {
  if (blank(p.group)) return searchGiasByGroup(p);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GIAS objects are not in generated types
  const { data, error } = await (supabase as any).rpc("gias_search", buildGiasSearchArgs(p));
  if (error) throw error;
  const rows = (data ?? []) as GiasRow[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

/** Strips characters that would break a PostgREST or()/ilike filter. */
export function sanitiseFilterText(q: string): string {
  return q.replace(/[,()%*\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

/** Builds the group-filtered query args (exact-match filters, bounded range). */
export function buildGiasGroupQuery(p: GiasSearchParams) {
  const a = buildGiasSearchArgs(p);
  const group = blank(p.group);
  if (!group || !(GIAS_GROUPS as readonly string[]).includes(group)) throw new Error("Unknown establishment group");
  const q = a._q ? sanitiseFilterText(a._q) : null;
  const from = (a._page - 1) * a._page_size;
  return { ...a, group, q: q || null, from, to: from + a._page_size - 1 };
}

const GIAS_COLUMNS = "urn, establishment_name, establishment_status, establishment_type, phase, town, county, postcode, website, source_snapshot_date, fact_verification_status, review_flags";

/** Group filter path: direct read on gias_establishments, still founder/admin-only via RLS. */
async function searchGiasByGroup(p: GiasSearchParams) {
  const g = buildGiasGroupQuery(p);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GIAS objects are not in generated types
  let query = (supabase as any).from("gias_establishments").select(GIAS_COLUMNS, { count: "exact" })
    .eq("source_registry_id", GIAS_SOURCE_REGISTRY_ID).eq("establishment_group", g.group);
  if (g._status) query = query.eq("establishment_status", g._status);
  if (g._phase) query = query.eq("phase", g._phase);
  if (g._type) query = query.eq("establishment_type", g._type);
  if (g._county) query = query.ilike("county", g._county);
  if (g.q) query = query.or(`establishment_name.ilike.%${g.q}%,town.ilike.%${g.q}%,postcode.ilike.%${g.q}%,urn.eq.${g.q}`);
  const { data, error, count } = await query.order("establishment_name").range(g.from, g.to);
  if (error) throw error;
  return { rows: (data ?? []) as GiasRow[], total: count ?? 0 };
}
