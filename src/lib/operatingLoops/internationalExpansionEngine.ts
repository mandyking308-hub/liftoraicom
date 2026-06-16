import { supabase } from "@/integrations/supabase/client";

export type ExpansionRun = {
  id: string; business_id: string | null; target_jurisdiction: string;
  launch_purpose: string | null; market_relevance_notes: string | null;
  tax_review_status: string; legal_review_status: string; payments_status: string;
  banking_status: string; localisation_status: string; privacy_status: string;
  regulatory_status: string; adviser_status: string; substance_notes: string | null;
  go_no_go_status: string; founder_decision: string | null; founder_decided_at: string | null;
  evidence_refs: unknown; created_at: string; updated_at: string;
};

export const READINESS_KEYS = [
  "tax_review_status","legal_review_status","payments_status","banking_status",
  "localisation_status","privacy_status","regulatory_status","adviser_status",
] as const;

export const READINESS_STATUSES = ["not_started","in_progress","blocked","ready","not_applicable"] as const;

export async function fetchExpansionRuns(): Promise<ExpansionRun[]> {
  const { data, error } = await supabase.from("international_expansion_runs").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return (data ?? []) as ExpansionRun[];
}

export async function createExpansionRun(input: Partial<ExpansionRun>) {
  const payload = { target_jurisdiction: input.target_jurisdiction ?? "Unknown", ...input } as any;
  const { data, error } = await supabase.from("international_expansion_runs").insert(payload).select().single();
  if (error) throw error;
  await logExpansionEvent(data.id, "created", {});
  return data as ExpansionRun;
}

export async function updateExpansionRun(id: string, patch: Partial<ExpansionRun>) {
  const { data, error } = await supabase.from("international_expansion_runs").update(patch as any).eq("id", id).select().single();
  if (error) throw error;
  await logExpansionEvent(id, "updated", patch as any);
  return data as ExpansionRun;
}

export async function logExpansionEvent(run_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("international_expansion_events").insert({ run_id, event_type, actor: u?.user?.id ?? null, payload } as any);
}

export function readinessScore(r: ExpansionRun) {
  const total = READINESS_KEYS.length;
  const ready = READINESS_KEYS.filter(k => ["ready","not_applicable"].includes((r as any)[k])).length;
  const blocked = READINESS_KEYS.filter(k => (r as any)[k] === "blocked").length;
  return { ready, total, blocked, complete: ready === total };
}

export function canGoLive(r: ExpansionRun) {
  const s = readinessScore(r);
  return s.complete && r.founder_decision === "approved";
}
