import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/humanWorkforce";

export type CampaignPlanStatus =
  | "draft" | "generated" | "operator_prepared" | "oversight_reviewed"
  | "founder_approved" | "scheduled" | "active" | "completed" | "parked";

export interface BusinessSeed {
  business_id?: string | null;
  business_name: string;
  target_customer?: string | null;
  offer?: string | null;
  channels?: string[];
  campaign_theme?: string | null;
}

export interface MonthlyBatchInput {
  monthStart: string; // YYYY-MM-01
  businesses: BusinessSeed[];
  createdByUserId?: string | null;
}

export function buildBatchName(monthStart: string): string {
  const d = new Date(monthStart + "T00:00:00Z");
  const m = d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return `${m} ${d.getUTCFullYear()} Campaign Batch`;
}

export function buildDefaultChannels(seed: BusinessSeed): string[] {
  if (seed.channels && seed.channels.length) return seed.channels;
  return ["instagram", "linkedin", "email"];
}

export function buildSocialContentSkeleton(platform: string, monthStart: string) {
  const start = new Date(monthStart + "T00:00:00Z");
  const items = [] as Array<{ day: number; date: string; topic: string; status: "draft" }>;
  for (let i = 0; i < 30; i += 3) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    items.push({
      day: i + 1,
      date: d.toISOString().slice(0, 10),
      topic: `${platform} content idea ${Math.floor(i / 3) + 1}`,
      status: "draft",
    });
  }
  return items;
}

export function buildOutreachSequenceSkeleton(): Array<{ step: number; day: number; subject: string; body: string }> {
  return [
    { step: 1, day: 0, subject: "{{first_name}}, quick question about {{company}}", body: "Draft email step 1 - personalise before sending." },
    { step: 2, day: 3, subject: "Re: quick question", body: "Draft email step 2 - follow up." },
    { step: 3, day: 7, subject: "Worth a 10-min chat?", body: "Draft email step 3 - soft CTA." },
    { step: 4, day: 12, subject: "Closing the loop", body: "Draft email step 4 - final touch." },
  ];
}

export async function generateMonthlyBatch(input: MonthlyBatchInput) {
  const { monthStart, businesses, createdByUserId } = input;
  const { data: batch, error: be } = await (supabase as any).from("campaign_factory_batches").insert({
    batch_month: monthStart,
    batch_name: buildBatchName(monthStart),
    status: "generated",
    total_businesses: businesses.length,
    total_campaigns: businesses.length,
    total_content_items: 0,
    generated_by_ai: true,
  }).select("*").single();
  if (be) throw be;

  let totalContent = 0;
  for (const b of businesses) {
    const channels = buildDefaultChannels(b);
    const { data: plan, error: pe } = await (supabase as any).from("business_campaign_plans").insert({
      batch_id: batch.id,
      business_id: b.business_id ?? null,
      business_name: b.business_name,
      month_start: monthStart,
      campaign_theme: b.campaign_theme ?? null,
      target_customer: b.target_customer ?? null,
      offer: b.offer ?? null,
      campaign_goal: "Awareness and qualified inbound",
      channels,
      status: "generated",
    }).select("*").single();
    if (pe) throw pe;

    for (const platform of channels.filter((c) => c !== "email")) {
      const items = buildSocialContentSkeleton(platform, monthStart);
      totalContent += items.length;
      await (supabase as any).from("social_campaign_drafts").insert({
        business_campaign_plan_id: plan.id,
        business_id: b.business_id ?? null,
        platform,
        content_items: items,
        external_publish_blocked: true,
        status: "draft",
      });
    }

    await (supabase as any).from("outreach_campaign_drafts").insert({
      business_campaign_plan_id: plan.id,
      business_id: b.business_id ?? null,
      campaign_name: `${b.business_name} - ${monthStart} outreach`,
      lead_criteria: { industry: null, geo: null, seniority: null, headcount: null },
      email_sequence: buildOutreachSequenceSkeleton(),
      external_send_blocked: true,
      compliance_checked: false,
      unsubscribe_required: true,
      status: "draft",
    });

    await (supabase as any).from("campaign_approval_packs").insert({
      business_campaign_plan_id: plan.id,
      business_id: b.business_id ?? null,
      approval_pack_title: `${b.business_name} - ${monthStart} approval pack`,
      approval_pack_summary: "Auto-generated draft awaiting operator preparation and oversight review.",
      included_items: { social: true, outreach: true, compliance: true },
      risks: [],
      decisions_required: ["Approve social schedule", "Approve outreach send", "Confirm compliance"],
      status: "waiting_founder",
    });
  }

  await (supabase as any).from("campaign_factory_batches").update({
    total_content_items: totalContent,
  }).eq("id", batch.id);

  if (createdByUserId) {
    try { await logAuditEvent({ workerId: null, eventType: "campaign_batch_generated", reason: `batch ${batch.id}` }); } catch {}
  }
  return batch;
}

