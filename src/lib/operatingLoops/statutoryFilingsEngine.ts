import { supabase } from "@/integrations/supabase/client";

export type StatutoryFiling = {
  id: string;
  business_id: string | null; entity_id: string | null; jurisdiction: string | null;
  filing_category: string; filing_name: string; authority: string | null;
  period_start: string | null; period_end: string | null; due_date: string | null;
  owner: string | null; adviser_contact: string | null; status: string;
  evidence_ref: string | null; payment_required: boolean; payment_amount: number | null; currency: string | null;
  filed_date: string | null; notes: string | null; created_at: string; updated_at: string;
};

export const FILING_STATUSES = ["not_started","info_needed","with_adviser","draft_ready","founder_review","filed","evidence_uploaded","overdue","not_applicable"] as const;
export const FILING_CATEGORIES = ["corporate","tax","vat_sales_tax","accounts","confirmation_statement","franchise_tax","licence_renewal","regulatory","payroll","other"] as const;

export async function fetchFilings(): Promise<StatutoryFiling[]> {
  const { data, error } = await supabase.from("statutory_filings").select("*").order("due_date", { ascending: true });
  if (error) throw error; return (data ?? []) as StatutoryFiling[];
}

export async function createFiling(input: Partial<StatutoryFiling>) {
  const payload = { filing_name: input.filing_name ?? "Untitled", filing_category: input.filing_category ?? "other", ...input } as any;
  const { data, error } = await supabase.from("statutory_filings").insert(payload).select().single();
  if (error) throw error;
  await logFilingEvent(data.id, "created", {});
  return data as StatutoryFiling;
}

export async function updateFiling(id: string, patch: Partial<StatutoryFiling>) {
  const { data, error } = await supabase.from("statutory_filings").update(patch as any).eq("id", id).select().single();
  if (error) throw error;
  await logFilingEvent(id, "updated", patch as any);
  return data as StatutoryFiling;
}

export async function logFilingEvent(filing_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("statutory_filing_events").insert({ filing_id, event_type, actor: u?.user?.id ?? null, payload } as any);
}

export function bucketFilings(rows: StatutoryFiling[]) {
  const today = new Date(); today.setHours(0,0,0,0);
  const inDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  const dueIn = (r: StatutoryFiling, n: number) => r.due_date && new Date(r.due_date) <= inDays(n) && new Date(r.due_date) >= today && !["filed","not_applicable","evidence_uploaded"].includes(r.status);
  return {
    overdue: rows.filter(r => r.due_date && new Date(r.due_date) < today && !["filed","not_applicable","evidence_uploaded"].includes(r.status)),
    in30: rows.filter(r => dueIn(r, 30)),
    in60: rows.filter(r => dueIn(r, 60) && !dueIn(r, 30)),
    in90: rows.filter(r => dueIn(r, 90) && !dueIn(r, 60)),
    withAdviser: rows.filter(r => r.status === "with_adviser"),
    founderReview: rows.filter(r => r.status === "founder_review"),
    evidenceMissing: rows.filter(r => r.status === "filed" && !r.evidence_ref),
  };
}
