import { supabase } from "@/integrations/supabase/client";

export type SecRecord = {
  id: string; entity_id: string | null; entity_name: string; jurisdiction: string | null;
  directors: unknown; shareholders: unknown; psc_record: unknown;
  registered_office: string | null; registered_agent: string | null;
  annual_confirmation_due: string | null; accounts_due: string | null; licence_renewal_due: string | null;
  status: string; evidence_refs: unknown; notes: string | null;
  created_at: string; updated_at: string;
};

export const SEC_STATUSES = ["active","dormant","needs_review","adviser_review_required","closed"] as const;

export async function fetchSecRecords(): Promise<SecRecord[]> {
  const { data, error } = await supabase.from("corporate_secretarial_records").select("*").order("entity_name");
  if (error) throw error; return (data ?? []) as SecRecord[];
}

export async function createSecRecord(input: Partial<SecRecord>) {
  const payload = { entity_name: input.entity_name ?? "Untitled entity", ...input } as any;
  const { data, error } = await supabase.from("corporate_secretarial_records").insert(payload).select().single();
  if (error) throw error;
  await logSecEvent(data.id, "created", {});
  return data as SecRecord;
}

export async function updateSecRecord(id: string, patch: Partial<SecRecord>) {
  const { data, error } = await supabase.from("corporate_secretarial_records").update(patch as any).eq("id", id).select().single();
  if (error) throw error;
  await logSecEvent(id, "updated", patch as any);
  return data as SecRecord;
}

export async function logSecEvent(record_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("corporate_secretarial_events").insert({ record_id, event_type, actor: u?.user?.id ?? null, payload } as any);
}

export function dueSoon(r: SecRecord, days = 60): { kind: string; date: string }[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const horizon = new Date(today); horizon.setDate(today.getDate() + days);
  const out: { kind: string; date: string }[] = [];
  (["annual_confirmation_due","accounts_due","licence_renewal_due"] as const).forEach(k => {
    const v = r[k]; if (v && new Date(v) <= horizon) out.push({ kind: k, date: v });
  });
  return out;
}

export function summariseSec(rows: SecRecord[]) {
  const dueCount = rows.reduce((s, r) => s + dueSoon(r).length, 0);
  const reviewCount = rows.filter(r => ["needs_review","adviser_review_required"].includes(r.status)).length;
  return { total: rows.length, dueCount, reviewCount };
}
