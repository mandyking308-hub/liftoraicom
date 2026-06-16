import { supabase } from "@/integrations/supabase/client";

export type DataRoomToken = {
  id: string; investor_name: string; organisation: string | null; email: string | null; domain: string | null;
  access_scope: string | null; allowed_folders: unknown; expiry_at: string | null;
  watermark_enabled: boolean; download_allowed: boolean; view_only: boolean;
  nda_status: string; approval_status: string; approved_by: string | null; approved_at: string | null;
  revoked_at: string | null; revoked_reason: string | null; token_hash: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

export type ShareRequest = {
  id: string; investor_name: string; organisation: string | null;
  requested_scope: string | null; justification: string | null;
  status: string; founder_decision: string | null; founder_decided_at: string | null;
  created_at: string; updated_at: string;
};

export async function fetchTokens(): Promise<DataRoomToken[]> {
  const { data, error } = await supabase.from("data_room_access_tokens").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return (data ?? []) as DataRoomToken[];
}

export async function createToken(input: Partial<DataRoomToken>) {
  const payload = { investor_name: input.investor_name ?? "Unnamed", watermark_enabled: true, view_only: true, download_allowed: false, approval_status: "pending", ...input } as any;
  const { data, error } = await supabase.from("data_room_access_tokens").insert(payload).select().single();
  if (error) throw error;
  await logViewAudit(data.id, "token_created");
  return data as DataRoomToken;
}

export async function approveToken(id: string) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("data_room_access_tokens").update({ approval_status: "approved", approved_by: u?.user?.id ?? null, approved_at: new Date().toISOString() } as any).eq("id", id).select().single();
  if (error) throw error;
  await logViewAudit(id, "approved");
  return data as DataRoomToken;
}

export async function revokeToken(id: string, reason: string) {
  const { data, error } = await supabase.from("data_room_access_tokens").update({ revoked_at: new Date().toISOString(), revoked_reason: reason, approval_status: "revoked" } as any).eq("id", id).select().single();
  if (error) throw error;
  await logViewAudit(id, "revoked", reason);
  return data as DataRoomToken;
}

export async function logViewAudit(token_id: string, action: string, item_ref?: string) {
  await supabase.from("data_room_view_audit").insert({ token_id, action, item_ref: item_ref ?? null } as any);
}

export async function fetchShareRequests(): Promise<ShareRequest[]> {
  const { data, error } = await supabase.from("data_room_share_requests").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return (data ?? []) as ShareRequest[];
}

export async function decideShareRequest(id: string, decision: "approved" | "rejected") {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("data_room_share_requests").update({ status: decision, founder_decision: decision, founder_decided_at: new Date().toISOString(), founder_decided_by: u?.user?.id ?? null } as any).eq("id", id).select().single();
  if (error) throw error;
  return data as ShareRequest;
}

export function pendingApprovalCount(tokens: DataRoomToken[], requests: ShareRequest[]) {
  return tokens.filter(t => t.approval_status === "pending").length + requests.filter(r => r.status === "pending").length;
}
