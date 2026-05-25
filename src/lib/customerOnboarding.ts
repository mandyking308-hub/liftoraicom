import { supabase } from "@/integrations/supabase/client";

export interface OnboardingSnapshot {
  total: number;
  in_progress: number;
  waiting_customer: number;
  blocked: number;
  complete: number;
  overdue: number;
  welcome_packs_pending_send: number;
  portal_invites_pending_send: number;
  customers_missing_info: number;
  recommended_action: string;
}

export async function computeOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const [recRes, itemRes] = await Promise.all([
    supabase.from("onboarding_records").select("id,onboarding_status,welcome_pack_prepared,welcome_pack_sent,portal_invite_prepared,portal_invite_sent,missing_information,updated_at,created_at,completed_at"),
    supabase.from("onboarding_checklist_items").select("id,item_status,due_at"),
  ]);
  const rec = recRes.data || [];
  const items = itemRes.data || [];
  const now = Date.now();

  const in_progress = rec.filter((r: any) => r.onboarding_status === "in_progress").length;
  const waiting_customer = rec.filter((r: any) => r.onboarding_status === "waiting_customer").length;
  const blocked = rec.filter((r: any) => r.onboarding_status === "blocked").length;
  const complete = rec.filter((r: any) => r.onboarding_status === "complete").length;
  const welcome_packs_pending_send = rec.filter((r: any) => r.welcome_pack_prepared && !r.welcome_pack_sent).length;
  const portal_invites_pending_send = rec.filter((r: any) => r.portal_invite_prepared && !r.portal_invite_sent).length;
  const customers_missing_info = rec.filter((r: any) => Array.isArray(r.missing_information) && r.missing_information.length > 0).length;
  const overdue = items.filter((i: any) => i.due_at && new Date(i.due_at).getTime() < now && !["completed", "received", "not_needed"].includes(i.item_status)).length;

  let recommended_action = "Onboarding is on pace. Keep checklists moving.";
  if (blocked > 0) recommended_action = `Unblock ${blocked} stuck onboarding(s).`;
  else if (waiting_customer > 0) recommended_action = `Chase ${waiting_customer} customer(s) for missing information (drafts queued for founder approval).`;
  else if (welcome_packs_pending_send + portal_invites_pending_send > 0) recommended_action = `Founder approval needed to send ${welcome_packs_pending_send} welcome pack(s) and ${portal_invites_pending_send} portal invite(s).`;
  else if (overdue > 0) recommended_action = `Resolve ${overdue} overdue checklist item(s).`;

  return {
    total: rec.length,
    in_progress,
    waiting_customer,
    blocked,
    complete,
    overdue,
    welcome_packs_pending_send,
    portal_invites_pending_send,
    customers_missing_info,
    recommended_action,
  };
}