import { supabase } from "@/integrations/supabase/client";

export const GIAS_SOURCE_REGISTRY_ID = "10eb00f4-453f-4f93-baa3-98e288e7b6ea";
export const GIAS_FACT_LABEL = "GIAS-sourced, not school-confirmed";
export const GIAS_MAX_PAGE_SIZE = 100;

export interface GiasSearchParams {
  q?: string;
  status?: string;
  phase?: string;
  type?: string;
  county?: string;
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
  const { data, error } = await (supabase as any).rpc("gias_search", buildGiasSearchArgs(p));
  if (error) throw error;
  const rows = (data ?? []) as GiasRow[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}
