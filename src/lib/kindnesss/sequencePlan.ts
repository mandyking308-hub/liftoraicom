// Kindnesss outreach sequence rules. Step count comes from the day plan, never a literal.
export const KINDNESSS_STEP_DAYS = [0, 7, 14, 21, 28] as const;
export const KINDNESSS_DRAFT_ID = '71719d7d-bd95-42e1-b73e-dfb6d890d0d6';

export type SequenceStep = { step: number; subject: string; body: string; wait_days?: number; key?: string };

/** Delay before each step relative to the previous one (what Smartlead's delay_in_days expects). */
export function stepDelays(days: readonly number[] = KINDNESSS_STEP_DAYS): number[] {
  return days.map((d, i) => (i === 0 ? 0 : d - days[i - 1]));
}

const CLOSING = /\b(one last|final (note|email|thought)|last (email|note)|won'?t keep following up|my final)\b/i;

export function validateSequence(steps: readonly SequenceStep[], days: readonly number[] = KINDNESSS_STEP_DAYS) {
  const problems: string[] = [];
  if (steps.length !== days.length) problems.push(`expected_${days.length}_steps_got_${steps.length}`);
  const delays = stepDelays(days);
  steps.forEach((s, i) => {
    const n = i + 1;
    if (s.step !== n) problems.push(`step_order_invalid_at_${n}`);
    if (!s.body.includes('%signature%')) problems.push(`step_${n}_missing_signature`);
    if (!s.body.includes('%unsubscribe-text%')) problems.push(`step_${n}_missing_unsubscribe`);
    if (i === 0 && !s.subject.trim()) problems.push('step_1_missing_subject');
    if (i > 0 && s.subject.trim()) problems.push(`step_${n}_subject_not_blank`);
    if (s.wait_days !== undefined && s.wait_days !== delays[i]) problems.push(`step_${n}_delay_${s.wait_days}_expected_${delays[i]}`);
    if (i < steps.length - 1 && CLOSING.test(s.body)) problems.push(`step_${n}_has_closing_language`);
  });
  if (steps.length && !CLOSING.test(steps[steps.length - 1].body)) problems.push('final_step_not_a_clear_close');
  if (new Set(steps.map(s => s.body)).size !== steps.length) problems.push('duplicate_step_copy');
  return { ok: problems.length === 0, problems };
}
