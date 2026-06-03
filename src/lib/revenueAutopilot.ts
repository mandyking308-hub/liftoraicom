import { supabase } from "@/integrations/supabase/client";

export type RevenueLoopSnapshot = {
  revenue_target: number;
  actual_revenue: number;
  pipeline_estimated: number;
  gap: number;
  overdue_follow_ups: number;
  hot_leads: number;
  upgrade_opportunities: number;
  proposals_needed: number;
  calls_to_prepare: number;
  approvals_blocking: number;
  open_tasks: number;
  critical_tasks: number;
  top_actions: { title: string; agent: string; priority: string; reason: string }[];
  recommended_action: string;
};

// Compute the daily revenue loop snapshot from live tables.
export async function computeRevenueLoop(): Promise<RevenueLoopSnapshot> {
  const sb: any = supabase as any;
  const head = { count: "exact" as const, head: true };
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const now = new Date().toISOString();

  const safe = (p: any) => Promise.resolve(p).then(r => r, () => ({ count: 0, data: [] }));

  const [
    targets, completedClose, pipelineClose, overdueFU, hotSignals, upgradeOpps,
    closeApprovals, openTasks, criticalTasks, lostReviews,
  ] = await Promise.all([
    safe(sb.from("sales_revenue_targets").select("target_revenue_amount,active").eq("active", true)),
    safe(sb.from("customer_sales_close_actions").select("confirmed_revenue_value,amount").eq("action_status", "completed").gte("created_at", since30)),
    safe(sb.from("customer_sales_close_actions").select("estimated_pipeline_value,amount,confidence").eq("action_status", "approval_required")),
    safe(sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "follow_up_needed").lt("next_action_at", now)),
    safe(sb.from("customer_sales_conversations").select("id", head).gte("close_probability", 0.7)),
    safe(sb.from("customer_upgrade_opportunities").select("id", head).in("status", ["new", "watch"])),
    safe(sb.from("customer_sales_close_actions").select("id", head).eq("action_status", "approval_required")),
    safe(sb.from("revenue_autopilot_tasks").select("id", head).eq("status", "open")),
    safe(sb.from("revenue_autopilot_tasks").select("id", head).eq("status", "open").eq("priority", "critical")),
    safe(sb.from("sales_win_loss_reviews").select("id", head).eq("outcome", "lost").gte("created_at", since30)),
  ]);

  const revenue_target = (targets.data || []).reduce((s: number, t: any) => s + Number(t.target_revenue_amount || 0), 0);
  const actual_revenue = (completedClose.data || []).reduce(
    (s: number, r: any) => s + Number(r.confirmed_revenue_value ?? r.amount ?? 0), 0
  );
  const pipeline_estimated = (pipelineClose.data || []).reduce(
    (s: number, r: any) => s + Number(r.estimated_pipeline_value ?? r.amount ?? 0) * Number(r.confidence ?? 0.5), 0
  );
  const gap = Math.max(0, revenue_target - actual_revenue);

  const hot_leads = hotSignals.count ?? 0;
  const overdue_follow_ups = overdueFU.count ?? 0;
  const upgrade_opportunities = upgradeOpps.count ?? 0;
  const approvals_blocking = closeApprovals.count ?? 0;
  const open_tasks = openTasks.count ?? 0;
  const critical_tasks = criticalTasks.count ?? 0;
  const proposals_needed = Math.max(0, hot_leads - approvals_blocking);
  const calls_to_prepare = Math.max(0, overdue_follow_ups + hot_leads);

  // Top 5 recommended actions
  const top_actions: RevenueLoopSnapshot["top_actions"] = [];
  if (approvals_blocking > 0) top_actions.push({ title: `Approve ${approvals_blocking} close action(s)`, agent: "Sales Manager Agent", priority: "critical", reason: "blocking revenue" });
  if (hot_leads > 0) top_actions.push({ title: `Engage ${hot_leads} hot lead(s)`, agent: "Voice Sales Agent", priority: "high", reason: ">=70% close probability" });
  if (overdue_follow_ups > 0) top_actions.push({ title: `Resolve ${overdue_follow_ups} overdue follow-up(s)`, agent: "Follow-Up Agent", priority: "high", reason: "next_action_at past due" });
  if (upgrade_opportunities > 0) top_actions.push({ title: `Review ${upgrade_opportunities} upgrade opportunity(ies)`, agent: "Upgrade Agent", priority: "medium", reason: "expansion revenue" });
  if (revenue_target === 0) top_actions.push({ title: "Set a monthly revenue target", agent: "Revenue Manager Agent", priority: "high", reason: "no active target" });
  if ((lostReviews.count ?? 0) > 0) top_actions.push({ title: `Review ${lostReviews.count} lost deal(s)`, agent: "Coaching Agent", priority: "medium", reason: "improve conversion" });

  let recommended_action = "All targets healthy — keep current pace.";
  if (revenue_target === 0) recommended_action = "Set a monthly revenue target so Liftor can reverse-engineer activity.";
  else if (approvals_blocking > 0) recommended_action = `Clear ${approvals_blocking} close approval(s) — revenue is locked behind founder sign-off.`;
  else if (gap > 0 && hot_leads > 0) recommended_action = `Push hot leads now: gap ${Math.round(gap).toLocaleString()} ${"USD"}, ${hot_leads} ready-to-buy contacts.`;
  else if (overdue_follow_ups > 0) recommended_action = `Resolve overdue follow-ups before drafting new outreach.`;

  return {
    revenue_target, actual_revenue, pipeline_estimated, gap,
    overdue_follow_ups, hot_leads, upgrade_opportunities,
    proposals_needed, calls_to_prepare, approvals_blocking,
    open_tasks, critical_tasks,
    top_actions: top_actions.slice(0, 5),
    recommended_action,
  };
}