export async function approvePack(packId: string, decision: "approved" | "changes_requested" | "rejected", notes?: string) {
  const { data: pack, error } = await (supabase as any).from("campaign_approval_packs").update({
    status: decision === "approved" ? "approved" : decision,
    founder_decision: decision,
    founder_notes: notes ?? null,
    founder_decided_at: new Date().toISOString(),
  }).eq("id", packId).select("*").single();
  if (error) throw error;
  if (decision === "approved" && pack?.business_campaign_plan_id) {
    await (supabase as any).from("business_campaign_plans").update({
      status: "founder_approved",
    }).eq("id", pack.business_campaign_plan_id);
  }
  try { await logAuditEvent({ workerId: null, eventType: `campaign_pack_${decision}`, relatedTaskId: packId }); } catch {}
  return pack;
}

export async function parkPlan(planId: string) {
  await (supabase as any).from("business_campaign_plans").update({ status: "parked" }).eq("id", planId);
  try { await logAuditEvent({ workerId: null, eventType: "campaign_plan_parked", relatedTaskId: planId }); } catch {}
}

export async function blockAllExternalActions(planId: string) {
  await (supabase as any).from("outreach_campaign_drafts").update({ external_send_blocked: true }).eq("business_campaign_plan_id", planId);
  await (supabase as any).from("social_campaign_drafts").update({ external_publish_blocked: true }).eq("business_campaign_plan_id", planId);
  try { await logAuditEvent({ workerId: null, eventType: "campaign_external_blocked", relatedTaskId: planId }); } catch {}
}

export async function assignPlanRoles(planId: string, operatorId: string | null, oversightId: string | null) {
  await (supabase as any).from("business_campaign_plans").update({
    assigned_operator_id: operatorId,
    assigned_oversight_id: oversightId,
  }).eq("id", planId);
}

export const AUTOMATION_AREAS = [
  "social", "outreach", "inbox", "crm", "proposal", "finance", "compliance", "reporting", "onboarding",
] as const;

export type AutomationArea = (typeof AUTOMATION_AREAS)[number];

export interface RunbookInput {
  runbook_name: string;
  automation_area: AutomationArea;
  trigger_type: "daily" | "weekly" | "monthly" | "manual" | "event_based";
  trigger_description?: string;
  operator_role_required?: string | null;
  oversight_required?: boolean;
  external_action_allowed?: boolean;
  failure_modes?: string | null;
  escalation_rules?: string | null;
  status?: "draft" | "active" | "paused" | "retired";
}

export async function createRunbook(r: RunbookInput) {
  const { data, error } = await (supabase as any).from("automation_runbooks").insert({
    runbook_name: r.runbook_name,
    automation_area: r.automation_area,
    trigger_type: r.trigger_type,
    trigger_description: r.trigger_description ?? null,
    operator_role_required: r.operator_role_required ?? null,
    oversight_required: r.oversight_required ?? true,
    external_action_allowed: r.external_action_allowed ?? false,
    failure_modes: r.failure_modes ?? null,
    escalation_rules: r.escalation_rules ?? null,
    status: r.status ?? "draft",
    approval_required: true,
  }).select("*").single();
  if (error) throw error;
  return data;
}