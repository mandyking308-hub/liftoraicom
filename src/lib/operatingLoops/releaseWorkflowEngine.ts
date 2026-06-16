import { supabase } from "@/integrations/supabase/client";

export type ReleaseItem = {
  id: string; roadmap_item_id: string | null; business_id: string | null;
  release_title: string; release_type: string;
  qa_status: string; documentation_status: string;
  customer_impact: string | null; support_impact: string | null;
  release_status: string; planned_release_date: string | null; released_at: string | null;
  customer_comms_draft: string | null; internal_notes: string | null;
  founder_approved_by: string | null; founder_approved_at: string | null;
  created_at: string; updated_at: string;
};

export const RELEASE_STATUSES = ["planned","in_build","qa","founder_review","approved","released","rolled_back"] as const;
export const RELEASE_TYPES = ["feature","fix","compliance","security","ux","internal","customer_facing"] as const;

export async function fetchReleases(): Promise<ReleaseItem[]> {
  const { data, error } = await supabase.from("release_workflow_items").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return (data ?? []) as ReleaseItem[];
}

export async function createRelease(input: Partial<ReleaseItem>) {
  const payload = { release_title: input.release_title ?? "Untitled", release_type: input.release_type ?? "feature", ...input } as any;
  const { data, error } = await supabase.from("release_workflow_items").insert(payload).select().single();
  if (error) throw error;
  await logReleaseEvent(data.id, "created", {});
  return data as ReleaseItem;
}

export async function updateRelease(id: string, patch: Partial<ReleaseItem>) {
  const { data, error } = await supabase.from("release_workflow_items").update(patch as any).eq("id", id).select().single();
  if (error) throw error;
  await logReleaseEvent(id, "updated", patch as any);
  return data as ReleaseItem;
}

export async function approveRelease(id: string) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("release_workflow_items").update({ release_status: "approved", founder_approved_by: u?.user?.id ?? null, founder_approved_at: new Date().toISOString() } as any).eq("id", id).select().single();
  if (error) throw error;
  await logReleaseEvent(id, "approved", {});
  return data as ReleaseItem;
}

export async function logReleaseEvent(item_id: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("release_workflow_events").insert({ item_id, event_type, actor: u?.user?.id ?? null, payload } as any);
}

export function awaitingFounderReview(rows: ReleaseItem[]) {
  return rows.filter(r => r.release_status === "founder_review");
}
