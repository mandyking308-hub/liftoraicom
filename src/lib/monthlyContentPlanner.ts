import { supabase } from "@/integrations/supabase/client";

/**
 * Deterministic local generator. No external AI calls in this build.
 * Produces a 4-week skeleton: 3 items/week across rotating channels.
 * All items default to status='draft' and external_publish_blocked=true.
 */
export async function generateMonthlyPlan(opts: {
  businessId: string | null;
  monthStart: Date;
  operatorId?: string | null;
  oversightReviewerId?: string | null;
  summary?: string;
}) {
  const monthIso = opts.monthStart.toISOString().slice(0, 10);
  const { data: plan, error } = await (supabase as any)
    .from("monthly_business_content_plans")
    .insert({
      business_id: opts.businessId,
      month_start: monthIso,
      status: "draft",
      plan_summary: opts.summary ?? "Skeleton monthly content plan (founder approval required before scheduling).",
      created_by_ai: true,
      operator_id: opts.operatorId ?? null,
      oversight_reviewer_id: opts.oversightReviewerId ?? null,
    })
    .select()
    .single();
  if (error || !plan) return { plan: null, items: [], error };

  const channels: Array<{ ch: string; type: string }> = [
    { ch: "instagram", type: "reel" },
    { ch: "linkedin", type: "post" },
    { ch: "email", type: "email" },
    { ch: "blog", type: "article" },
    { ch: "instagram", type: "carousel" },
    { ch: "facebook", type: "post" },
  ];
  const items: any[] = [];
  for (let week = 0; week < 4; week++) {
    for (let i = 0; i < 3; i++) {
      const idx = (week * 3 + i) % channels.length;
      const date = new Date(opts.monthStart);
      date.setDate(date.getDate() + week * 7 + i * 2);
      items.push({
        plan_id: plan.id,
        business_id: opts.businessId,
        content_date: date.toISOString().slice(0, 10),
        channel: channels[idx].ch,
        content_type: channels[idx].type,
        title: `Week ${week + 1} · ${channels[idx].ch} ${channels[idx].type}`,
        hook: null,
        caption: null,
        cta: null,
        asset_notes: "Operator to prepare assets and draft caption. External publishing remains blocked.",
        status: "draft",
        external_publish_blocked: true,
      });
    }
  }
  const { data: inserted } = await (supabase as any).from("monthly_content_items").insert(items).select();

  // Generate operator + oversight tasks (no external send/publish).
  if (opts.operatorId) {
    await (supabase as any).from("worker_tasks").insert({
      business_id: opts.businessId,
      assigned_to: opts.operatorId,
      task_type: "monthly_content_prep",
      title: `Prepare monthly content — month starting ${monthIso}`,
      description: "Prepare assets, drafts and scheduling notes for the generated content plan. Do not publish.",
      requires_founder_approval: true,
      external_action_blocked: true,
    });
  }
  if (opts.oversightReviewerId) {
    await (supabase as any).from("worker_tasks").insert({
      business_id: opts.businessId,
      assigned_to: opts.oversightReviewerId,
      task_type: "monthly_content_oversight",
      title: `Oversight review — content plan ${monthIso}`,
      description: "Review operator preparation for compliance and quality before founder approval.",
      requires_founder_approval: true,
      external_action_blocked: true,
    });
  }

  return { plan, items: inserted ?? [], error: null };
}

export async function approveMonthlyPlan(planId: string, founderUserId: string) {
  await (supabase as any)
    .from("monthly_business_content_plans")
    .update({ status: "founder_approved", founder_approved_by: founderUserId, founder_approved_at: new Date().toISOString() })
    .eq("id", planId);
}