export type ActivityAssumptions = {
  assumed_lead_to_call_rate: number;
  assumed_call_to_proposal_rate: number;
  assumed_proposal_to_close_rate: number;
  assumed_average_order_value: number;
};

export type RequiredActivity = {
  required_closes: number;
  required_proposals: number;
  required_conversations: number;
  required_calls: number;
  required_leads: number;
  required_followups: number;
  required_upgrades: number;
  daily_calls: number;
  daily_proposals: number;
  daily_closes: number;
  weekly_calls: number;
  weekly_proposals: number;
  weekly_closes: number;
  days_in_period: number;
};

export function reverseEngineerActivity(
  target_revenue_amount: number,
  a: ActivityAssumptions,
  start: string | Date,
  end: string | Date,
): RequiredActivity {
  const aov = Math.max(1, a.assumed_average_order_value || 1);
  const closeR = Math.max(0.01, Math.min(1, a.assumed_proposal_to_close_rate || 0.2));
  const propR = Math.max(0.01, Math.min(1, a.assumed_call_to_proposal_rate || 0.4));
  const leadR = Math.max(0.01, Math.min(1, a.assumed_lead_to_call_rate || 0.3));

  const required_closes = Math.ceil((target_revenue_amount || 0) / aov);
  const required_proposals = Math.ceil(required_closes / closeR);
  const required_calls = Math.ceil(required_proposals / propR);
  const required_conversations = required_calls;
  const required_leads = Math.ceil(required_calls / leadR);
  const required_followups = Math.ceil(required_calls * 1.5);
  const required_upgrades = Math.ceil(required_closes * 0.2);

  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const days = Math.max(1, Math.round((e - s) / 86400000) + 1);
  const weeks = Math.max(1, days / 7);

  return {
    required_closes, required_proposals, required_conversations, required_calls,
    required_leads, required_followups, required_upgrades,
    daily_calls: Math.ceil(required_calls / days),
    daily_proposals: Math.ceil(required_proposals / days),
    daily_closes: Math.max(0, +(required_closes / days).toFixed(2)),
    weekly_calls: Math.ceil(required_calls / weeks),
    weekly_proposals: Math.ceil(required_proposals / weeks),
    weekly_closes: Math.max(0, +(required_closes / weeks).toFixed(2)),
    days_in_period: days,
  };
}

export function gapStatus(actual: number, target: number, pctElapsed: number): {
  status: "on_track" | "watch" | "behind" | "critical" | "exceeded";
  gap_amount: number;
  gap_percent: number;
  pace_index: number;
} {
  const gap_amount = target - actual;
  const gap_percent = target > 0 ? +((gap_amount / target) * 100).toFixed(1) : 0;
  const expected = target * Math.min(1, Math.max(0, pctElapsed));
  const pace_index = expected > 0 ? +(actual / expected).toFixed(2) : 1;
  let status: "on_track" | "watch" | "behind" | "critical" | "exceeded" = "on_track";
  if (actual >= target) status = "exceeded";
  else if (pace_index >= 0.95) status = "on_track";
  else if (pace_index >= 0.8) status = "watch";
  else if (pace_index >= 0.6) status = "behind";
  else status = "critical";
  return { status, gap_amount, gap_percent, pace_index };
}

export function recommendedAction(status: string, required_today: number, daysLeft: number): string {
  if (status === "exceeded") return "Target hit — protect margin, prioritise upgrades and renewals.";
  if (status === "on_track") return `Maintain pace. Aim for ${required_today} qualified conversations today.`;
  if (status === "watch") return `Slight slip. Run ${required_today} extra conversations today and clear all hot follow-ups.`;
  if (status === "behind") return `Behind pace. Prioritise hot signals, run ${required_today}+ calls today, ship overdue proposals.`;
  return `Critical. ${daysLeft} day(s) left. Escalate to human handoff, push ready-to-buy contacts, request founder approval to send pre-approved close packs.`;
}

export function daysBetween(start: string | Date, end: string | Date) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

export function pctElapsed(start: string | Date, end: string | Date, at: Date = new Date()) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = at.getTime();
  if (n <= s) return 0;
  if (n >= e) return 1;
  return (n - s) / (e - s);
}