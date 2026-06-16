import { supabase } from "@/integrations/supabase/client";

export type InsuranceClaim = {
  id: string;
  business_id: string | null;
  incident_id: string | null;
  policy_id: string | null;
  claim_type: string;
  insurer: string | null;
  broker_name: string | null;
  broker_contact: string | null;
  policy_reference: string | null;
  incident_date: string | null;
  opened_date: string | null;
  status: string;
  claim_value_estimate: number | null;
  recovered_amount: number | null;
  excess_amount: number | null;
  currency: string | null;
  owner: string | null;
  next_action: string | null;
  next_action_due: string | null;
  evidence_refs: unknown;
  founder_approval_status: string | null;
  founder_approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CLAIM_STATUSES = [
  "draft","review_required","submitted_to_broker","submitted_to_insurer",
  "awaiting_response","evidence_requested","accepted","rejected","settled","closed",
] as const;

export async function fetchClaims(): Promise<InsuranceClaim[]> {
  const { data, error } = await supabase.from("insurance_claims").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return (data ?? []) as InsuranceClaim[];
}

export async function createClaim(input: Partial<InsuranceClaim>) {
  const payload = { claim_type: input.claim_type ?? "general", ...input } as any;
  const { data, error } = await supabase.from("insurance_claims").insert(payload).select().single();
  if (error) throw error;
  await logClaimEvent(data.id, "created", { status: data.status });
  return data as InsuranceClaim;
}

export async function updateClaim(id: string, patch: Partial<InsuranceClaim>) {
  const { data, error } = await supabase.from("insurance_claims").update(patch as any).eq("id", id).select().single();
  if (error) throw error;
  await logClaimEvent(id, "updated", patch as any);
  return data as InsuranceClaim;
}

export async function logClaimEvent(claim_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("insurance_claim_events").insert({ claim_id, event_type, actor: u?.user?.id ?? null, payload } as any);
}

export function summariseClaims(rows: InsuranceClaim[]) {
  const open = rows.filter(r => !["closed","settled","rejected"].includes(r.status));
  const review = rows.filter(r => r.status === "review_required" || r.founder_approval_status === "pending");
  const evidence = rows.filter(r => r.status === "evidence_requested");
  const overdueAction = rows.filter(r => r.next_action_due && new Date(r.next_action_due) < new Date() && !["closed","settled"].includes(r.status));
  const totalEstimate = rows.reduce((s,r) => s + Number(r.claim_value_estimate ?? 0), 0);
  const totalRecovered = rows.reduce((s,r) => s + Number(r.recovered_amount ?? 0), 0);
  return { total: rows.length, open: open.length, review: review.length, evidence: evidence.length, overdueAction: overdueAction.length, totalEstimate, totalRecovered };
}
